import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const diagnostic = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    vercel: {
      isVercel: !!process.env.VERCEL,
      region: process.env.VERCEL_REGION,
      env: process.env.VERCEL_ENV
    },
    database: {
      hasUrl: !!process.env.DATABASE_URL,
      urlPrefix: process.env.DATABASE_URL?.split('://')[0] || 'missing',
      urlLength: process.env.DATABASE_URL?.length || 0,
      isPrismaProtocol: process.env.DATABASE_URL?.startsWith('prisma'),
      isPostgresProtocol: process.env.DATABASE_URL?.startsWith('postgresql'),
      hasApiKey: process.env.DATABASE_URL?.includes('api_key'),
      hasSSL: process.env.DATABASE_URL?.includes('sslmode')
    },
    otherVars: {
      jwtSecret: !!process.env.JWT_SECRET,
      nextAuthSecret: !!process.env.NEXTAUTH_SECRET,
      nextAuthUrl: !!process.env.NEXTAUTH_URL
    }
  }

  let connectionTest: any = null

  // Test database connection
  try {
    const start = Date.now()
    await prisma.$queryRaw`SELECT 1 as test`
    const end = Date.now()
    
    connectionTest = {
      status: 'connected',
      latency: `${end - start}ms`,
      timestamp: new Date().toISOString()
    }

    // Test a simple query
    const barbershopCount = await prisma.barbershop.count()
    connectionTest.barbershopCount = barbershopCount

  } catch (error) {
    connectionTest = {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }
  }

  return NextResponse.json({
    ...diagnostic,
    connection: connectionTest,
    recommendations: getRecommendations(diagnostic, connectionTest)
  })
}

function getRecommendations(diag: any, conn: any) {
  const recommendations = []

  // Database URL recommendations
  if (!diag.database.hasUrl) {
    recommendations.push({
      priority: 'critical',
      issue: 'DATABASE_URL não encontrada',
      solution: 'Configurar DATABASE_URL no Vercel Dashboard'
    })
  }

  if (!diag.database.isPrismaProtocol && !diag.database.isPostgresProtocol) {
    recommendations.push({
      priority: 'critical',
      issue: 'DATABASE_URL com protocolo inválido',
      solution: 'Usar prisma+postgres:// ou postgresql://'
    })
  }

  if (diag.database.isPrismaProtocol && !diag.database.hasApiKey) {
    recommendations.push({
      priority: 'critical',
      issue: 'URL Prisma sem API key',
      solution: 'Adicionar ?api_key=... na URL'
    })
  }

  if (diag.database.isPostgresProtocol && !diag.database.hasSSL) {
    recommendations.push({
      priority: 'warning',
      issue: 'PostgreSQL sem SSL',
      solution: 'Adicionar ?sslmode=require'
    })
  }

  // Connection test recommendations
  if (conn.status === 'error') {
    if (conn.message?.includes('Environment variable not found')) {
      recommendations.push({
        priority: 'critical',
        issue: 'Variável de ambiente não encontrada',
        solution: 'Verificar spelling e ambiente no Vercel'
      })
    }
    if (conn.message?.includes('protocol')) {
      recommendations.push({
        priority: 'critical',
        issue: 'Protocolo inválido',
        solution: 'Usar prisma+postgres:// para Data Proxy'
      })
    }
  }

  // Environment recommendations
  if (!diag.otherVars.jwtSecret || !diag.otherVars.nextAuthSecret) {
    recommendations.push({
      priority: 'warning',
      issue: 'Secrets não configurados',
      solution: 'Configurar JWT_SECRET e NEXTAUTH_SECRET'
    })
  }

  return recommendations
}
