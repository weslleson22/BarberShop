import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16

/**
 * Criptografa buffer usando AES-256-GCM com chave derivada via SHA-256.
 */
export function encryptData(buffer: Buffer, passphrase?: string): Buffer {
  const secret = passphrase || process.env.BACKUP_ENCRYPTION_KEY || 'default-dr-encryption-key-for-local-development'
  const key = crypto.createHash('sha256').update(secret).digest()
  const iv = crypto.randomBytes(IV_LENGTH)

  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()])
  const authTag = cipher.getAuthTag()

  // Formato: [IV (16 bytes)][AuthTag (16 bytes)][Dados Criptografados]
  return Buffer.concat([iv, authTag, encrypted])
}

/**
 * Decripta buffer cifrado com AES-256-GCM.
 */
export function decryptData(encryptedBuffer: Buffer, passphrase?: string): Buffer {
  const secret = passphrase || process.env.BACKUP_ENCRYPTION_KEY || 'default-dr-encryption-key-for-local-development'
  const key = crypto.createHash('sha256').update(secret).digest()

  if (encryptedBuffer.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error('Buffer criptografado inválido ou corrompido (tamanho insuficiente).')
  }

  const iv = encryptedBuffer.subarray(0, IV_LENGTH)
  const authTag = encryptedBuffer.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH)
  const ciphertext = encryptedBuffer.subarray(IV_LENGTH + AUTH_TAG_LENGTH)

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  return Buffer.concat([decipher.update(ciphertext), decipher.final()])
}

/**
 * Calcula hash SHA-256 para verificação estrita de integridade contra corrupção.
 */
export function calculateChecksum(buffer: Buffer | string): string {
  return crypto.createHash('sha256').update(buffer).digest('hex')
}
