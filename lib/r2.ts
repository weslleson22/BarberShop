import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3'

/**
 * Retorna uma instância configurada do S3Client apontando para o Cloudflare R2.
 */
export function getR2Client(): S3Client {
  const endpoint = process.env.CLOUDFLARE_R2_ENDPOINT
  const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY

  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'Configurações do Cloudflare R2 ausentes. Verifique CLOUDFLARE_R2_ENDPOINT, CLOUDFLARE_R2_ACCESS_KEY_ID e CLOUDFLARE_R2_SECRET_ACCESS_KEY no .env'
    )
  }

  // Sanitiza endpoint caso contenha colchetes ou markdown links acidentais
  const cleanEndpoint = endpoint
    .replace(/[\[\]]/g, '')
    .split('(')
    .pop()
    ?.replace(')', '')
    ?.trim() || endpoint.trim()

  return new S3Client({
    region: 'auto',
    endpoint: cleanEndpoint,
    credentials: {
      accessKeyId: accessKeyId.trim(),
      secretAccessKey: secretAccessKey.trim(),
    },
  })
}

export function getR2BucketName(): string {
  return process.env.CLOUDFLARE_R2_BUCKET_NAME || 'barbershop-backups-prod'
}

export interface UploadBackupInput {
  key: string
  buffer: Buffer
  contentType?: string
  metadata?: Record<string, string>
}

export interface R2BackupItem {
  key: string
  filename: string
  sizeBytes: number
  lastModified: string
  etag?: string
  storageClass?: string
}

/**
 * Faz o upload de um buffer de backup diretamente para o bucket Cloudflare R2.
 */
export async function uploadBackupToR2({
  key,
  buffer,
  contentType = 'application/gzip',
  metadata = {},
}: UploadBackupInput): Promise<{
  key: string
  bucket: string
  sizeBytes: number
  etag?: string
}> {
  const client = getR2Client()
  const bucket = getR2BucketName()

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    Metadata: metadata,
  })

  const response = await client.send(command)

  return {
    key,
    bucket,
    sizeBytes: buffer.length,
    etag: response.ETag,
  }
}

/**
 * Lista todos os arquivos de backup salvos no Cloudflare R2.
 */
export async function listR2Backups(prefix = 'backups/'): Promise<R2BackupItem[]> {
  const client = getR2Client()
  const bucket = getR2BucketName()

  const command = new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: prefix,
  })

  const response = await client.send(command)
  const contents = response.Contents || []

  return contents
    .filter((obj) => obj.Key && !obj.Key.endsWith('/'))
    .map((obj) => ({
      key: obj.Key!,
      filename: obj.Key!.replace(/^.*[\\\/]/, ''),
      sizeBytes: obj.Size || 0,
      lastModified: obj.LastModified ? obj.LastModified.toISOString() : new Date().toISOString(),
      etag: obj.ETag,
      storageClass: obj.StorageClass,
    }))
    .sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime())
}

/**
 * Baixa um arquivo de backup do Cloudflare R2 como Buffer.
 */
export async function downloadR2Backup(key: string): Promise<{
  buffer: Buffer
  contentType?: string
  metadata?: Record<string, string>
}> {
  const client = getR2Client()
  const bucket = getR2BucketName()

  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  })

  const response = await client.send(command)
  if (!response.Body) {
    throw new Error(`Objeto não encontrado ou corpo vazio no Cloudflare R2: ${key}`)
  }

  const byteArray = await response.Body.transformToByteArray()
  return {
    buffer: Buffer.from(byteArray),
    contentType: response.ContentType,
    metadata: response.Metadata,
  }
}

/**
 * Remove um arquivo de backup do Cloudflare R2.
 */
export async function deleteR2Backup(key: string): Promise<void> {
  const client = getR2Client()
  const bucket = getR2BucketName()

  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  })

  await client.send(command)
}
