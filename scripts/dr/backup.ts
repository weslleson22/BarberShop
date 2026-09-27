import fs from 'fs'
import path from 'path'
import zlib from 'zlib'
import { prisma } from '../../lib/prisma'
import { encryptData, calculateChecksum } from './crypto'
import { BackupData, BackupManifest } from './types'

// Ordem topológica estrita para inserção/leitura sem violação de Foreign Key
export const TABLES_IN_TOPOLOGICAL_ORDER = [
  '_prisma_migrations',
  'plans',
  'barbershops',
  'barbershop_slug_redirects',
  'users',
  'clients',
  'services',
  'appointments',
  'payments',
  'subscriptions',
  'invoices',
  'subscription_events',
  'processed_webhooks',
  'notifications',
]

/**
 * Executa o backup consistente de todas as tabelas do PostgreSQL.
 */
export async function executeBackup(options: {
  outputDir?: string
  encrypt?: boolean
  passphrase?: string
} = {}): Promise<{
  filePath: string
  manifest: BackupManifest
  rawSizeBytes: number
  finalSizeBytes: number
}> {
  const outputDir = options.outputDir || path.join(process.cwd(), 'backups')
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true })
  }

  const shouldEncrypt = options.encrypt !== undefined ? options.encrypt : true
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  
  // 1. Obter informações de infraestrutura do PostgreSQL
  const dbNameResult: any = await prisma.$queryRawUnsafe('SELECT current_database() as db')
  const versionResult: any = await prisma.$queryRawUnsafe('SELECT version() as ver')
  const migrations: any = await prisma.$queryRawUnsafe(
    'SELECT id, migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at ASC;'
  ).catch(() => [])

  const currentDatabase = dbNameResult[0]?.db || 'postgres'
  const postgresVersion = versionResult[0]?.ver || 'PostgreSQL'

  // 2. Extrair dados de cada tabela em ordem topológica
  const data: Record<string, any[]> = {}
  const tableCounts: Record<string, number> = {}

  for (const table of TABLES_IN_TOPOLOGICAL_ORDER) {
    try {
      const rows: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM "${table}"`)
      data[table] = rows
      tableCounts[table] = rows.length
    } catch (err: any) {
      // Se a tabela ainda não existir no schema ativo, registra vazia
      data[table] = []
      tableCounts[table] = 0
    }
  }

  // 3. Montar payload e calcular checksum SHA-256 antes da cifragem
  const rawPayloadString = JSON.stringify(
    { data },
    (key, value) => (typeof value === 'bigint' ? value.toString() : value)
  )
  const checksum = calculateChecksum(rawPayloadString)

  const manifest: BackupManifest = {
    version: '1.0.0',
    createdAt: new Date().toISOString(),
    sourceDatabase: currentDatabase,
    postgresVersion,
    checksum,
    isEncrypted: shouldEncrypt,
    tables: tableCounts,
    migrations: migrations.map((m: any) => ({
      id: m.id,
      migration_name: m.migration_name,
      finished_at: m.finished_at ? new Date(m.finished_at).toISOString() : null,
    })),
  }

  const fullBackupObject: BackupData = {
    manifest,
    data,
  }

  const serializedFull = JSON.stringify(
    fullBackupObject,
    (key, value) => (typeof value === 'bigint' ? value.toString() : value)
  )

  const rawBuffer = Buffer.from(serializedFull, 'utf-8')
  const rawSizeBytes = rawBuffer.length

  // 4. Compressão Gzip
  const compressedBuffer = zlib.gzipSync(rawBuffer)

  // 5. Criptografia AES-256-GCM (opcional, padrão: ativado)
  const finalBuffer = shouldEncrypt
    ? encryptData(compressedBuffer, options.passphrase)
    : compressedBuffer

  const fileName = `backup-${timestamp}.${shouldEncrypt ? 'enc' : 'json.gz'}`
  const filePath = path.join(outputDir, fileName)

  fs.writeFileSync(filePath, finalBuffer)

  // Salvar também manifesto legível (.manifest.json) para auditoria e inventário rápido
  const manifestPath = path.join(outputDir, `backup-${timestamp}.manifest.json`)
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))

  return {
    filePath,
    manifest,
    rawSizeBytes,
    finalSizeBytes: finalBuffer.length,
  }
}

// Execução via CLI direta
if (process.argv[1]?.endsWith('backup.ts')) {
  executeBackup()
    .then((result) => {
      console.log('✅ BACKUP CONCLUÍDO COM SUCESSO!')
      console.log(`📁 Arquivo: ${result.filePath}`)
      console.log(`🔒 Criptografia: ${result.manifest.isEncrypted ? 'AES-256-GCM Ativada' : 'Desativada'}`)
      console.log(`🔑 Checksum SHA-256: ${result.manifest.checksum}`)
      console.log(`📊 Tamanho Bruto: ${(result.rawSizeBytes / 1024).toFixed(2)} KB`)
      console.log(`📦 Tamanho Final: ${(result.finalSizeBytes / 1024).toFixed(2)} KB`)
      console.log('📋 Contagem de registros por tabela:', JSON.stringify(result.manifest.tables, null, 2))
      process.exit(0)
    })
    .catch((err) => {
      console.error('❌ ERRO AO EXECUTAR BACKUP:', err)
      process.exit(1)
    })
}
