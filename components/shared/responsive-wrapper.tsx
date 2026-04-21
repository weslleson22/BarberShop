'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Sidebar } from '@/components/shared/sidebar'
import { Header } from '@/components/shared/header'

interface ResponsiveWrapperProps {
  children: React.ReactNode
}

export function ResponsiveWrapper({ children }: ResponsiveWrapperProps) {
  const [isMobile, setIsMobile] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()
  const { user } = useAuth()

  // Pages that should show sidebar
  const sidebarPages = ['/dashboard', '/agenda', '/clientes', '/servicos', '/usuarios', '/financeiro', '/configuracoes']
  const shouldShowSidebar = sidebarPages.some(path => pathname.startsWith(path))

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Close sidebar on mobile when route changes
  useEffect(() => {
    if (isMobile) {
      setSidebarOpen(false)
    }
  }, [pathname])

  // Don't show sidebar on login/register pages
  const noSidebarPages = ['/login', '/register']
  const shouldHideSidebar = noSidebarPages.includes(pathname)

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar - only show on dashboard pages and user is logged in */}
      {shouldShowSidebar && user && !shouldHideSidebar && (
        <>
          <Sidebar />
          {/* Mobile overlay */}
          {isMobile && sidebarOpen && (
            <div 
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}
        </>
      )}

      {/* Main content */}
      <div className={`${shouldShowSidebar && user && !shouldHideSidebar ? 'lg:ml-64' : ''} transition-all duration-300`}>
        {/* Show header on all pages except login/register */}
        {!noSidebarPages && <Header />}

        {/* Page content */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  )
}
