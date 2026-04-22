import { Navigation } from '@/components/shared/Navigation'

export default function AgendaLayout({
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
