export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex-1">
      <div className="p-6">
        {children}
      </div>
    </div>
  )
}
