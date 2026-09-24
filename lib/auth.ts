import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'
import { ensureClientForUser } from './client-sync'
import type { UserRole } from './roles'

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET is required but not configured in environment variables')
  }
  return secret
}

export interface JWTPayload {
  id: string
  name: string
  email: string
  role: UserRole
  barbershopId?: string | null
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' })
}

export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, getJwtSecret()) as JWTPayload
}

export async function authenticateUser(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      barbershop: {
        select: {
          id: true,
          name: true,
          isActive: true,
          status: true,
        },
      },
    },
  })

  if (!user) {
    return null
  }

  // Se a barbearia associada estiver com status PENDING ou REJECTED (exceto DEVELOPER)
  if (user.barbershop && user.role !== 'DEVELOPER') {
    if (user.barbershop.status === 'PENDING') {
      throw new Error('Cadastro em análise: sua conta está aguardando aprovação pelo desenvolvedor.')
    }
    if (user.barbershop.status === 'REJECTED') {
      throw new Error('Solicitação de cadastro não aprovada.')
    }
  }

  // Se o usuário está desativado, bloqueia acesso
  if (!user.isActive) {
    throw new Error('Conta temporariamente suspensa')
  }

  // Se o usuário pertence a uma barbearia desativada, bloqueia acesso (exceto se for DEVELOPER)
  if (user.barbershop && user.barbershop.isActive === false && user.role !== 'DEVELOPER') {
    throw new Error('Conta temporariamente suspensa')
  }

  const isValidPassword = await verifyPassword(password, user.password)
  if (!isValidPassword) {
    return null
  }

  const token = generateToken({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    barbershopId: user.barbershopId,
  })

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      barbershopId: user.barbershopId,
      phone: user.phone,
      avatar: user.avatar,
      barbershop: user.barbershop,
    },
    token,
  }
}

export async function createUser(data: {
  name: string
  email: string
  password: string
  role: UserRole
  barbershopId?: string | null
  phone?: string
}) {
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  })

  if (existingUser) {
    throw new Error('Usuário já existe')
  }

  // Para roles que não são CLIENT ou DEVELOPER, barbershopId é obrigatório
  if (data.role !== 'CLIENT' && data.role !== 'DEVELOPER' && !data.barbershopId) {
    throw new Error('barbershopId é obrigatório para esta role')
  }

  const hashedPassword = await hashPassword(data.password)

  // Preparar dados para criação
  const createData: any = {
    name: data.name,
    email: data.email,
    password: hashedPassword,
    role: data.role,
  }

  if (data.barbershopId) {
    createData.barbershopId = data.barbershopId
  }

  if (data.phone) {
    createData.phone = data.phone
  }

  const user = await prisma.user.create({
    data: createData,
    include: {
      barbershop: {
        select: {
          id: true,
          name: true,
          isActive: true,
        },
      },
    },
  })

  // Se o novo usuário é um cliente com barbearia associada, garantir registro em Client
  if (user.role === 'CLIENT' && user.barbershopId) {
    try {
      await ensureClientForUser({
        userId: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        barbershopId: user.barbershopId,
      })
    } catch (syncError) {
      console.error('Erro ao vincular Client ao usuário criado:', syncError)
    }
  }

  const token = generateToken({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    barbershopId: user.barbershopId,
  })

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      barbershopId: user.barbershopId,
      phone: user.phone,
      avatar: user.avatar,
      barbershop: user.barbershop,
    },
    token,
  }
}

export async function createBarbershop(data: {
  name: string
  email: string
  phone?: string
  address?: string
  status?: string
  isActive?: boolean
  contractExpiresAt?: Date | string | null
  createdById?: string | null
  adminUser: {
    name: string
    email: string
    password: string
    phone?: string
    isActive?: boolean
  }
}) {
  const existingBarbershop = await prisma.barbershop.findUnique({
    where: { email: data.email },
  })

  if (existingBarbershop) {
    throw new Error('Barbearia já cadastrada com este email')
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: data.adminUser.email },
  })

  if (existingUser) {
    throw new Error('Usuário administrador já existe com este email')
  }

  const hashedPassword = await hashPassword(data.adminUser.password)
  const isShopActive = data.isActive !== undefined ? data.isActive : true
  const isAdminActive = data.adminUser.isActive !== undefined ? data.adminUser.isActive : isShopActive
  const shopStatus = data.status || 'APPROVED'

  return await prisma.$transaction(async (tx) => {
    const barbershop = await tx.barbershop.create({
      data: {
        name: data.name,
        email: data.email,
        phone: data.phone,
        address: data.address,
        status: shopStatus,
        isActive: isShopActive,
        contractExpiresAt: data.contractExpiresAt ? new Date(data.contractExpiresAt) : null,
        createdById: data.createdById || null,
      },
    })

    const user = await tx.user.create({
      data: {
        name: data.adminUser.name,
        email: data.adminUser.email,
        password: hashedPassword,
        role: 'ADMIN',
        barbershopId: barbershop.id,
        phone: data.adminUser.phone,
        isActive: isAdminActive,
      },
      include: {
        barbershop: {
          select: {
            id: true,
            name: true,
            isActive: true,
            status: true,
          },
        },
      },
    })

    const token = generateToken({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      barbershopId: user.barbershopId,
    })

    return {
      barbershop,
      adminUser: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          barbershopId: user.barbershopId,
          phone: user.phone,
          avatar: user.avatar,
          barbershop: user.barbershop,
          isActive: user.isActive,
        },
        token,
      },
    }
  })
}
