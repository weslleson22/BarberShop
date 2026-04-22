import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const startTime = Date.now()
  
  try {
    // Capturar todas as variáveis de ambiente relevantes
    const envVars = {
      databaseUrl: process.env.DATABASE_URL || 'Não definida',
      jwtSecret: process.env.JWT_SECRET || 'Não definida',
      nextAuthSecret: process.env.NEXTAUTH_SECRET || 'Não definida',
      nextAuthUrl: process.env.NEXTAUTH_URL || 'Não definida',
      nodeEnv: process.env.NODE_ENV || 'development',
      
      // Status flags
      hasDatabaseUrl: !!process.env.DATABASE_URL && process.env.DATABASE_URL !== 'Não definida',
      hasJwtSecret: !!process.env.JWT_SECRET && process.env.JWT_SECRET !== 'Não definida',
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET !== 'Não definida',
      hasNextAuthUrl: !!process.env.NEXTAUTH_URL && process.env.NEXTAUTH_URL !== 'Não definida',
      
      // Informações adicionais
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      
      // Debug adicional
      allEnvKeys: Object.keys(process.env).filter(key => 
        key.includes('DATABASE') || 
        key.includes('JWT') || 
        key.includes('NEXTAUTH') || 
        key.includes('NODE_ENV')
      )
    }

    // Testar conexão com banco de dados
    let databaseConnection = {
      status: 'unknown' as 'connected' | 'error' | 'unknown',
      latency: 0,
      error: null as string | null,
      databaseInfo: null as {
        current_database: string;
        current_user: string;
      } | null
    }

    if (envVars.hasDatabaseUrl) {
      try {
        console.log('=== TESTANDO CONEXÃO COM BANCO DE DADOS ===')
        
        // Teste de conexão básico
        const connectionStart = Date.now()
        await prisma.$queryRaw`SELECT 1`
        const connectionEnd = Date.now()
        
        // Obter informações do banco
        const dbInfo = await prisma.$queryRaw<{ 
          current_database: string; 
          current_user: string; 
        }[]>`SELECT current_database(), current_user()`
        
        databaseConnection = {
          status: 'connected',
          latency: connectionEnd - connectionStart,
          error: null,
          databaseInfo: dbInfo[0] || null
        }
        
        console.log('Banco conectado com sucesso:', {
          latency: databaseConnection.latency,
          database: databaseConnection.databaseInfo?.current_database,
          user: databaseConnection.databaseInfo?.current_user
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
