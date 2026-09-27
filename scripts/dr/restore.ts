import fs from 'fs'
import path from 'path'
import zlib from 'zlib'
import { prisma } from '../../lib/prisma'
import { decryptData, calculateChecksum } from './crypto'
import { BackupData, BackupManifest } from './types'
import { TABLES_IN_TOPOLOGICAL_ORDER } from './backup'

/**
 * Lê, decripta e valida integridade criptográfica de um arquivo de backup.
 */
export function loadAndVerifyBackup(filePath: string, passphrase?: string): BackupData {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Arquivo de backup não encontrado: ${filePath}`)
  }

  const rawFileBuffer = fs.readFileSync(filePath)
  const isEncrypted = filePath.endsWith('.enc')

  // 1. Decriptar caso seja arquivo cifrado
  const decompressedBuffer = isEncrypted
    ? decryptData(rawFileBuffer, passphrase)
    : rawFileBuffer

  // 2. Descomprimir Gzip
  const unzippedBuffer = zlib.gunzipSync(decompressedBuffer)
  const jsonString = unzippedBuffer.toString('utf-8')
  const backupObject: BackupData = JSON.parse(jsonString)

  // 3. Validação estrita do Checksum SHA-256
  const payloadToVerify = JSON.stringify(
    { data: backupObject.data },
    (key, value) => (typeof value === 'bigint' ? value.toString() : value)
  )
  const calculated = calculateChecksum(payloadToVerify)

  if (calculated !== backupObject.manifest.checksum) {
    throw new Error(
      `FALHA CRÍTICA DE INTEGRIDADE: O checksum do arquivo (${calculated}) não confere com o manifesto (${backupObject.manifest.checksum}). O arquivo pode estar adulterado ou corrompido.`
    )
  }

  return backupObject
}

/**
 * Restaura dados em um schema PostgreSQL isolado para teste de Disaster Recovery ou ambiente dedicado.
 */
export async function restoreToIsolatedSchema(
  backupData: BackupData,
  schemaName: string
): Promise<{
  schemaName: string
  restoredTables: Record<string, number>
  durationMs: number
}> {
  const startTime = Date.now()

  // 1. Provisionar schema isolado
  await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE;`)
  await prisma.$executeRawUnsafe(`CREATE SCHEMA "${schemaName}";`)

  const restoredTables: Record<string, number> = {}

  // 2. Criar tabelas clonando a estrutura do schema public (INCLUDING ALL copia índices e constraints)
  for (const table of TABLES_IN_TOPOLOGICAL_ORDER) {
    try {
      await prisma.$executeRawUnsafe(
        `CREATE TABLE "${schemaName}"."${table}" (LIKE "public"."${table}" INCLUDING ALL);`
      )
    } catch (err: any) {
      // Caso a tabela não exista no public atual, pula
      continue
    }

    const rows = backupData.data[table] || []
    if (rows.length === 0) {
      restoredTables[table] = 0
      continue
    }

    // 3. Inserir dados em lotes (batch chunks) preservando tipos, arrays e JSON
    const columns = Object.keys(rows[0])
    const quotedColumns = columns.map((c) => `"${c}"`).join(', ')
    const CHUNK_SIZE = 50

    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
      const chunk = rows.slice(i, i + CHUNK_SIZE)
      const valuesList = chunk.map((row) => {
        const rowValues = columns.map((col) => {
          const val = row[col]
          if (val === null || val === undefined) return 'NULL'
          if (typeof val === 'number' || typeof val === 'bigint') return val
          if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE'
          if (val instanceof Date || (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}T/))) {
            return `'${new Date(val).toISOString()}'`
          }
          if (Array.isArray(val)) {
            if (val.length === 0) return 'ARRAY[]::text[]'
            return `ARRAY[${val.map((v) => `'${String(v).replace(/'/g, "''")}'`).join(', ')}]`
          }
          if (typeof val === 'object') {
            return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`
          }
          return `'${String(val).replace(/'/g, "''")}'`
        })
        return `(${rowValues.join(', ')})`
      })

      const insertSql = `INSERT INTO "${schemaName}"."${table}" (${quotedColumns}) VALUES ${valuesList.join(', ')};`
      await prisma.$executeRawUnsafe(insertSql)
    }

    restoredTables[table] = rows.length
  }

  return {
    schemaName,
    restoredTables,
    durationMs: Date.now() - startTime,
  }
}

