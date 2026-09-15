import { NextResponse } from 'next/server'

// POST - Encerrar sessão. O cookie 'auth-token' é httpOnly, então só o
// servidor pode limpá-lo — o frontend não consegue mais fazer isso via
// document.cookie (por isso este endpoint existe).
export async function POST() {
  const response = NextResponse.json({ message: 'Logout realizado com sucesso' })
  response.cookies.set('auth-token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  })
  return response
}
