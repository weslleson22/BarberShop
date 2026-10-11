const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testRegistration() {
  const timestamp = Date.now()
  const shopEmail = `barbearia.teste.${timestamp}@exemplo.com`
  const adminEmail = `admin.teste.${timestamp}@exemplo.com`
  const shopName = `Barbearia Premium Teste ${timestamp}`

  console.log('--- TESTANDO CADASTRO DE EMPRESA ---')
  console.log(`Empresa: ${shopName}`)
  console.log(`Email Empresa: ${shopEmail}`)
  console.log(`Email Admin: ${adminEmail}`)

  try {
    const res = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'barbershop',
        name: shopName,
        email: shopEmail,
        phone: '(11) 98765-4321',
        address: 'Av. Paulista, 1000 - Bela Vista, São Paulo - SP',
        adminName: 'Gestor Teste Automatizado',
        adminEmail: adminEmail,
        adminPhone: '(11) 91234-5678',
        password: 'SenhaSegura123!',
      }),
    })

    const status = res.status
    const data = await res.json()

    console.log(`\nStatus HTTP: ${status}`)
    console.log('Resposta:', JSON.stringify(data, null, 2))

    if (status !== 200) {
      throw new Error(`Falha no cadastro! Status: ${status}, erro: ${data.error}`)
    }

    const barbershopId = data.barbershop?.id
    const adminId = data.user?.id

    console.log('\n--- VERIFICANDO NO BANCO DE DADOS ---')
    const dbShop = await prisma.barbershop.findUnique({
      where: { id: barbershopId },
      include: {
        subscriptions: {
          include: { plan: true },
        },
        users: true,
      },
    })

    console.log(`Empresa no DB: ${dbShop ? 'SIM (id: ' + dbShop.id + ', status: ' + dbShop.status + ')' : 'NÃO'}`)
    console.log(`Assinatura Trial no DB: ${dbShop?.subscriptions?.length ? 'SIM (status: ' + dbShop.subscriptions[0].status + ', plano: ' + dbShop.subscriptions[0].plan?.name + ')' : 'NÃO'}`)
    console.log(`Admin no DB: ${dbShop?.users?.length ? 'SIM (email: ' + dbShop.users[0].email + ', role: ' + dbShop.users[0].role + ')' : 'NÃO'}`)

    console.log('\n--- VERIFICANDO NA ABACATEPAY ---')
    const apiKey = process.env.ABACATEPAY_API_KEY || 'abc_dev_3Ua6pA53ZepdtC44asC2Fwzd'
    const abacateRes = await fetch('https://api.abacatepay.com/v2/customers/list', {
      headers: { Authorization: `Bearer ${apiKey}` },
    })
    const abacateData = await abacateRes.json()
    const foundInAbacate = abacateData?.data?.find(
      (c) => c.email && c.email.toLowerCase() === adminEmail.toLowerCase()
    )

    console.log(`Cliente encontrado na AbacatePay: ${foundInAbacate ? 'SIM (id: ' + foundInAbacate.id + ', email: ' + foundInAbacate.email + ')' : 'NÃO'}`)

    console.log('\n=== RESULTADO FINAL ===')
    if (dbShop && dbShop.subscriptions?.length > 0 && foundInAbacate) {
      console.log('SUCESSO TOTAL: Empresa e Admin criados no Banco de Dados (com Trial de 7 dias) E sincronizados na AbacatePay!')
    } else {
      console.log('ATENÇÃO: Algum registro não foi confirmado completamente.')
    }
  } catch (err) {
    console.error('ERRO NO TESTE:', err)
  } finally {
    await prisma.$disconnect()
  }
}

testRegistration()
