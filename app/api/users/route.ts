import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hashPassword } from '@/lib/auth'

// GET - Listar usuários
export async function GET(request: NextRequest) {
  try {
    console.log('=== API DE USUÁRIOS - INICIANDO BUSCA ===')
    
    // Exatamente como no script de verificação que funcionou
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        barbershopId: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: {
        name: 'asc',
      },
    })

    console.log('Query executada com sucesso!')
    console.log('TOTAL de usuários encontrados:', users.length)
    console.log('Usuários encontrados:', users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      barbershopId: u.barbershopId,
      isActive: u.isActive
    })))

    return NextResponse.json(users)
  } catch (error) {
    console.error('Get users error:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar usuários' },
      { status: 500 }
    )
  }
}

// POST - Criar usuário
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const { name, email, phone, role, password, isActive } = data

    console.log('Dados recebidos para criar usuário:', { name, email, phone, role, isActive })

    if (!name || !email || !role || !password) {
      return NextResponse.json(
        { error: 'Nome, email, papel e senha são obrigatórios' },
        { status: 400 }
      )
    }

    // Verificar se usuário já existe (verificação global de email)
    const existingUser = await prisma.user.findFirst({
      where: {
        email: email
      }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Já existe um usuário com este email' },
        { status: 400 }
      )
    }

    // Criptografar senha usando bcrypt
    const hashedPassword = await hashPassword(password)

    // Criar novo usuário
    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone: phone || null,
        role,
        password: hashedPassword,
        isActive: isActive !== undefined ? isActive : true,
        barbershopId: 'cmo6dajse0000tlnihesqqda8'
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        isActive: true,
        createdAt: true,
        barbershopId: true,
      }
    })

    console.log('Usuário criado com sucesso:', user)
    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    console.error('Create user error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao criar usuário' },
      { status: 500 }
    )
  }
}

// PUT - Atualizar usuário
export async function PUT(request: NextRequest) {
  try {
    const data = await request.json()
    const { id, name, email, phone, role, password, isActive } = data

    console.log('Dados recebidos para atualizar usuário:', { id, name, email, phone, role, isActive })

    if (!id) {
      return NextResponse.json(
        { error: 'ID do usuário é obrigatório' },
        { status: 400 }
      )
    }

    // Verificar se usuário existe (sem filtro de barbershopId)
    const existingUser = await prisma.user.findUnique({
      where: {
        id: id
      }
    })

    console.log('Usuário encontrado para atualização:', existingUser)

    if (!existingUser) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    // Preparar dados de atualização
    const updateData: any = {
      name,
      email,
      phone: phone || null,
      role,
      isActive,
    }

    // Adicionar senha apenas se fornecida
    if (password) {
      updateData.password = await hashPassword(password)
    }

    // Atualizar usuário
    const user = await prisma.user.update({
      where: { id: id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        isActive: true,
        createdAt: true,
        barbershopId: true,
      }
    })

    console.log('Usuário atualizado com sucesso:', user)
    return NextResponse.json(user)
  } catch (error) {
    console.error('Update user error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao atualizar usuário' },
      { status: 500 }
    )
  }
}

// DELETE - Excluir usuário
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'ID do usuário é obrigatório' },
        { status: 400 }
      )
    }

    console.log('Excluindo usuário com ID:', id)

    // Verificar se usuário existe (sem filtro de barbershopId)
    const existingUser = await prisma.user.findUnique({
      where: {
        id: id
      }
    })

    console.log('Usuário encontrado para exclusão:', existingUser)

    if (!existingUser) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    // Excluir usuário
    await prisma.user.delete({
      where: { id: id }
    })

    console.log('Usuário excluído com sucesso')
    return NextResponse.json({ message: 'Usuário excluído com sucesso' })
  } catch (error) {
    console.error('Delete user error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao excluir usuário' },
      { status: 500 }
    )
  }
}
