import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { getAuthUser, requireRole } from '@/lib/api-auth'
import { executeBackup } from '@/scripts/dr/backup'
import { loadAndVerifyBackup, restoreToIsolatedSchema } from '@/scripts/dr/restore'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET - Listar histórico de backups realizados
export async function GET(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!requireRole(user, ['DEVELOPER'])) {
      return NextResponse.json({ error: 'Acesso restrito a DEVELOPER' }, { status: 403 })
    }

    const backupDir = path.join(process.cwd(), 'backups')
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true })
    }

    const files = fs.readdirSync(backupDir)
    const backupFiles = files
      .filter((file) => file.startsWith('barbershop-backup-') && (file.endsWith('.enc') || file.endsWith('.json.gz')))
      .map((file) => {
        const filePath = path.join(backupDir, file)
        const stats = fs.statSync(filePath)
        const isEncrypted = file.endsWith('.enc')

        return {
          filename: file,
          sizeBytes: stats.size,
          createdAt: stats.birthtime || stats.mtime,
          isEncrypted,
          status: 'SUCCESS',
        }
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    const lastBackup = backupFiles.length > 0 ? backupFiles[0] : null

    return NextResponse.json({
      backups: backupFiles,
      lastBackup,
      nextScheduledBackup: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      encryption: 'AES-256-GCM',
      targetRpoHours: 24,
      targetRtoMinutes: 30,
    })
  } catch (error: any) {
    console.error('Erro ao listar backups:', error)
    return NextResponse.json({ error: error?.message || 'Erro ao carregar backups' }, { status: 500 })
  }
}

// POST - Executar backup manual ou restaurar em ambiente isolado
export async function POST(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!requireRole(user, ['DEVELOPER'])) {
      return NextResponse.json({ error: 'Acesso restrito a DEVELOPER' }, { status: 403 })
    }

    const body = await request.json()
    const { action, filename, confirmationCode } = body

    if (action === 'create') {
      const result = await executeBackup({
        encrypt: true,
      })

      return NextResponse.json({
        success: true,
        message: 'Backup consistente e criptografado gerado com sucesso.',
        manifest: result.manifest,
        finalSizeBytes: result.finalSizeBytes,
        filePath: path.basename(result.filePath),
      })
    }

    if (action === 'restore') {
      if (!filename) {
        return NextResponse.json({ error: 'Nome do arquivo de backup é obrigatório' }, { status: 400 })
      }

      if (confirmationCode !== 'RESTAURAR-BACKUP') {
        return NextResponse.json(
          { error: 'Código de confirmação incorreto. Digite "RESTAURAR-BACKUP" para prosseguir.' },
          { status: 400 }
        )
      }

      const backupDir = path.join(process.cwd(), 'backups')
      const targetFilePath = path.join(backupDir, path.basename(filename))

      if (!fs.existsSync(targetFilePath)) {
        return NextResponse.json({ error: 'Arquivo de backup não encontrado no servidor' }, { status: 404 })
      }

      // Validação estrita de integridade
      const verifiedData = loadAndVerifyBackup(targetFilePath)

      // Restauração segura em schema isolado de validação (Disaster Recovery Verification)
      const testSchema = `dr_test_${Date.now()}`
      const restoreResult = await restoreToIsolatedSchema(verifiedData, testSchema)

      return NextResponse.json({
        success: true,
        message: `Restauração e validação de integridade executadas com sucesso no schema isolado ${testSchema}.`,
        details: {
          schema: restoreResult.schemaName,
          restoredTables: restoreResult.restoredTables,
          durationMs: restoreResult.durationMs,
          totalRecords: Object.values(restoreResult.restoredTables).reduce((acc, curr) => acc + curr, 0),
        },
      })
    }

    return NextResponse.json({ error: 'Ação inválida. Use "create" ou "restore".' }, { status: 400 })
  } catch (error: any) {
    console.error('Erro na operação de backup/restore:', error)
    return NextResponse.json({ error: error?.message || 'Erro na operação de backup' }, { status: 500 })
  }
}
