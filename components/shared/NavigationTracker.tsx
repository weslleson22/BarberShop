'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
function getLocalAuthHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
    return {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...extraHeaders,
    }
  } catch {
    return extraHeaders
  }
}

/**
 * Componente silencioso de telemetria e rastreamento de navegação.
 * Monitora transições de rota e registra consultas e erros no AuditLog.
 */
export function NavigationTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const lastPathRef = useRef<string>('')

  // Rastreia navegação de rotas
  useEffect(() => {
    if (!pathname) return
    const queryString = searchParams?.toString()
    const fullPath = queryString ? `${pathname}?${queryString}` : pathname

    // Não registra repetições consecutivas da mesma rota ou páginas internas de telemetria
    if (
      fullPath === lastPathRef.current ||
      fullPath.startsWith('/api/audit') ||
      fullPath.startsWith('/api/developer/audit-logs')
    ) {
      return
    }

    lastPathRef.current = fullPath

    // Aguarda que a página carregue completamente antes de despachar telemetria em background
    const timer = setTimeout(() => {
      const scheduleTelemetry = () => {
        try {
          fetch('/api/audit/navigation', {
            method: 'POST',
            headers: getLocalAuthHeaders({ 'Content-Type': 'application/json' }),
            body: JSON.stringify({
              path: fullPath,
              title: typeof document !== 'undefined' ? document.title : '',
              referrer: typeof document !== 'undefined' ? document.referrer : '',
            }),
            credentials: 'include',
            keepalive: true,
          }).catch(() => {
            // Falha silenciosa de telemetria
          })
        } catch {
          // Ignora
        }
      }

      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        (window as any).requestIdleCallback(scheduleTelemetry, { timeout: 2000 })
      } else {
        scheduleTelemetry()
      }
    }, 1500)

    return () => clearTimeout(timer)
  }, [pathname, searchParams])

  // Rastreia erros não tratados do cliente
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleError = (event: ErrorEvent) => {
      // Ignora erros de extensões de navegador
      if (event.filename && !event.filename.includes(window.location.origin)) {
        return
      }

      try {
        fetch('/api/audit/error', {
          method: 'POST',
          headers: getLocalAuthHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            path: window.location.pathname,
            message: event.message || 'Erro de execução do cliente',
            stack: event.error?.stack || null,
            statusCode: 500,
          }),
          credentials: 'include',
          keepalive: true,
        }).catch(() => {})
      } catch {}
    }

    const handleRejection = (event: PromiseRejectionEvent) => {
      try {
        const reason = event.reason
        const message = reason instanceof Error ? reason.message : String(reason || 'Promise rejeitada')
        fetch('/api/audit/error', {
          method: 'POST',
          headers: getLocalAuthHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            path: window.location.pathname,
            message: `Unhandled Rejection: ${message}`,
            stack: reason instanceof Error ? reason.stack : null,
            statusCode: 500,
          }),
          credentials: 'include',
          keepalive: true,
        }).catch(() => {})
      } catch {}
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleRejection)

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleRejection)
    }
  }, [])

  return null
}

export default NavigationTracker
