import { describe, it, expect } from 'vitest'
import {
  encryptData,
  decryptData,
  calculateChecksum,
} from '@/scripts/dr/crypto'
import { BackupManifest } from '@/scripts/dr/types'

describe('Disaster Recovery: Criptografia, Integridade e Verificação de Checksum', () => {
  it('criptografa e decripta buffers com AES-256-GCM preservando a integridade', () => {
    const originalText = JSON.stringify({
      tenantId: 'barbershop_alpha',
      name: 'Barbearia Vintage Alfa',
      revenue: 15420.50,
      active: true,
    })

    const originalBuffer = Buffer.from(originalText, 'utf-8')
    const secret = 'super-secret-dr-passphrase-2026'

    const encrypted = encryptData(originalBuffer, secret)
    expect(encrypted).not.toEqual(originalBuffer)
    expect(encrypted.length).toBeGreaterThan(originalBuffer.length) // IV (16) + Tag (16) + Data

    const decrypted = decryptData(encrypted, secret)
    expect(decrypted.toString('utf-8')).toBe(originalText)
  })

  it('rejeita decriptação com chave incorreta (Authentication Tag Mismatch)', () => {
    const originalBuffer = Buffer.from('dados-sensiveis-financeiros', 'utf-8')
    const encrypted = encryptData(originalBuffer, 'chave-correta-123')

    expect(() => {
      decryptData(encrypted, 'chave-errada-999')
    }).toThrow()
  })

  it('calcula checksum SHA-256 idêntico para o mesmo conteúdo', () => {
    const payload = JSON.stringify({ shop: 'central', clients: 50 })
    const hash1 = calculateChecksum(payload)
    const hash2 = calculateChecksum(payload)

    expect(hash1).toBe(hash2)
    expect(hash1).toHaveLength(64) // 256 bits em hex
  })

  it('detecta adulteração ou corrupção de dados através da divergência de checksum', () => {
    const originalPayload = JSON.stringify({ shop: 'central', clients: 50 })
    const tamperedPayload = JSON.stringify({ shop: 'central', clients: 51 }) // 1 cliente a mais

    const originalChecksum = calculateChecksum(originalPayload)
    const tamperedChecksum = calculateChecksum(tamperedPayload)

    expect(originalChecksum).not.toBe(tamperedChecksum)
  })

  it('valida estrutura do manifesto de backup', () => {
    const manifest: BackupManifest = {
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      sourceDatabase: 'postgres',
      postgresVersion: 'PostgreSQL 17.2',
      checksum: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      isEncrypted: true,
      tables: {
        barbershops: 5,
        users: 25,
        clients: 14,
        appointments: 51,
      },
      migrations: [
        { id: 'mig_1', migration_name: '20260421170500_init', finished_at: '2026-04-21T17:05:02.221Z' },
      ],
    }

    expect(manifest.version).toBe('1.0.0')
    expect(manifest.tables.barbershops).toBe(5)
    expect(manifest.isEncrypted).toBe(true)
    expect(manifest.migrations.length).toBe(1)
  })
})
