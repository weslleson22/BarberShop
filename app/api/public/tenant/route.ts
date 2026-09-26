import { NextRequest, NextResponse } from 'next/server'
import { resolvePublicTenant } from '@/lib/tenant'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET - Obter informações públicas do tenant por slug ou id
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const identifier = searchParams.get('slug') || searchParams.get('barbershopId')

    const result = await resolvePublicTenant(identifier)
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.status })
    }

    const { tenant } = result
    return NextResponse.json({
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      phone: tenant.phone,
      address: tenant.address,
      logo: tenant.logo,
      description: tenant.description,
      status: tenant.status,
      isActive: tenant.isActive,
    })
  } catch (error) {
    console.error('API public tenant error:', error)
    return NextResponse.json({ error: 'Erro ao consultar barbearia' }, { status: 500 })
  }
}
