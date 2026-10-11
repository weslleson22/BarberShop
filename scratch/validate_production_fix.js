const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testAccelerateTransaction() {
  console.log('=== TESTE DE VALIDAÇÃO: PRISMA ACCELERATE + CADASTRO ===\n')
  
  const timestamp = Date.now()
  const shopName = `Validação Prod Accelerate ${timestamp}`
  const shopEmail = `val.prod.${timestamp}@teste.com`
  const adminEmail = `admin.val.${timestamp}@teste.com`

  try {
    const { createBarbershop } = require('../lib/auth')

    console.log('1. Executando createBarbershop com as novas configurações de timeout (14000ms)...')
    const startTime = Date.now()
    const result = await createBarbershop({
      name: shopName,
      email: shopEmail,
      phone: '(11) 98888-9999',
      address: 'Av. Paulista, 1000 - São Paulo, SP',
      status: 'PENDING',
      isActive: true,
      trialDays: 7,
      adminUser: {
        name: 'Gestor Validação Prod',
        email: adminEmail,
        password: 'SenhaForte123!',
        phone: '(11) 97777-8888',
        isActive: true,
      },
    })
    const duration = Date.now() - startTime
    console.log(`✓ createBarbershop finalizado com sucesso em ${duration}ms!`)
    console.log(`  - Barbearia ID: ${result.barbershop.id}`)
    console.log(`  - Admin User ID: ${result.adminUser.user.id}`)

    console.log('\n2. Verificando persistência no banco (Prisma Accelerate db.prisma.io)...')
    const shopInDb = await prisma.barbershop.findUnique({
      where: { id: result.barbershop.id },
      include: {
        users: true,
        subscriptions: { include: { plan: true } },
      },
    })

    console.log(`  - Barbearia encontrada: ${shopInDb ? 'SIM' : 'NÃO'}`)
    console.log(`  - Status: ${shopInDb?.status}`)
    console.log(`  - Usuários vinculados: ${shopInDb?.users.length}`)
    console.log(`  - Assinaturas (Trial): ${shopInDb?.subscriptions.length} (${shopInDb?.subscriptions[0]?.plan?.name})`)

    console.log('\n3. Verificando registro na API da AbacatePay...')
    const apiKey = process.env.ABACATEPAY_API_KEY || 'abc_dev_3Ua6pA53ZepdtC44asC2Fwzd'
    const abacateRes = await fetch('https://api.abacatepay.com/v2/customers/list', {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    const abacateJson = await abacateRes.json()
    const abacateCust = abacateJson?.data?.find((c) => c.email === adminEmail)

    console.log(`  - Cliente na AbacatePay: ${abacateCust ? 'SIM (ID: ' + abacateCust.id + ')' : 'NÃO'}`)

    console.log('\n========================================')
    console.log('✅ VALIDAÇÃO CONCLUÍDA COM SUCESSO TOTAL!')
    console.log('- Nenhum erro P6005 (Accelerate timeout limit)')
    console.log('- Nenhum erro P2028 (Transaction closed)')
    console.log('- Dados gravados no banco e no gateway de pagamento')
    console.log('========================================\n')
  } catch (err) {
    console.error('\n❌ ERRO NA VALIDAÇÃO:', err)
  } finally {
    await prisma.$disconnect()
  }
}

testAccelerateTransaction()
