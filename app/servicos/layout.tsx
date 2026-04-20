import Navigation from '@/components/Navigation'

export default function ServicosLayout({
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
