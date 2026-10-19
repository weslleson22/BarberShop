import { NextRequest, NextResponse } from 'next/server'
import { createUser, createBarbershop } from '@/lib/auth'
import { createAuditLog, extractRequestContext } from '@/lib/audit-log'
import { AuditAction, AuditEntity } from '@prisma/client'
import { notifyNewRegistration, sendCompanyWelcomeEmail } from '@/lib/external-notifications'

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

      // Criar nova barbearia com acesso total imediato e período de trial de 7 dias
      const trialDays = 7
      const trialEndsAt = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000)

      const result = await createBarbershop({
        name: shopName,
        email: shopEmail,
        phone: shopPhone,
        address: shopAddress,
        status: 'PENDING', // Marcado como homologação/aguardando aprovação
        isActive: true, // Ativo durante os 7 dias de trial
        trialDays,
        trialEndsAt,
        adminUser: {
          name: adminName,
          email: adminEmail,
          password: adminPassword,
          phone: adminPhone,
          isActive: true, // Administrador com acesso imediato
        },
      })

      const ctx = extractRequestContext(request)
      await createAuditLog({
        userId: result.adminUser.user.id,
        barbershopId: result.barbershop.id,
        action: AuditAction.BARBERSHOP_CREATED,
        entity: AuditEntity.BARBERSHOP,
        entityId: result.barbershop.id,
        metadata: {
          barbershopName: result.barbershop.name,
          email: result.barbershop.email,
          status: 'PENDING',
          trialEndsAt: trialEndsAt.toISOString(),
          trialDays: 7,
          source: 'public_registration',
        },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      })

      // Notificação externa integrada (Telegram / Email)
      try {
        await notifyNewRegistration({
          type: 'COMPANY',
          name: result.adminUser.user.name,
          email: result.adminUser.user.email,
          role: 'ADMIN (Proprietário)',
          phone: result.adminUser.user.phone,
          barbershopName: result.barbershop.name,
          barbershopEmail: result.barbershop.email,
          barbershopPhone: result.barbershop.phone,
          barbershopAddress: result.barbershop.address,
          barbershopSlug: result.barbershop.slug,
          isTrial: true,
          trialDays: 7,
          trialEndsAt: trialEndsAt.toISOString(),
          origin: 'Cadastro Público de Empresa (/register)',
          ipAddress: ctx.ipAddress,
          userAgent: ctx.userAgent,
        })
      } catch (notifErr) {
        console.warn('Failed to send new barbershop notification:', notifErr)
      }

      // E-mail caloroso de boas-vindas com orientações, links essenciais e suporte para o novo cliente
      try {
        const origin =
          request.headers.get('origin') ||
          (request.headers.get('referer') ? new URL(request.headers.get('referer')!).origin : null) ||
          process.env.NEXTAUTH_URL ||
          process.env.NEXT_PUBLIC_APP_URL ||
          'http://localhost:3000'

        await sendCompanyWelcomeEmail({
          companyName: result.barbershop.name,
          adminName: result.adminUser.user.name,
          adminEmail: result.adminUser.user.email,
          slug: result.barbershop.slug,
          trialDays: 7,
          trialEndsAt: trialEndsAt,
          baseUrl: origin,
        })
      } catch (welcomeErr) {
        console.warn('Failed to dispatch company welcome email:', welcomeErr)
      }

      // Concede acesso total imediato e define cookie de autenticação
      const response = NextResponse.json({
        success: true,
        status: 'PENDING',
        message: 'Cadastro realizado com sucesso! Você recebeu 7 dias de acesso completo para testar a plataforma.',
        token: result.adminUser.token,
        user: result.adminUser.user,
        barbershop: {
          id: result.barbershop.id,
          name: result.barbershop.name,
          email: result.barbershop.email,
          status: result.barbershop.status,
          trialEndsAt: result.barbershop.trialEndsAt,
        },
        redirectTo: '/dashboard',
      })

      response.cookies.set('auth-token', result.adminUser.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
      })

      return response
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

      const ctx = extractRequestContext(request)
      await createAuditLog({
        userId: result.user.id,
        barbershopId: result.user.barbershopId,
        action: AuditAction.CLIENT_CREATED,
        entity: AuditEntity.CLIENT,
        entityId: result.user.id,
        metadata: {
          name: result.user.name,
          email: result.user.email,
          source: 'public_registration',
        },
        ipAddress: ctx.ipAddress,
        userAgent: ctx.userAgent,
      })

      // Notificação externa integrada (Telegram / Email)
      try {
        await notifyNewRegistration({
          type: 'CLIENT',
          name: result.user.name,
          email: result.user.email,
          role: 'CLIENT',
          phone: result.user.phone,
          origin: 'Cadastro Público (/register)',
          ipAddress: ctx.ipAddress,
          userAgent: ctx.userAgent,
        })
      } catch (notifErr) {
        console.warn('Failed to send new client notification:', notifErr)
      }

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
