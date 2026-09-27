import fs from 'fs'
import path from 'path'
import zlib from 'zlib'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { uploadBackupToR2, getR2BucketName } from '@/lib/r2'
import { createAuditLog } from '@/lib/audit-log'
import { AuditAction, AuditEntity } from '@prisma/client'

// Ordem topológica estrita para PostgreSQL garantindo integridade referencial
export const TABLES_IN_TOPOLOGICAL_ORDER = [
  '_prisma_migrations',
  'plans',
  'barbershops',
  'barbershop_slug_redirects',
  'users',
  'notifications',
  'clients',
  'services',
  'appointments',
  'payments',
  'subscriptions',
  'invoices',
  'subscription_events',
  'processed_webhooks',
  'tenant_feedbacks',
  'privacy_requests',
  'audit_logs',
]

/**
 * Formata um valor JavaScript para a representação literal SQL PostgreSQL válida e segura.
 */
function escapeSqlValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'NULL'
  }

  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE'
  }

  if (typeof value === 'number') {
    if (isNaN(value)) return 'NULL'
    return String(value)
  }

  if (typeof value === 'bigint') {
    return value.toString()
  }

  if (value instanceof Date) {
    return `'${value.toISOString()}'`
  }

  if (Array.isArray(value)) {
    // Array PostgreSQL ou JSON array
    const jsonStr = JSON.stringify(value).replace(/'/g, "''")
    return `'${jsonStr}'::jsonb`
  }

  if (typeof value === 'object') {
    const jsonStr = JSON.stringify(value).replace(/'/g, "''")
    return `'${jsonStr}'::jsonb`
  }

  if (typeof value === 'string') {
    // Escapa aspas simples duplicando-as no padrão SQL ANSI
    const escaped = value.replace(/'/g, "''")
    return `'${escaped}'`
  }

  return `'${String(value).replace(/'/g, "''")}'`
}

/**
 * Gera o nome de arquivo e chave de armazenamento no formato exigido:
 * backups/backup-YYYY-MM-DD_HH-mm-ss.sql.gz
 */
export function generateBackupKey(date: Date = new Date()): { key: string; filename: string } {
  const pad = (n: number) => String(n).padStart(2, '0')
  const year = date.getUTCFullYear()
  const month = pad(date.getUTCMonth() + 1)
  const day = pad(date.getUTCDate())
  const hours = pad(date.getUTCHours())
  const minutes = pad(date.getUTCMinutes())
  const seconds = pad(date.getUTCSeconds())

  const filename = `backup-${year}-${month}-${day}_${hours}-${minutes}-${seconds}.sql.gz`
  const key = `backups/${filename}`

  return { key, filename }
}

export interface BackupExecutionResult {
  key: string
  filename: string
  bucket: string
  sizeBytes: number
  rawSizeBytes: number
  tablesCount: number
  recordsCount: number
  tableStats: Record<string, number>
  sha256: string
  createdAt: string
  durationMs: number
  localPath?: string
}

/**
 * Gera um dump SQL estruturado completo a partir do banco de dados conectado via Prisma.
 */
export async function generateSqlDump(): Promise<{
  sql: string
  tableStats: Record<string, number>
  totalRecords: number
  databaseName: string
  postgresVersion: string
}> {
  // Informações de infraestrutura
  const dbNameResult: any = await prisma.$queryRawUnsafe('SELECT current_database() as db').catch(() => [{ db: 'postgres' }])
  const versionResult: any = await prisma.$queryRawUnsafe('SELECT version() as ver').catch(() => [{ ver: 'PostgreSQL' }])
  const databaseName = dbNameResult[0]?.db || 'postgres'
  const postgresVersion = versionResult[0]?.ver || 'PostgreSQL'

  const lines: string[] = []
  const tableStats: Record<string, number> = {}
  let totalRecords = 0

  // Cabeçalho PostgreSQL
  lines.push('-- ========================================================')
  lines.push('-- BarberShop Cloud Database Backup')
  lines.push(`-- Source Database: ${databaseName}`)
  lines.push(`-- PostgreSQL Version: ${postgresVersion}`)
  lines.push(`-- Generated At: ${new Date().toISOString()}`)
  lines.push('-- Format: PostgreSQL Standard SQL Dump (.sql)')
  lines.push('-- ========================================================')
  lines.push('SET statement_timeout = 0;')
  lines.push('SET lock_timeout = 0;')
  lines.push("SET client_encoding = 'UTF8';")
  lines.push('SET standard_conforming_strings = on;')
  lines.push('SET check_function_bodies = false;')
  lines.push('SET client_min_messages = warning;')
  lines.push('SET row_security = off;')
  lines.push('')
  lines.push('BEGIN;')
  lines.push('SET CONSTRAINTS ALL DEFERRED;')
  lines.push('')

  // Itera por todas as tabelas em ordem topológica
  for (const table of TABLES_IN_TOPOLOGICAL_ORDER) {
    try {
      const rows: any[] = await prisma.$queryRawUnsafe(`SELECT * FROM "${table}"`)
      tableStats[table] = rows.length
      totalRecords += rows.length

      lines.push(`-- --------------------------------------------------------`)
      lines.push(`-- Data for table: "${table}" (${rows.length} records)`)
      lines.push(`-- --------------------------------------------------------`)

      if (rows.length > 0) {
        const columns = Object.keys(rows[0])
        const quotedColumns = columns.map((col) => `"${col}"`).join(', ')

        for (const row of rows) {
          const values = columns.map((col) => escapeSqlValue(row[col])).join(', ')
          lines.push(`INSERT INTO "${table}" (${quotedColumns}) VALUES (${values});`)
        }
      }

      lines.push('')
    } catch {
      // Tabela pode não existir ainda em certos ambientes
      tableStats[table] = 0
    }
  }

  lines.push('COMMIT;')
  lines.push('')
  lines.push('-- Dump completed successfully.')

  return {
    sql: lines.join('\n'),
    tableStats,
    totalRecords,
    databaseName,
    postgresVersion,
  }
}

/**
 * Rotina central que executa a extração do banco, compacta em .sql.gz
 * e realiza o upload para o Cloudflare R2 com chave backups/backup-YYYY-MM-DD_HH-mm-ss.sql.gz.
 */
export async function executeDatabaseBackup(options: {
  saveLocalCopy?: boolean
  userId?: string | null
  trigger?: 'MANUAL' | 'CRON_AUTOMATIC' | 'CLI'
} = {}): Promise<BackupExecutionResult> {
  const startTime = Date.now()
  const now = new Date()
  const { key, filename } = generateBackupKey(now)
  const bucket = getR2BucketName()

  // 1. Extração dos dados e geração do dump SQL
  const { sql, tableStats, totalRecords, databaseName } = await generateSqlDump()

  // 2. Cálculo do tamanho e compressão Gzip (.sql.gz)
  const rawBuffer = Buffer.from(sql, 'utf-8')
  const rawSizeBytes = rawBuffer.length
  const compressedBuffer = zlib.gzipSync(rawBuffer, { level: 9 })
  const finalSizeBytes = compressedBuffer.length

  // 3. Checksum SHA-256 do arquivo compactado
  const sha256 = crypto.createHash('sha256').update(compressedBuffer).digest('hex')

  // 4. Upload para o Cloudflare R2
  await uploadBackupToR2({
    key,
    buffer: compressedBuffer,
    contentType: 'application/gzip',
    metadata: {
      sourceDatabase: databaseName,
      createdAt: now.toISOString(),
      rawSizeBytes: String(rawSizeBytes),
      finalSizeBytes: String(finalSizeBytes),
      totalRecords: String(totalRecords),
      sha256,
      trigger: options.trigger || 'MANUAL',
    },
  })

  // 5. Cópia local opcional (em ambiente com disco acessível)
  let localPath: string | undefined
  if (options.saveLocalCopy !== false) {
    try {
      const backupDir = path.join(process.cwd(), 'backups')
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true })
      }
      localPath = path.join(backupDir, filename)
      fs.writeFileSync(localPath, compressedBuffer)
    } catch {
      // Ignora falhas de gravação local em ambientes read-only (ex: Vercel serverless)
    }
  }

  const durationMs = Date.now() - startTime

  // 6. Registro de Auditoria (Audit Log)
  try {
    await createAuditLog({
      userId: options.userId ?? null,
      action: AuditAction.DATA_EXPORTED,
      entity: AuditEntity.SYSTEM,
      entityId: key,
      metadata: {
        r2Key: key,
        bucket,
        filename,
        sizeBytes: finalSizeBytes,
        rawSizeBytes,
        totalRecords,
        tablesCount: Object.keys(tableStats).length,
        sha256,
        durationMs,
        trigger: options.trigger || 'MANUAL',
      },
      success: true,
    })
  } catch (auditErr) {
    console.warn('[Backup] Falha ao registrar log de auditoria:', auditErr)
  }

  return {
    key,
    filename,
    bucket,
    sizeBytes: finalSizeBytes,
    rawSizeBytes,
    tablesCount: Object.keys(tableStats).length,
    recordsCount: totalRecords,
    tableStats,
    sha256,
    createdAt: now.toISOString(),
    durationMs,
    localPath,
  }
}
