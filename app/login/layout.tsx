import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Entrar na Conta | Agendamentos Online',
  description: 'Acesse sua conta para agendar serviços, acompanhar horários e gerenciar seus agendamentos com rapidez.',
}

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
