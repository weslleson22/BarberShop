import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

const JWT_SECRET = process.env.JWT_SECRET || 'fallback-secret'

export interface JWTPayload {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'BARBER' | 'CLIENT'
  barbershopId?: string
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): JWTPayload {
  return jwt.verify(token, JWT_SECRET) as JWTPayload
}

export async function authenticateUser(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      barbershop: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  if (!user || !user.isActive) {
    return null
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
      barbershop: user.barbershop,
    },
    token,
  }
}

export async function createUser(data: {
  name: string
  email: string
  password: string
  role: 'ADMIN' | 'BARBER' | 'CLIENT'
  barbershopId?: string
  phone?: string
}) {
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  })

  if (existingUser) {
    throw new Error('Usuário já existe')
  }

  // Para roles que não são CLIENT, barbershopId é obrigatório
  if (data.role !== 'CLIENT' && !data.barbershopId) {
    throw new Error('barbershopId é obrigatório para esta role')
  }

  const hashedPassword = await hashPassword(data.password)

  // Preparar dados para criação, removendo barbershopId se for undefined
  const createData: any = {
    name: data.name,
    email: data.email,
    password: hashedPassword,
    role: data.role,
  }

  // Adicionar barbershopId apenas se existir
  if (data.barbershopId) {
    createData.barbershopId = data.barbershopId
  }

  // Adicionar phone se existir
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
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      barbershopId: user.barbershopId,
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
  adminUser: {
    name: string
    email: string
    password: string
    phone?: string
  }
}) {
  const existingBarbershop = await prisma.barbershop.findUnique({
    where: { email: data.email },
  })

  if (existingBarbershop) {
    throw new Error('Barbearia já cadastrada')
  }

  const barbershop = await prisma.barbershop.create({
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone,
      address: data.address,
    },
  })

  const adminUser = await createUser({
    name: data.adminUser.name,
    email: data.adminUser.email,
    password: data.adminUser.password,
    role: 'ADMIN',
    barbershopId: barbershop.id,
    phone: data.adminUser.phone,
  })

  return {
    barbershop,
    adminUser,
  }
}
