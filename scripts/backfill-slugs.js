const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

function slugify(text) {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function generateUniqueSlug(name, shopId) {
  const base = slugify(name) || 'barbearia'
  let candidate = base

  if (candidate.length < 2) {
    candidate = `barbearia-${shopId ? shopId.slice(-6) : Math.random().toString(36).substring(2, 7)}`
  }

  let counter = 1
  while (true) {
    const existing = await prisma.barbershop.findFirst({
      where: {
        slug: candidate,
        ...(shopId ? { id: { not: shopId } } : {}),
      },
      select: { id: true },
    })

    if (!existing) {
      return candidate
    }

    counter++
    candidate = `${base}-${counter}`
  }
}

async function main() {
  console.log('=== VERIFICANDO BARBEARIAS PARA BACKFILL DE SLUG ===\n')

  const shops = await prisma.barbershop.findMany({
    select: { id: true, name: true, slug: true, email: true }
  })

  console.log(`Total de barbearias encontradas: ${shops.length}`)

  let updatedCount = 0

  for (const shop of shops) {
    if (!shop.slug || !shop.slug.trim()) {
      const slug = await generateUniqueSlug(shop.name, shop.id)
      await prisma.barbershop.update({
        where: { id: shop.id },
        data: { slug },
      })
      console.log(`✓ Barbearia "${shop.name}" (${shop.id}) recebeu o slug: "${slug}"`)
      updatedCount++
    } else {
      console.log(`- Barbearia "${shop.name}" já possui o slug: "${shop.slug}"`)
    }
  }

  console.log(`\n=== CONCLUÍDO: ${updatedCount} barbearia(s) atualizadas ===`)
  await prisma.$disconnect()
}

main().catch(err => {
  console.error('Erro:', err)
  process.exit(1)
})
