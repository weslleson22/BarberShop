const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const bcrypt = require('bcryptjs')

async function testRegistrationAndApprovalFlow() {
  console.log('=== TESTE DE FLUXO: REGISTRO PÚBLICO E APROVAÇÃO DEVELOPER ===\n')

  const testShopEmail = `test.shop.${Date.now()}@exemplo.com`
  const testAdminEmail = `test.admin.${Date.now()}@exemplo.com`
  const testPassword = 'Password123!'

  let createdShopId = null
  let createdAdminId = null

  try {
    // 1. Simular chamada de registro público (/api/auth/register)
    console.log('1. Cadastrando novo estabelecimento via fluxo de registro público...')
    const registerPayload = {
      name: 'Barbearia Teste Alpha',
      email: testShopEmail,
      phone: '(11) 98888-7777',
      address: 'Av. Paulista, 1500, Bela Vista, São Paulo - SP',
      adminName: 'Gestor Teste Alpha',
      adminEmail: testAdminEmail,
      adminPhone: '(11) 97777-6666',
      password: testPassword,
    }

    // Usando createBarbershop diretamente com a lógica de rota
    const { createBarbershop, authenticateUser } = require('../lib/auth')
    
    const regResult = await createBarbershop({
      name: registerPayload.name,
      email: registerPayload.email,
      phone: registerPayload.phone,
      address: registerPayload.address,
      status: 'PENDING',
      isActive: false,
      adminUser: {
        name: registerPayload.adminName,
        email: registerPayload.adminEmail,
        password: registerPayload.password,
        phone: registerPayload.adminPhone,
        isActive: false,
      },
    })

    createdShopId = regResult.barbershop.id
    createdAdminId = regResult.adminUser.user.id

    console.log(`✓ Estabelecimento criado com ID: ${createdShopId}`)
    console.log(`✓ Admin criado com ID: ${createdAdminId}`)

    // 2. Verificar estado no Banco de Dados
    console.log('\n2. Verificando estado no banco de dados...')
    const shopInDb = await prisma.barbershop.findUnique({
      where: { id: createdShopId },
      include: { users: { where: { role: 'ADMIN' } } },
    })

    console.log(`   - Status da Barbearia: ${shopInDb.status} (esperado: PENDING)`)
    console.log(`   - Barbearia Ativa: ${shopInDb.isActive} (esperado: false)`)
    console.log(`   - Admin Ativo: ${shopInDb.users[0]?.isActive} (esperado: false)`)

    if (shopInDb.status !== 'PENDING' || shopInDb.isActive !== false || shopInDb.users[0]?.isActive !== false) {
      throw new Error('Falha na validação do estado inicial PENDING!')
    }
    console.log('✓ Estado inicial PENDING e inativo validado com sucesso!')

    // 3. Tentar fazer login antes da aprovação
    console.log('\n3. Tentando login com a conta pendente de aprovação...')
    try {
      await authenticateUser(testAdminEmail, testPassword)
      throw new Error('ERRO CRÍTICO: Login foi permitido em uma conta não aprovada!')
    } catch (loginErr) {
      console.log(`✓ Login bloqueado com mensagem: "${loginErr.message}"`)
      if (!loginErr.message.includes('Cadastro em análise')) {
        throw new Error(`Mensagem incorreta de bloqueio: ${loginErr.message}`)
      }
      console.log('✓ Mensagem correta de cadastro em análise confirmada!')
    }

    // 4. Desenvolvedor analisa e complementa dados, aprovando a unidade
    console.log('\n4. Simulando aprovação pelo DEVELOPER com complementação de dados e contrato...')
    const complementedAddress = 'Av. Paulista, 1500, Conjunto 42, São Paulo - SP'
    const contractExpiration = new Date()
    contractExpiration.setDate(contractExpiration.getDate() + 90) // +90 dias

    // Atualização com aprovação
    await prisma.$transaction(async (tx) => {
      await tx.barbershop.update({
        where: { id: createdShopId },
        data: {
          status: 'APPROVED',
          isActive: true,
          address: complementedAddress,
          contractExpiresAt: contractExpiration,
        },
      })

      await tx.user.updateMany({
        where: { barbershopId: createdShopId, role: 'ADMIN' },
        data: { isActive: true },
      })
    })

    const approvedShop = await prisma.barbershop.findUnique({
      where: { id: createdShopId },
      include: { users: { where: { role: 'ADMIN' } } },
    })

    console.log(`   - Status após aprovação: ${approvedShop.status} (esperado: APPROVED)`)
    console.log(`   - Barbearia Ativa: ${approvedShop.isActive} (esperado: true)`)
    console.log(`   - Endereço complementado: ${approvedShop.address}`)
    console.log(`   - Contrato expira em: ${approvedShop.contractExpiresAt?.toISOString()}`)
    console.log(`   - Admin Ativo: ${approvedShop.users[0]?.isActive} (esperado: true)`)

    if (approvedShop.status !== 'APPROVED' || !approvedShop.isActive || !approvedShop.users[0]?.isActive) {
      throw new Error('Falha na aprovação do estabelecimento!')
    }
    console.log('✓ Aprovação e ativação concluídas com sucesso!')

    // 5. Tentar login novamente agora que foi aprovado
    console.log('\n5. Tentando login agora que a conta foi aprovada...')
    const loginResult = await authenticateUser(testAdminEmail, testPassword)
    if (!loginResult || !loginResult.token) {
      throw new Error('Falha ao autenticar usuário aprovado!')
    }
    console.log(`✓ Login bem-sucedido! Token gerado para o admin: ${loginResult.user.name} (${loginResult.user.email})`)
    console.log(`✓ Barbearia vinculada: ${loginResult.user.barbershop?.name}`)

    console.log('\n=== TODOS OS TESTES PASSARAM COM 100% DE SUCESSO! ===')
  } catch (error) {
    console.error('ERRO NO TESTE:', error)
    process.exitCode = 1
  } finally {
    // Limpeza dos dados de teste
    if (createdAdminId) {
      await prisma.user.deleteMany({ where: { email: testAdminEmail } }).catch(() => {})
    }
    if (createdShopId) {
      await prisma.barbershop.deleteMany({ where: { id: createdShopId } }).catch(() => {})
    }
    await prisma.$disconnect()
  }
}

testRegistrationAndApprovalFlow()
