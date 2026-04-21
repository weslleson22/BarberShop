import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

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
    const { name, phone, avatar } = data

    // Atualizar usuário no banco
    const updatedUser = await prisma.user.update({
      where: {
        id: decoded.id,
        barbershopId: decoded.barbershopId
      },
      data: {
        name,
        avatar
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatar: true,
        barbershopId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar perfil' },
      { status: 500 }
    )
  }
}
