import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser } from '@/lib/api-auth'
import { resolvePublicTenant } from '@/lib/tenant'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET - Buscar cliente por telefone (público)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const phone = searchParams.get('phone')
    let identifier = searchParams.get('slug') || searchParams.get('barbershopId')

    const authUser = getAuthUser(request)
    if (!identifier && authUser?.barbershopId) {
      identifier = authUser.barbershopId
    }

    const tenantResult = await resolvePublicTenant(identifier)
    if (!tenantResult.success) {
      return NextResponse.json({ error: tenantResult.error }, { status: tenantResult.status })
    }

    const barbershopId = tenantResult.tenant.id

    // Bloqueio de segurança: NUNCA listar todos os clientes de forma pública
    if (!phone) {
      return NextResponse.json(
        { error: 'Telefone é obrigatório para consulta pública de cliente' },
        { status: 400 }
      )
    }

    const clients = await prisma.client.findMany({
      where: {
        phone: phone.trim(),
        barbershopId,
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        isVip: true,
        barbershopId: true,
      },
    })

    return NextResponse.json(clients)
  } catch (error) {
    console.error('Get client error:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar cliente' },
      { status: 500 }
    )
  }
}

// POST - Criar cliente (público)
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { name, phone, email, isVip, slug, barbershopId: bodyShopId } = data
    const authUser = getAuthUser(request)
    // NUNCA aceitar userId enviado no corpo por chamadas não autenticadas!
    // Apenas a sessão autenticada pode vincular um usuário.
    const finalUserId = authUser?.id || null

    console.log('Dados recebidos para criar cliente:', { name, phone, email, isVip })

    if (!name || !phone) {
      return NextResponse.json(
        { error: 'Nome e telefone são obrigatórios' },
        { status: 400 }
      )
    }

    let identifier = slug || bodyShopId || null
    if (!identifier && authUser?.barbershopId) {
      identifier = authUser.barbershopId
    }

    const tenantResult = await resolvePublicTenant(identifier)
    if (!tenantResult.success) {
      return NextResponse.json({ error: tenantResult.error }, { status: tenantResult.status })
    }

    const barbershopId = tenantResult.tenant.id

    // 1. Se o usuário estiver autenticado, priorizar o Client já vinculado ao seu ID NESTA barbearia
    if (finalUserId) {
      const userLinkedClient = await prisma.client.findFirst({
        where: { userId: finalUserId, barbershopId }
      })
      if (userLinkedClient) {
        // Atualiza telefone e nome se foram preenchidos
        const updated = await prisma.client.update({
          where: { id: userLinkedClient.id },
          data: {
            name: name || userLinkedClient.name,
            phone: phone || userLinkedClient.phone,
            email: email || userLinkedClient.email,
          }
        })
        console.log('Usando Client vinculado ao usuário autenticado:', updated.id)
        return NextResponse.json(updated)
      }
    }

    // 2. Verificar se existe cliente com o mesmo email sem userId
    if (email && email.trim()) {
      const existingByEmail = await prisma.client.findFirst({
        where: {
          email: email.trim().toLowerCase(),
          barbershopId,
        }
      })
      if (existingByEmail) {
        if (!existingByEmail.userId && finalUserId) {
          await prisma.client.update({
            where: { id: existingByEmail.id },
            data: { userId: finalUserId, name: name || existingByEmail.name, phone: phone || existingByEmail.phone }
          })
          existingByEmail.userId = finalUserId
        }
        return NextResponse.json(existingByEmail)
      }
    }

    // 3. Verificar se cliente já existe pelo telefone
    console.log('Verificando cliente existente com telefone:', phone)
    const existingClient = await prisma.client.findFirst({
      where: {
        phone: phone,
        barbershopId
      }
    })

    console.log('Cliente existente encontrado:', existingClient)

    if (existingClient) {
      // Se não tem userId vinculado e temos um usuário logado, vincula a ele
      if (!existingClient.userId && finalUserId) {
        await prisma.client.update({
          where: { id: existingClient.id },
          data: { userId: finalUserId },
        })
        existingClient.userId = finalUserId
        return NextResponse.json(existingClient)
      }
      
      // Se já está vinculado a OUTRO usuário e o usuário atual está autenticado,
      // não repassar o Client de outra pessoa. Criar um novo exclusivo para este usuário.
      if (existingClient.userId && finalUserId && existingClient.userId !== finalUserId) {
        console.log('Telefone pertence a outro usuário cadastrado; criando Client novo para este usuário')
      } else {
        console.log('Retornando cliente existente:', existingClient)
        return NextResponse.json(existingClient)
      }
    }

    // Criar novo cliente
    console.log('Criando novo cliente com dados:', { name, phone, email, userId: finalUserId, isVip })
    const client = await prisma.client.create({
      data: {
        name,
        phone,
        email: email || null,
        isVip: Boolean(isVip),
        barbershopId,
        userId: finalUserId || null,
      }
    })

    console.log('Cliente criado com sucesso:', client)
    return NextResponse.json(client, { status: 201 })
  } catch (error) {
    console.error('Create client error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao criar cliente' },
      { status: 500 }
    )
  }
}
