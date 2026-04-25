import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function PUT(request: NextRequest) {
  try {
    const { name, email, phone, address, birthDate, bio } = await request.json()

    // Aqui você implementaria a lógica real de atualização
    // Por enquanto, vamos simular uma atualização bem-sucedida
    
    // Em um app real, você faria algo como:
    /*
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name,
        email,
        phone,
        address,
        birthDate: birthDate ? new Date(birthDate) : null,
        bio
      }
    })
    */

    // Simulação de resposta
    const updatedUser = {
      id: '1',
      name,
      email,
      phone,
      address,
      birthDate,
      bio,
      updatedAt: new Date().toISOString()
    }

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar usuário' },
      { status: 500 }
    )
  }
}
