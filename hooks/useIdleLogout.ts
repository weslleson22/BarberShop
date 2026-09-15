'use client'

import { useEffect, useRef } from 'react'

const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000 // 15 minutos

const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  'mousemove',
  'keydown',
  'click',
  'scroll',
  'touchstart',
]

/**
 * Faz logout automático após um período de inatividade do usuário.
 * Só arma o temporizador enquanto `active` for true (ex: usuário autenticado).
 */
export function useIdleLogout(
  onIdle: () => void,
  active: boolean,
  timeoutMs: number = DEFAULT_TIMEOUT_MS
) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (!active || typeof window === 'undefined') {
      return
    }

    const resetTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      timerRef.current = setTimeout(onIdle, timeoutMs)
    }

    resetTimer()

    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, resetTimer, { passive: true })
    })

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
      }
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(event, resetTimer)
      })
    }
  }, [active, timeoutMs, onIdle])
}
