import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, requireRole } from '@/lib/api-auth'
import { backfillMissingSlugs } from '@/lib/tenant'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// POST - Executa a rotina de criação automática de slugs para todos os clientes/barbearias antigos sem slug
export async function POST(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!user || !requireRole(user, ['DEVELOPER'])) {
      return NextResponse.json({ error: 'Acesso restrito ao desenvolvedor da plataforma' }, { status: 403 })
    }

    const result = await backfillMissingSlugs()

    return NextResponse.json({
      success: true,
      message: `Rotina concluída! ${result.updatedCount} barbearia(s) tiveram seus slugs gerados com sucesso.`,
      ...result,
    })
  } catch (error) {
    console.error('Erro na rotina de backfill de slugs:', error)
    return NextResponse.json(
      { error: 'Erro ao executar rotina de geração de slugs' },
      { status: 500 }
    )
  }
}
