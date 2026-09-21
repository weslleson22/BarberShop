import { NextRequest, NextResponse } from 'next/server'
import { createUser, createBarbershop } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, ...data } = body

    // Fluxo de Cadastro de Estabelecimento / Tenant (página /register pública)
    const isEstablishmentRegistration =
      type === 'barbershop' ||
      !!data.barbershopName ||
      !!data.establishmentName ||
      (!!data.adminEmail && (!!data.name || !!data.barbershopName))

    if (isEstablishmentRegistration) {
      const shopName = (data.establishmentName || data.barbershopName || data.name || '').trim()
      const shopEmail = (data.establishmentEmail || data.barbershopEmail || data.email || '').trim()
      const shopPhone = (data.establishmentPhone || data.barbershopPhone || data.phone || '').trim()
      const shopAddress = (data.establishmentAddress || data.barbershopAddress || data.address || '').trim()

      const adminName = (data.adminName || (data.adminUser && data.adminUser.name) || '').trim()
      const adminEmail = (data.adminEmail || (data.adminUser && data.adminUser.email) || '').trim()
      const adminPhone = (data.adminPhone || (data.adminUser && data.adminUser.phone) || '').trim()
      const adminPassword = (data.password || (data.adminUser && data.adminUser.password) || '').trim()

      // Validação rigorosa: todos os campos do estabelecimento e do administrador são obrigatórios
      if (!shopName || !shopEmail || !shopPhone || !shopAddress) {
        return NextResponse.json(
          { error: 'Todos os dados do estabelecimento (Nome, E-mail comercial, Telefone e Endereço) são obrigatórios.' },
          { status: 400 }
        )
      }

      if (!adminName || !adminEmail || !adminPhone || !adminPassword) {
        return NextResponse.json(
          { error: 'Todos os dados do administrador (Nome, E-mail de acesso, Telefone e Senha) são obrigatórios.' },
          { status: 400 }
        )
      }

      if (adminPassword.length < 6) {
        return NextResponse.json(
          { error: 'A senha deve ter pelo menos 6 caracteres.' },
          { status: 400 }
        )
      }

      // Criar nova barbearia com status PENDING e isActive: false
      const result = await createBarbershop({
        name: shopName,
        email: shopEmail,
        phone: shopPhone,
        address: shopAddress,
        status: 'PENDING',
        isActive: false,
        adminUser: {
          name: adminName,
          email: adminEmail,
          password: adminPassword,
          phone: adminPhone,
          isActive: false,
        },
      })

      // NÃO define cookie de autenticação, pois a conta está aguardando aprovação
      return NextResponse.json({
        success: true,
        status: 'PENDING',
        message: 'Cadastro realizado com sucesso! Sua solicitação de acesso está aguardando aprovação pelo desenvolvedor.',
        barbershop: {
          id: result.barbershop.id,
          name: result.barbershop.name,
          email: result.barbershop.email,
        },
      })
    } else {
      // Criar cliente regular — NUNCA permitir escalada de privilégios via payload público
      if (!data.name || !data.email || !data.password) {
        return NextResponse.json(
          { error: 'Nome, email e senha são obrigatórios' },
          { status: 400 }
        )
      }

      const result = await createUser({
        name: data.name,
        email: data.email,
        password: data.password,
        phone: data.phone,
        barbershopId: data.barbershopId || null,
        role: 'CLIENT',
      })

      const response = NextResponse.json(result)
      response.cookies.set('auth-token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
      })

      return response
    }
  } catch (error) {
    console.error('Register error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao criar conta' },
      { status: 400 }
    )
  }
}
