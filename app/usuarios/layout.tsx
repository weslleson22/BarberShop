import Navigation from '@/components/Navigation'

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
