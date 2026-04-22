import { Navigation } from '@/components/shared/Navigation'

export default function UsuariosLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <Navigation />
      {children}
    </>
  )
}
