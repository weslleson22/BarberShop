import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, requireRole } from '@/lib/api-auth'
import { executeDatabaseBackup } from '@/lib/backup/generator'
import { listR2Backups, getR2BucketName } from '@/lib/r2'

export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Valida se a requisição tem permissão para disparar o backup:
 * 1. Usuário autenticado com role DEVELOPER ou ADMIN
 * 2. Token de autorização Bearer correspondente a CRON_SECRET (ou header x-cron-secret)
 */
function isAuthorized(request: NextRequest): { authorized: boolean; userId?: string | null } {
  // 1. Validação por CRON_SECRET (para automações externas, CI/CD ou webhooks)
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  const headerSecret = request.headers.get('x-cron-secret')
  const querySecret = request.nextUrl.searchParams.get('secret')

  if (cronSecret) {
    if (authHeader === `Bearer ${cronSecret}` || headerSecret === cronSecret || querySecret === cronSecret) {
      return { authorized: true, userId: null }
    }
  }

  // 2. Validação por sessão de usuário autenticado (DEVELOPER ou ADMIN)
  const user = getAuthUser(request)
  if (user && requireRole(user, ['DEVELOPER', 'ADMIN'])) {
    return { authorized: true, userId: user.id }
  }

  return { authorized: false }
}

/**
 * GET /api/admin/backup
 * Lista todos os backups armazenados no Cloudflare R2.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = isAuthorized(request)
    if (!auth.authorized) {
      return NextResponse.json(
        { error: 'Não autorizado. Acesso restrito a administradores ou chave de API/Cron válida.' },
        { status: 401 }
      )
    }

    const bucket = getR2BucketName()
    const backups = await listR2Backups('backups/')

    return NextResponse.json({
      success: true,
      bucket,
      total: backups.length,
      backups,
      lastBackup: backups.length > 0 ? backups[0] : null,
      nextScheduled: 'Diariamente às 00:00 UTC (Vercel Cron / node-cron)',
    })
  } catch (error: any) {
    console.error('[API /api/admin/backup GET] Erro ao listar backups:', error)
    return NextResponse.json(
      { error: error?.message || 'Erro ao listar backups do Cloudflare R2' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/backup
 * Dispara o backup manual sob demanda com upload automático para o Cloudflare R2.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = isAuthorized(request)
    if (!auth.authorized) {
      return NextResponse.json(
        { error: 'Não autorizado. Acesso restrito a administradores ou chave de API/Cron válida.' },
        { status: 401 }
      )
    }

    const result = await executeDatabaseBackup({
      trigger: 'MANUAL',
      userId: auth.userId,
      saveLocalCopy: true,
    })

    return NextResponse.json({
      success: true,
      message: 'Backup do banco de dados gerado e enviado para o Cloudflare R2 com sucesso.',
      backup: {
        key: result.key,
        filename: result.filename,
        bucket: result.bucket,
        sizeBytes: result.sizeBytes,
        rawSizeBytes: result.rawSizeBytes,
        tablesCount: result.tablesCount,
        recordsCount: result.recordsCount,
        sha256: result.sha256,
        createdAt: result.createdAt,
        durationMs: result.durationMs,
      },
    })
  } catch (error: any) {
    console.error('[API /api/admin/backup POST] Erro ao executar backup:', error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Erro interno ao gerar e enviar o backup para o Cloudflare R2',
      },
      { status: 500 }
    )
  }
}
