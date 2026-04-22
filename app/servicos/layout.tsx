import { Navigation } from '@/components/shared/Navigation'

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
