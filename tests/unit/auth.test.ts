import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock do Prisma: um teste unitário de login não deve depender de banco real.
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}))

import { prisma } from '@/lib/prisma'
import {
  authenticateUser,
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
} from '@/lib/auth'

const findUniqueMock = prisma.user.findUnique as unknown as ReturnType<typeof vi.fn>

function buildDbUser(overrides: Record<string, any> = {}) {
  return {
    id: 'user_1',
    name: 'Barbeiro Teste',
    email: 'barbeiro@teste.com',
    password: '', // preenchido nos testes com um hash real
    role: 'BARBER' as const,
    barbershopId: 'barbershop_1',
    isActive: true,
    avatar: null,
    barbershop: { id: 'barbershop_1', name: 'Barbearia Central' },
    ...overrides,
  }
}

describe('hashPassword / verifyPassword', () => {
  it('gera um hash verificável para a senha correta', async () => {
    const hash = await hashPassword('minhaSenha123')
    await expect(verifyPassword('minhaSenha123', hash)).resolves.toBe(true)
  })

  it('rejeita uma senha incorreta', async () => {
    const hash = await hashPassword('minhaSenha123')
    await expect(verifyPassword('senhaErrada', hash)).resolves.toBe(false)
  })
})

describe('generateToken / verifyToken', () => {
  it('gera um token cujo payload decodificado bate com os dados do usuário', () => {
    const payload = {
      id: 'user_1',
      name: 'Barbeiro Teste',
      email: 'barbeiro@teste.com',
      role: 'BARBER' as const,
      barbershopId: 'barbershop_1',
    }

    const token = generateToken(payload)
    const decoded = verifyToken(token)

    expect(decoded).toMatchObject(payload)
  })

  it('rejeita um token inválido', () => {
    expect(() => verifyToken('token-invalido')).toThrow()
  })
})

describe('authenticateUser (login)', () => {
  beforeEach(() => {
    findUniqueMock.mockReset()
  })

  it('autentica com sucesso quando email e senha conferem', async () => {
    const hash = await hashPassword('senhaCorreta123')
    findUniqueMock.mockResolvedValue(buildDbUser({ password: hash }))

    const result = await authenticateUser('barbeiro@teste.com', 'senhaCorreta123')

    expect(findUniqueMock).toHaveBeenCalledWith(
      expect.objectContaining({ where: { email: 'barbeiro@teste.com' } })
    )
    expect(result).not.toBeNull()
    expect(result?.user.email).toBe('barbeiro@teste.com')
    expect(result?.user).not.toHaveProperty('password')

    const decoded = verifyToken(result!.token)
    expect(decoded.email).toBe('barbeiro@teste.com')
  })

  it('rejeita quando a senha está incorreta', async () => {
    const hash = await hashPassword('senhaCorreta123')
    findUniqueMock.mockResolvedValue(buildDbUser({ password: hash }))

    const result = await authenticateUser('barbeiro@teste.com', 'senhaErrada')

    expect(result).toBeNull()
  })

  it('rejeita quando o usuário não existe', async () => {
    findUniqueMock.mockResolvedValue(null)

    const result = await authenticateUser('naoexiste@teste.com', 'qualquerSenha')

    expect(result).toBeNull()
  })

  it('rejeita quando o usuário está inativo', async () => {
    const hash = await hashPassword('senhaCorreta123')
    findUniqueMock.mockResolvedValue(buildDbUser({ password: hash, isActive: false }))

    const result = await authenticateUser('barbeiro@teste.com', 'senhaCorreta123')

    expect(result).toBeNull()
  })
})
