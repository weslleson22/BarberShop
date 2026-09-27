import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { getAuthUser, requireRole } from '@/lib/api-auth'
import { executeDatabaseBackup } from '@/lib/backup/generator'
import { listR2Backups, downloadR2Backup, getR2BucketName } from '@/lib/r2'
import { loadAndVerifyBackup, restoreToIsolatedSchema } from '@/scripts/dr/restore'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET - Listar histórico de backups ou baixar arquivo específico
export async function GET(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!requireRole(user, ['DEVELOPER'])) {
      return NextResponse.json({ error: 'Acesso restrito a DEVELOPER' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const downloadKey = searchParams.get('download')

    // Download direto de arquivo de backup
    if (downloadKey) {
      const sanitizedKey = downloadKey.replace(/^\/+/, '')
      const filename = path.basename(sanitizedKey)

      // 1. Tenta baixar do Cloudflare R2
      try {
        const fullKey = sanitizedKey.startsWith('backups/') ? sanitizedKey : `backups/${sanitizedKey}`
        const r2File = await downloadR2Backup(fullKey)
        return new NextResponse(new Uint8Array(r2File.buffer), {
          headers: {
            'Content-Type': r2File.contentType || 'application/gzip',
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': String(r2File.buffer.length),
          },
        })
      } catch (r2Err) {
        // Fallback: se não estiver no R2, verifica disco local
        const localPath = path.join(process.cwd(), 'backups', filename)
        if (fs.existsSync(localPath)) {
          const buffer = fs.readFileSync(localPath)
          return new NextResponse(new Uint8Array(buffer), {
            headers: {
              'Content-Type': 'application/gzip',
              'Content-Disposition': `attachment; filename="${filename}"`,
              'Content-Length': String(buffer.length),
            },
          })
        }
        return NextResponse.json({ error: 'Arquivo de backup não encontrado no Cloudflare R2 nem localmente' }, { status: 404 })
      }
    }

    // Listagem de backups do Cloudflare R2
    let r2Backups: any[] = []
    let r2Error: string | null = null
    const bucket = getR2BucketName()

    try {
      const items = await listR2Backups('backups/')
      r2Backups = items.map((item) => ({
        filename: item.filename,
        key: item.key,
        sizeBytes: item.sizeBytes,
        createdAt: item.lastModified,
        isEncrypted: item.filename.endsWith('.enc'),
        storage: 'Cloudflare R2',
        status: 'SUCCESS',
      }))
    } catch (err: any) {
      console.warn('[Developer Backup GET] Aviso ao listar R2:', err?.message)
      r2Error = err?.message
    }

    // Listagem de backups locais (se existirem)
    const localBackups: any[] = []
    const backupDir = path.join(process.cwd(), 'backups')
    if (fs.existsSync(backupDir)) {
      const files = fs.readdirSync(backupDir)
      files
        .filter((file) => file.endsWith('.sql.gz') || file.endsWith('.json.gz') || file.endsWith('.enc'))
        .forEach((file) => {
          const filePath = path.join(backupDir, file)
          const stats = fs.statSync(filePath)
          // Se já está listado pelo R2, apenas marca redundância
          const alreadyInR2 = r2Backups.some((r) => r.filename === file)
          if (!alreadyInR2) {
            localBackups.push({
              filename: file,
              key: `backups/${file}`,
              sizeBytes: stats.size,
              createdAt: (stats.birthtime || stats.mtime).toISOString(),
              isEncrypted: file.endsWith('.enc'),
              storage: 'Local Disk',
              status: 'SUCCESS',
            })
          }
        })
    }

    // Unifica ordenando pelo mais recente
    const allBackups = [...r2Backups, ...localBackups].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )

    const lastBackup = allBackups.length > 0 ? allBackups[0] : null

    // Próximo agendado (00:00 UTC)
    const nextCron = new Date()
    nextCron.setUTCHours(24, 0, 0, 0)

    return NextResponse.json({
      backups: allBackups,
      lastBackup,
      nextScheduledBackup: nextCron.toISOString(),
      scheduleDescription: 'Diariamente às 00:00 UTC',
      encryption: 'Gzip (.sql.gz)',
      storageDestination: `Cloudflare R2 (${bucket})`,
      targetRpoHours: 24,
      targetRtoMinutes: 15,
      r2Status: r2Error ? 'DEGRADED' : 'ONLINE',
      r2Error,
      bucket,
    })
  } catch (error: any) {
    console.error('Erro ao listar backups:', error)
    return NextResponse.json({ error: error?.message || 'Erro ao carregar backups' }, { status: 500 })
  }
}

// POST - Executar backup manual no Cloudflare R2 ou restaurar
export async function POST(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!requireRole(user, ['DEVELOPER'])) {
      return NextResponse.json({ error: 'Acesso restrito a DEVELOPER' }, { status: 403 })
    }

    const body = await request.json()
    const { action, filename, confirmationCode } = body

    if (action === 'create') {
      const result = await executeDatabaseBackup({
        trigger: 'MANUAL',
        userId: user.id,
        saveLocalCopy: true,
      })

      return NextResponse.json({
        success: true,
        message: 'Backup do banco de dados gerado e enviado para o Cloudflare R2 com sucesso.',
        finalSizeBytes: result.sizeBytes,
        rawSizeBytes: result.rawSizeBytes,
        filePath: result.filename,
        key: result.key,
        bucket: result.bucket,
        tablesCount: result.tablesCount,
        recordsCount: result.recordsCount,
        sha256: result.sha256,
        durationMs: result.durationMs,
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
      let targetFilePath = path.join(backupDir, path.basename(filename))

      // Se não existir localmente, tenta baixar do Cloudflare R2 para restaurar
      if (!fs.existsSync(targetFilePath)) {
        try {
          const r2Key = filename.startsWith('backups/') ? filename : `backups/${filename}`
          const r2Data = await downloadR2Backup(r2Key)
          if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true })
          fs.writeFileSync(targetFilePath, r2Data.buffer)
        } catch {
          return NextResponse.json({ error: 'Arquivo de backup não encontrado no servidor nem no Cloudflare R2' }, { status: 404 })
        }
      }

      // Validação estrita de integridade
      const verifiedData = loadAndVerifyBackup(targetFilePath)

      // Restauração segura em schema isolado de validação
      const testSchema = `dr_test_${Date.now()}`
      const restoreResult = await restoreToIsolatedSchema(verifiedData, testSchema)

      return NextResponse.json({
        success: true,
        message: `Restauração e validação de integridade executadas com sucesso no schema isolado ${testSchema}.`,
        details: {
          schema: restoreResult.schemaName,
          restoredTables: restoreResult.restoredTables,
          durationMs: restoreResult.durationMs,
          totalRecords: Object.values(restoreResult.restoredTables).reduce((acc: number, curr: any) => acc + (typeof curr === 'number' ? curr : 0), 0),
        },
      })
    }

    return NextResponse.json({ error: 'Ação inválida. Use "create" ou "restore".' }, { status: 400 })
  } catch (error: any) {
    console.error('Erro na operação de backup/restore:', error)
    return NextResponse.json({ error: error?.message || 'Erro na operação de backup' }, { status: 500 })
  }
}
