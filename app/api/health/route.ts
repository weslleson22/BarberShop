import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    // Test database connection with a simple query
    await prisma.$queryRaw`SELECT 1 as test`
    
    // Get basic database info - simplified query
    const result = await prisma.$queryRaw<{ 
      database_name: string; 
    }[]>`SELECT current_database() as database_name`
    
    return NextResponse.json({
      status: 'connected',
      database: result[0]?.database_name || 'unknown',
      user: 'connected', // Simplified for Prisma Accelerate compatibility
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
