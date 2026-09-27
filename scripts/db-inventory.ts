import { prisma } from '../lib/prisma'

async function main() {
  try {
    const versionResult: any = await prisma.$queryRawUnsafe('SELECT version()')
    const dbNameResult: any = await prisma.$queryRawUnsafe('SELECT current_database()')
    const dbSizeResult: any = await prisma.$queryRawUnsafe('SELECT pg_size_pretty(pg_database_size(current_database())) as size')
    const tableStats: any = await prisma.$queryRawUnsafe(`
      SELECT
        relname AS table_name,
        n_live_tup AS row_count,
        pg_size_pretty(pg_total_relation_size(relid)) AS total_size
      FROM pg_stat_user_tables
      ORDER BY pg_total_relation_size(relid) DESC;
    `)
    const migrations: any = await prisma.$queryRawUnsafe('SELECT id, migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at ASC;').catch(() => [])

    console.log(JSON.stringify({
      version: versionResult[0]?.version,
      database: dbNameResult[0]?.current_database,
      size: dbSizeResult[0]?.size,
      tables: tableStats,
      migrations: migrations
    }, (key, value) => typeof value === 'bigint' ? value.toString() : value, 2))
  } catch (err) {
    console.error('Inventory error:', err)
  } finally {
    await prisma.$disconnect()
  }
}

main()
