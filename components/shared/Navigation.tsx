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
