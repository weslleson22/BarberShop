import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser, requireRole } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET - Métricas globais da plataforma SaaS (exclusivo DEVELOPER)
export async function GET(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!requireRole(user, ['DEVELOPER'])) {
      return NextResponse.json({ error: 'Acesso restrito ao desenvolvedor da plataforma' }, { status: 403 })
    }

    const [
      totalBarbershops,
      activeBarbershops,
      usersByRole,
      totalClients,
      totalServices,
    ] = await Promise.all([
      prisma.barbershop.count(),
      prisma.barbershop.count({ where: { isActive: true } }),
      prisma.user.groupBy({
        by: ['role'],
        _count: { id: true },
      }),
      prisma.client.count(),
      prisma.service.count(),
    ])

    const rolesMap: Record<string, number> = {}
    usersByRole.forEach((g) => {
      rolesMap[g.role] = g._count.id
    })

    return NextResponse.json({
      tenants: {
        total: totalBarbershops,
        active: activeBarbershops,
        inactive: totalBarbershops - activeBarbershops,
      },
      users: {
        total: Object.values(rolesMap).reduce((a, b) => a + b, 0),
        byRole: rolesMap,
      },
      clients: {
        total: totalClients,
      },
      services: {
        total: totalServices,
      },
      system: {
        nodeEnv: process.env.NODE_ENV || 'development',
        serverTime: new Date().toISOString(),
        database: 'PostgreSQL',
        isolation: 'Tenant ID Scoped',
      },
    })
  } catch (error) {
    console.error('Developer metrics GET error:', error)
    return NextResponse.json(
      { error: 'Erro ao processar métricas globais' },
      { status: 500 }
    )
  }
}
