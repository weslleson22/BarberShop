'use client'

import { ReactNode } from 'react'

interface ResponsiveWrapperProps {
  children: ReactNode
  className?: string
  container?: boolean
  safeArea?: boolean
}

/**
 * Wrapper responsivo para garantir consistência em todo o sistema
 * Aplica padding, safe areas e container width de forma consistente
 */
export default function ResponsiveWrapper({
  children,
  className = '',
  container = true,
  safeArea = false,
}: ResponsiveWrapperProps) {
  const baseClasses = container ? 'container-responsive' : ''
  const safeAreaClasses = safeArea ? 'safe-area-top safe-area-bottom' : ''
  
  return (
    <div className={`${baseClasses} ${safeAreaClasses} ${className}`}>
      {children}
    </div>
  )
}
