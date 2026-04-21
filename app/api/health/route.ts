import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`
    
    // Get database info
    const result = await prisma.$queryRaw<{ 
      current_database: string; 
      current_user: string; 
    }[]>`SELECT current_database(), current_user()`
    
    return NextResponse.json({
      status: 'connected',
      database: result[0]?.current_database || 'unknown',
      user: result[0]?.current_user || 'unknown',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    })
  } catch (error) {
    console.error('Database connection error:', error)
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Database connection failed',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    }, { status: 500 })
  }
}
