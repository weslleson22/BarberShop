import { NextRequest, NextResponse } from 'next/server'
import { searchBrazilianCities, ALL_IBGE_CITIES } from '@/lib/brazilian-cities'

export const dynamic = 'force-dynamic'

/**
 * Endpoint de busca de municípios do Brasil (Base oficial do IBGE - 5.571 municípios)
 * GET /api/cities?q=campinas&limit=15
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q') || ''
    const limit = Math.min(parseInt(searchParams.get('limit') || '15', 10), 100)

    if (!q.trim()) {
      return NextResponse.json({
        total: ALL_IBGE_CITIES.length,
        cities: ALL_IBGE_CITIES.slice(0, limit).map((c) => ({
          nome: c.nome,
          uf: c.uf,
          label: c.label,
        })),
      })
    }

    const results = searchBrazilianCities(q, limit)

    return NextResponse.json({
      total: results.length,
      cities: results,
    })
  } catch (error) {
    console.error('API cities error:', error)
    return NextResponse.json({ error: 'Erro ao buscar cidades' }, { status: 500 })
  }
}
