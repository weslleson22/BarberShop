import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  exportUserData,
  createDataSubjectRequest,
  anonymizeUserAccount,
} from '@/lib/privacy/lgpd-service'

vi.mock('@/lib/prisma', () => {
  return {
    prisma: {
      user: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      client: {
        findFirst: vi.fn(),
        update: vi.fn(),
      },
      appointment: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
      },
      payment: {
        findMany: vi.fn(),
      },
      notification: {
        findMany: vi.fn(),
      },
      privacyRequest: {
        create: vi.fn(),
        updateMany: vi.fn(),
        findMany: vi.fn(),
      },
      $transaction: vi.fn(async (cb) => {
        const { prisma } = await import('@/lib/prisma')
        return cb(prisma)
      }),
    },
  }
})

import { prisma } from '@/lib/prisma'

describe('Privacidade, Proteção de Dados e Conformidade LGPD (Privacy by Design)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('1. Exportação de Dados do Titular (Portabilidade - Art. 18, II e V da LGPD)', () => {
    it('exporta dados pessoais estruturados e NUNCA expõe a senha ou hash bcrypt', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: 'usr_titular_1',
        name: 'Carlos Oliveira',
        email: 'carlos@exemplo.com.br',
        role: 'CLIENT',
        phone: '11988887777',
        address: 'Rua das Flores, 123',
        birthDate: new Date('1990-05-15'),
        bio: 'Cliente assíduo',
        specialties: [],
        createdAt: new Date('2026-01-10T10:00:00Z'),
        updatedAt: new Date('2026-02-10T12:00:00Z'),
      } as any)

      vi.mocked(prisma.client.findFirst).mockResolvedValueOnce({
        id: 'cli_1',
        name: 'Carlos Oliveira',
        email: 'carlos@exemplo.com.br',
        phone: '11988887777',
        isVip: true,
        createdAt: new Date('2026-01-10T10:00:00Z'),
      } as any)

      vi.mocked(prisma.appointment.findMany).mockResolvedValueOnce([
        {
          id: 'apt_1',
          startTime: new Date('2026-03-01T14:00:00Z'),
          endTime: new Date('2026-03-01T14:30:00Z'),
          status: 'COMPLETED',
          notes: 'Corte degradê',
          service: { name: 'Corte Cabelo', price: 45.0 },
          barber: { name: 'João Barbeiro' },
        },
      ] as any)

      vi.mocked(prisma.payment.findMany).mockResolvedValueOnce([
        {
          id: 'pay_1',
          amount: 45.0,
          status: 'COMPLETED',
          method: 'PIX',
          createdAt: new Date('2026-03-01T14:35:00Z'),
        },
      ] as any)

      vi.mocked(prisma.notification.findMany).mockResolvedValueOnce([
        {
          id: 'notif_1',
          title: 'Agendamento Confirmado',
          message: 'Seu horário está confirmado',
          read: true,
          createdAt: new Date('2026-03-01T10:00:00Z'),
        },
      ] as any)

      const result = await exportUserData('usr_titular_1')

      expect(result.exportMetadata.protocol).toContain('DSR-')
      expect(result.user.name).toBe('Carlos Oliveira')
      expect(result.user.email).toBe('carlos@exemplo.com.br')
      expect(result.clientProfile?.isVip).toBe(true)
      expect(result.appointments).toHaveLength(1)
      expect(result.payments).toHaveLength(1)
      expect(result.notifications).toHaveLength(1)

      // Garantia de segurança contra vazamento
      const serialized = JSON.stringify(result)
      expect(serialized).not.toContain('password')
      expect(serialized).not.toContain('$2a$')
    })

    it('rejeita exportação se o usuário não for encontrado', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null)

      await expect(exportUserData('usr_inexistente')).rejects.toThrow(
        'Usuário não encontrado para exportação.'
      )
    })
  })

  describe('2. Registro de Solicitação de Direitos do Titular (DSR - Data Subject Request)', () => {
    it('cria solicitação de privacidade válida com status PENDING', async () => {
      vi.mocked((prisma as any).privacyRequest.create).mockResolvedValueOnce({
        id: 'dsr_req_123',
        type: 'DELETION',
        status: 'PENDING',
        applicantEmail: 'carlos@exemplo.com.br',
        applicantName: 'Carlos Oliveira',
        createdAt: new Date(),
      })

      const req = await createDataSubjectRequest({
        userId: 'usr_1',
        barbershopId: 'shop_1',
        type: 'DELETION',
        applicantEmail: 'carlos@exemplo.com.br',
        applicantName: 'Carlos Oliveira',
        details: 'Desejo encerrar minha conta e apagar meus dados.',
      })

      expect(req.id).toBe('dsr_req_123')
      expect(req.status).toBe('PENDING')
      expect((prisma as any).privacyRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'DELETION',
            status: 'PENDING',
            applicantEmail: 'carlos@exemplo.com.br',
          }),
        })
      )
    })

    it('rejeita solicitação com e-mail inválido', async () => {
      await expect(
        createDataSubjectRequest({
          type: 'ANONYMIZATION',
          applicantEmail: 'email-invalido',
          applicantName: 'Carlos',
        })
      ).rejects.toThrow('E-mail do titular inválido.')
    })

    it('rejeita solicitação com nome ausente ou muito curto', async () => {
      await expect(
        createDataSubjectRequest({
          type: 'ANONYMIZATION',
          applicantEmail: 'carlos@exemplo.com',
          applicantName: 'C',
        })
      ).rejects.toThrow('Nome do solicitante é obrigatório.')
    })
  })

  describe('3. Anonimização e Exclusão Segura (Art. 16 e 18 da LGPD)', () => {
    it('bloqueia anonimização se houver agendamentos futuros pendentes', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: 'usr_1',
        client: { id: 'cli_1' },
      } as any)

      vi.mocked(prisma.appointment.findFirst).mockResolvedValueOnce({
        id: 'apt_futuro_1',
        status: 'CONFIRMED',
        startTime: new Date(Date.now() + 86400000), // amanhã
      } as any)

      await expect(anonymizeUserAccount('usr_1')).rejects.toThrow(
        'existem agendamentos ativos futuros'
      )
    })

    it('executa anonimização irreversível quando não há impedimentos legais', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: 'usr_123456',
        client: { id: 'cli_1' },
      } as any)

      vi.mocked(prisma.appointment.findFirst).mockResolvedValueOnce(null) // sem agendamento futuro

      const res = await anonymizeUserAccount('usr_123456', 'admin_dpo')

      expect(res.success).toBe(true)
      expect(res.anonymizedId).toBe('123456')

      // Garante descaracterização cadastral
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'usr_123456' },
          data: expect.objectContaining({
            name: expect.stringContaining('Usuário Anonimizado [LGPD-'),
            email: expect.stringContaining('@lgpd.invalid'),
            phone: null,
            address: null,
            birthDate: null,
            isActive: false,
          }),
        })
      )

      // Garante anonimização do cliente vinculado
      expect(prisma.client.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'cli_1' },
          data: expect.objectContaining({
            name: expect.stringContaining('Cliente Anonimizado [LGPD-'),
            email: null,
            phone: '00000000000',
          }),
        })
      )

      // Garante atualização dos pedidos de privacidade para COMPLETED
      expect((prisma as any).privacyRequest.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'usr_123456' }),
          data: expect.objectContaining({
            status: 'COMPLETED',
            processedById: 'admin_dpo',
          }),
        })
      )
    })
  })
})
