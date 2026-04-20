import Navigation from '@/components/Navigation'

export default function ClientesLayout({
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
