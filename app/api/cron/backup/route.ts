import { NextRequest, NextResponse } from 'next/server'
import { executeDatabaseBackup } from '@/lib/backup/generator'

export const dynamic = 'force-dynamic'
export const revalidate = 0
// Aumenta o tempo limite de execução em ambiente serverless se suportado
export const maxDuration = 60

/**
 * Validação segura de chamadas de Cron (Vercel Cron ou serviço externo).
 */
function isCronAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')
  const headerSecret = request.headers.get('x-cron-secret')
  const querySecret = request.nextUrl.searchParams.get('secret')

  // Se Vercel Cron estiver chamando (Vercel envia Authorization: Bearer <CRON_SECRET>)
  if (cronSecret) {
    if (authHeader === `Bearer ${cronSecret}` || headerSecret === cronSecret || querySecret === cronSecret) {
      return true
    }
  }

  // Se for executado em ambiente de desenvolvimento local sem secret configurado
  if (process.env.NODE_ENV === 'development') {
    return true
  }

  return false
}

async function runCronBackup(request: NextRequest) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json(
      { error: 'Não autorizado. Forneça o CRON_SECRET correto via header Authorization ou x-cron-secret.' },
      { status: 401 }
    )
  }

  console.log('[CRON /api/cron/backup] Disparando rotina automática diária de backup...')

  try {
    const result = await executeDatabaseBackup({
      trigger: 'CRON_AUTOMATIC',
      saveLocalCopy: true,
    })

    console.log(`[CRON /api/cron/backup] Backup concluído com sucesso: ${result.key}`)

    return NextResponse.json({
      success: true,
      message: 'Backup automático diário executado e enviado para o Cloudflare R2 com sucesso.',
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
    console.error('[CRON /api/cron/backup] Falha ao executar backup automático:', error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Falha na rotina automática de backup',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/cron/backup
 * Utilizado primariamente pelo Vercel Cron configurado no vercel.json
 */
export async function GET(request: NextRequest) {
  return runCronBackup(request)
}

/**
 * POST /api/cron/backup
 * Utilizado por GitHub Actions ou runners externos
 */
export async function POST(request: NextRequest) {
  return runCronBackup(request)
}