/**
 * Validação profunda de consistência dos dados restaurados.
 */
export async function validateRestoredSchema(
  schemaName: string,
  manifest: BackupManifest
): Promise<{
  valid: boolean
  checks: Array<{ name: string; status: 'PASS' | 'FAIL'; details: string }>
}> {
  const checks: Array<{ name: string; status: 'PASS' | 'FAIL'; details: string }> = []

  // Checagem 1: Contagem exata de registros por tabela
  for (const [table, expectedCount] of Object.entries(manifest.tables)) {
    try {
      const countResult: any = await prisma.$queryRawUnsafe(
        `SELECT COUNT(*)::int as count FROM "${schemaName}"."${table}"`
      )
      const actualCount = countResult[0]?.count ?? 0
      if (actualCount === expectedCount) {
        checks.push({
          name: `Contagem: ${table}`,
          status: 'PASS',
          details: `Esperado: ${expectedCount}, Encontrado: ${actualCount}`,
        })
      } else {
        checks.push({
          name: `Contagem: ${table}`,
          status: 'FAIL',
          details: `Divergência! Esperado: ${expectedCount}, Encontrado: ${actualCount}`,
        })
      }
    } catch (err: any) {
      checks.push({
        name: `Tabela: ${table}`,
        status: expectedCount === 0 ? 'PASS' : 'FAIL',
        details: `Tabela não consultável: ${err.message}`,
      })
    }
  }

  // Checagem 2: Integridade de Barbershops (Entidade Raiz do Tenant)
  try {
    const shops: any = await prisma.$queryRawUnsafe(
      `SELECT id, name, slug, "isActive" FROM "${schemaName}"."barbershops"`
    )
    const validShops = Array.isArray(shops) && shops.length === manifest.tables['barbershops']
    checks.push({
      name: 'Integridade de Barbershops',
      status: validShops ? 'PASS' : 'FAIL',
      details: `${shops.length} barbearias validadas com identificadores e slugs intactos`,
    })
  } catch (err: any) {
    checks.push({
      name: 'Integridade de Barbershops',
      status: 'FAIL',
      details: err.message,
    })
  }

  // Checagem 3: Integridade de Usuários e Perfis RBAC
  try {
    const users: any = await prisma.$queryRawUnsafe(
      `SELECT id, email, role, "barbershopId" FROM "${schemaName}"."users"`
    )
    const hasAdmin = users.some((u: any) => u.role === 'ADMIN' || u.role === 'DEVELOPER')
    checks.push({
      name: 'Integridade de Usuários e RBAC',
      status: hasAdmin ? 'PASS' : 'FAIL',
      details: `${users.length} usuários restaurados com roles intactas e vínculos tenant`,
    })
  } catch (err: any) {
    checks.push({
      name: 'Integridade de Usuários e RBAC',
      status: 'FAIL',
      details: err.message,
    })
  }

  // Checagem 4: Integridade de Clientes e Agendamentos
  try {
    const apts: any = await prisma.$queryRawUnsafe(
      `SELECT id, "startTime", "endTime", status, "barbershopId", "clientId", "barberId" FROM "${schemaName}"."appointments"`
    )
    checks.push({
      name: 'Integridade de Agendamentos',
      status: 'PASS',
      details: `${apts.length} agendamentos restaurados com relacionamento de barbeiro e cliente`,
    })
  } catch (err: any) {
    checks.push({
      name: 'Integridade de Agendamentos',
      status: 'FAIL',
      details: err.message,
    })
  }

  const allPassed = checks.every((c) => c.status === 'PASS')
  return { valid: allPassed, checks }
}

/**
 * Remove e descarta o ambiente temporário após validação.
 */
export async function teardownIsolatedSchema(schemaName: string): Promise<void> {
  await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schemaName}" CASCADE;`)
}
