import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    errorFormat: 'pretty',
    ...(process.env.DATABASE_URL
      ? {
          datasources: {
            db: {
              url: process.env.DATABASE_URL,
            },
          },
        }
      : {}),
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

// Ensure prisma is saved to globalThis in ALL environments (including production).
// In serverless environments (e.g. Vercel), warm containers re-execute modules and this prevents
// leaking database connections and hitting PostgreSQL connection limits or remote host resets.
if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = prisma
}

