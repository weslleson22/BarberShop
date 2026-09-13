/**
 * Responsividade Global - Sistema de Barbeiria
 * 
 * Este arquivo define breakpoints e utilitários de responsividade para todo o sistema.
 * Estratégia: Mobile First com breakpoints consistentes.
 */

import { useState, useEffect } from 'react'

/**
 * Breakpoints definidos em pixels
 * Mobile First: estilos base para mobile, override para telas maiores
 */
export const BREAKPOINTS = {
  // Mobile pequeno (iPhone SE, etc)
  mobileSmall: 320,
  // Mobile padrão (iPhone, Android pequeno)
  mobile: 375,
  // Mobile grande (iPhone Plus, Android médio)
  mobileLarge: 425,
  // Tablet (iPad, Android tablet)
  tablet: 768,
  // Notebook (laptops pequenos)
  notebook: 1024,
  // Desktop padrão
  desktop: 1280,
  // Desktop grande
  desktopLarge: 1440,
  // Ultra wide
  ultraWide: 1920,
} as const

/**
 * Tipos de dispositivo baseados em breakpoints
 */
export type DeviceType = 
  | 'mobileSmall'
  | 'mobile' 
  | 'mobileLarge'
  | 'tablet'
  | 'notebook'
  | 'desktop'
  | 'desktopLarge'
  | 'ultraWide'

/**
 * Detectar tipo de dispositivo baseado na largura da tela
 */
export const getDeviceType = (width: number): DeviceType => {
  if (width < BREAKPOINTS.mobileSmall) return 'mobileSmall'
  if (width < BREAKPOINTS.mobile) return 'mobileSmall'
  if (width < BREAKPOINTS.mobileLarge) return 'mobile'
  if (width < BREAKPOINTS.tablet) return 'mobileLarge'
  if (width < BREAKPOINTS.notebook) return 'tablet'
  if (width < BREAKPOINTS.desktop) return 'notebook'
  if (width < BREAKPOINTS.desktopLarge) return 'desktop'
  if (width < BREAKPOINTS.ultraWide) return 'desktopLarge'
  return 'ultraWide'
}

/**
 * Configurações de Sidebar por dispositivo
 */
export const SIDEBAR_CONFIG = {
  mobileSmall: { width: '100%', collapsed: true },
  mobile: { width: '100%', collapsed: true },
  mobileLarge: { width: '100%', collapsed: true },
  tablet: { width: '280px', collapsed: false },
  notebook: { width: '280px', collapsed: false },
  desktop: { width: '320px', collapsed: false },
  desktopLarge: { width: '320px', collapsed: false },
  ultraWide: { width: '320px', collapsed: false },
} as const

/**
 * Configurações de Grid por dispositivo
 */
export const GRID_CONFIG = {
  mobileSmall: { cols: 1, gap: '1rem' },
  mobile: { cols: 1, gap: '1rem' },
  mobileLarge: { cols: 1, gap: '1.25rem' },
  tablet: { cols: 2, gap: '1.5rem' },
  notebook: { cols: 2, gap: '1.5rem' },
  desktop: { cols: 3, gap: '1.5rem' },
  desktopLarge: { cols: 3, gap: '2rem' },
  ultraWide: { cols: 4, gap: '2rem' },
} as const

/**
 * Configurações de Cards por dispositivo
 */
export const CARD_CONFIG = {
  mobileSmall: { padding: '1rem', fontSize: '0.875rem' },
  mobile: { padding: '1.25rem', fontSize: '0.875rem' },
  mobileLarge: { padding: '1.25rem', fontSize: '0.9375rem' },
  tablet: { padding: '1.5rem', fontSize: '0.9375rem' },
  notebook: { padding: '1.5rem', fontSize: '1rem' },
  desktop: { padding: '1.5rem', fontSize: '1rem' },
  desktopLarge: { padding: '1.75rem', fontSize: '1rem' },
  ultraWide: { padding: '2rem', fontSize: '1.0625rem' },
} as const

/**
 * Configurações de Modal por dispositivo
 */
export const MODAL_CONFIG = {
  mobileSmall: { maxWidth: '100%', padding: '1rem' },
  mobile: { maxWidth: '100%', padding: '1.25rem' },
  mobileLarge: { maxWidth: '95%', padding: '1.25rem' },
  tablet: { maxWidth: '90%', padding: '1.5rem' },
  notebook: { maxWidth: '800px', padding: '1.5rem' },
  desktop: { maxWidth: '800px', padding: '2rem' },
  desktopLarge: { maxWidth: '900px', padding: '2rem' },
  ultraWide: { maxWidth: '1000px', padding: '2.5rem' },
} as const

/**
 * Utilitário para obter classes de grid responsivo
 */
export const getResponsiveGridClasses = () => {
  return {
    base: 'grid',
    mobileSmall: 'grid-cols-1 gap-4',
    mobile: 'grid-cols-1 gap-4',
    mobileLarge: 'grid-cols-1 gap-5',
    tablet: 'grid-cols-2 gap-6',
    notebook: 'grid-cols-2 gap-6',
    desktop: 'grid-cols-3 gap-6',
    desktopLarge: 'grid-cols-3 gap-8',
    ultraWide: 'grid-cols-4 gap-8',
  }
}

/**
 * Utilitário para obter classes de texto responsivo
 */
export const getResponsiveTextClasses = () => {
  return {
    heading: {
      mobileSmall: 'text-xl',
      mobile: 'text-xl',
      mobileLarge: 'text-2xl',
      tablet: 'text-2xl',
      notebook: 'text-3xl',
      desktop: 'text-3xl',
      desktopLarge: 'text-4xl',
      ultraWide: 'text-4xl',
    },
    subheading: {
      mobileSmall: 'text-sm',
      mobile: 'text-sm',
      mobileLarge: 'text-base',
      tablet: 'text-base',
      notebook: 'text-lg',
      desktop: 'text-lg',
      desktopLarge: 'text-xl',
      ultraWide: 'text-xl',
    },
    body: {
      mobileSmall: 'text-xs',
      mobile: 'text-xs',
      mobileLarge: 'text-sm',
      tablet: 'text-sm',
      notebook: 'text-base',
      desktop: 'text-base',
      desktopLarge: 'text-base',
      ultraWide: 'text-lg',
    },
  }
}

/**
 * Hook customizado para detectar breakpoint atual
 * Este hook deve ser usado em componentes React
 */
export const useBreakpoint = () => {
  const [breakpoint, setBreakpoint] = useState<DeviceType>('mobile')
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const handleResize = () => {
      const currentWidth = window.innerWidth
      setWidth(currentWidth)
      setBreakpoint(getDeviceType(currentWidth))
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return { breakpoint, width }
}
