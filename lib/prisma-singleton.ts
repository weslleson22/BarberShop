import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    errorFormat: 'pretty',
    // Optimizations for Vercel serverless
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  })

// Handle graceful shutdown in production
if (process.env.NODE_ENV === 'production') {
  process.on('beforeExit', async () => {
    await prisma.$disconnect()
  })
  process.on('SIGINT', async () => {
    await prisma.$disconnect()
    process.exit(0)
  })
  process.on('SIGTERM', async () => {
    await prisma.$disconnect()
    process.exit(0)
  })
}

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
