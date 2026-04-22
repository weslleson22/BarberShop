import { Navigation } from '@/components/shared/Navigation'

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
