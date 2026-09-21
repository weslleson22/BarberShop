import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

import { getAuthUser, requireRole } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  // Bloqueio rigoroso em produção
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Endpoint não disponível em produção' }, { status: 404 })
  }

  // Apenas usuários com papel DEVELOPER podem acessar em desenvolvimento
  const user = getAuthUser(request)
  if (!user || !requireRole(user, ['DEVELOPER'])) {
    return NextResponse.json({ error: 'Acesso restrito ao papel DEVELOPER' }, { status: 403 })
  }
  
  try {
    const rawDbUrl = process.env.DATABASE_URL || ''
    // Mascarar senha caso exista na URL
    const maskedDbUrl = rawDbUrl.replace(/(:[^:@]+)@/, ':****@')

    const envVars = {
      databaseUrl: maskedDbUrl ? maskedDbUrl.substring(0, 30) + '...' : 'Não definida',
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      hasJwtSecret: !!process.env.JWT_SECRET,
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
      hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
      nodeEnv: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    }

    // Testar conexão com banco de dados
    let databaseConnection = {
      status: 'unknown' as 'connected' | 'error' | 'unknown',
      latency: 0,
      error: null as string | null,
      databaseInfo: null as {
        database_name: string;
      } | null
    }

    if (envVars.hasDatabaseUrl) {
      try {
        console.log('=== TESTANDO CONEXÃO COM BANCO DE DADOS ===')
        
        // Teste de conexão básico
        const connectionStart = Date.now()
        await prisma.$queryRaw`SELECT 1 as test`
        const connectionEnd = Date.now()
        
        // Obter informações do banco - simplified for Prisma Accelerate
        const dbInfo = await prisma.$queryRaw<{ 
          database_name: string; 
        }[]>`SELECT current_database() as database_name`
        
        databaseConnection = {
          status: 'connected',
          latency: connectionEnd - connectionStart,
          error: null,
          databaseInfo: dbInfo[0] || null
        }
        
        console.log('Banco conectado com sucesso:', {
          latency: databaseConnection.latency,
          database: databaseConnection.databaseInfo?.database_name,
          user: 'connected'
        })
        
      } catch (dbError) {
        console.error('Erro na conexão com banco:', dbError)
        databaseConnection = {
          status: 'error',
          latency: 0,
          error: dbError instanceof Error ? dbError.message : 'Database connection failed',
          databaseInfo: null
        }
      }
    } else {
      databaseConnection = {
        status: 'error',
        latency: 0,
        error: 'DATABASE_URL não está definida',
        databaseInfo: null
      }
    }

    const endTime = Date.now()
    
    return NextResponse.json({
      ...envVars,
      databaseConnection,
      totalResponseTime: endTime - startTime
    })
  } catch (error) {
    console.error('Debug env error:', error)
    return NextResponse.json({
      error: 'Erro ao buscar variáveis de ambiente',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
      databaseConnection: {
        status: 'error' as const,
        latency: 0,
        error: 'Failed to check environment variables',
        databaseInfo: null
      }
    }, { status: 500 })
  }
}
