import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

export async function GET(request: NextRequest) {
  try {
    // Verificar token
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    // Decodificar token
    let decoded: any
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret')
    } catch (error) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      )
    }

    // Buscar usuário no banco
    const user = await prisma.user.findUnique({
      where: {
        id: decoded.id,
        barbershopId: decoded.barbershopId
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        phone: true,
        address: true,
        birthDate: true,
        bio: true,
        barbershopId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      )
    }

    // Formatar birthDate para string no formato YYYY-MM-DD
    const formattedUser = {
      ...user,
      birthDate: user.birthDate ? (user.birthDate as Date).toISOString().split('T')[0] : null
    }

    return NextResponse.json(formattedUser)
  } catch (error) {
    console.error('Profile fetch error:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar perfil' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Verificar token
    const token = request.cookies.get('auth-token')?.value
    if (!token) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      )
    }

    // Decodificar token
    let decoded: any
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret')
    } catch (error) {
      return NextResponse.json(
        { error: 'Token inválido' },
        { status: 401 }
      )
    }

    const data = await request.json()
    
    // Construir objeto de atualização apenas com campos fornecidos
    const updateData: any = {}
    
    if (data.name !== undefined) updateData.name = data.name
    if (data.email !== undefined) updateData.email = data.email
    if (data.avatar !== undefined) updateData.avatar = data.avatar
    if (data.phone !== undefined) updateData.phone = data.phone
    if (data.address !== undefined) updateData.address = data.address
    if (data.birthDate !== undefined) updateData.birthDate = data.birthDate ? new Date(data.birthDate) : null
    if (data.bio !== undefined) updateData.bio = data.bio

    // Atualizar usuário no banco apenas com campos alterados
    const updatedUser = await prisma.user.update({
      where: {
        id: decoded.id,
        barbershopId: decoded.barbershopId
      },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        phone: true,
        address: true,
        birthDate: true,
        bio: true,
        barbershopId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    })

    // Formatar birthDate para string no formato YYYY-MM-DD
    const formattedUser = {
      ...updatedUser,
      birthDate: updatedUser.birthDate ? (updatedUser.birthDate as Date).toISOString().split('T')[0] : null
    }

    return NextResponse.json(formattedUser)
  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar perfil' },
      { status: 500 }
    )
  }
}
