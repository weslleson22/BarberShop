'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

interface BackButtonProps {
  href?: string
  onClick?: () => void
  children?: React.ReactNode
}

export function BackButton({ href = '/dashboard', onClick, children }: BackButtonProps) {
  const router = useRouter()

  const handleClick = () => {
    if (onClick) {
      onClick()
    } else {
      router.push(href)
    }
  }

  return (
    <button
      onClick={handleClick}
      className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
    >
      <ArrowLeft className="w-4 h-4" />
      <span>{children || 'Voltar'}</span>
    </button>
  )
}

export function Navigation() {
  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <BackButton href="/dashboard">
              Voltar ao Dashboard
            </BackButton>
          </div>
        </div>
      </div>
    </nav>
  )
}
