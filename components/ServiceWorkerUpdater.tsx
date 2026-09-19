'use client'

import { useEffect } from 'react'

// CAUSA RAIZ do "usuário preso na versão antiga depois de um deploy":
//
// O registro do service worker era fire-and-forget (só `register('/sw.js')`
// e nada mais). Isso por si só não é suficiente pra manter o app
// atualizado, porque:
//
// 1. O navegador só verifica se sw.js mudou em navegações reais de
//    documento, e usa uma heurística preguiçosa (no Chrome, no máximo 1x a
//    cada 24h) — sem chamar `registration.update()` explicitamente, um
//    usuário que abre o app e nunca fecha a aba (ou que só navega via
//    client-side routing do Next, que não conta como navegação de
//    documento) pode passar dias sem o navegador sequer checar se existe
//    uma versão nova.
// 2. Mesmo quando o navegador finalmente detecta e instala um SW novo em
//    background, a aba que já está aberta continua sendo controlada pelo SW
//    ANTIGO até uma navegação/reload — sem escutar `controllerchange` e
//    recarregar, o usuário fica "preso" na versão antiga indefinidamente,
//    mesmo com o SW novo já ativo.
//
// A correção: checar atualização proativamente (no load e quando a aba
// ganha foco — não em polling agressivo) e, quando o navegador confirma que
// um novo SW assumiu o controle, recarregar a página UMA única vez (nunca
// mais de uma vez por troca real de controller, o que evita loop infinito).
//
// IMPORTANTE: Em localhost / desenvolvimento, NUNCA registrar o service worker,
// pois ele intercepta chunks do Webpack HMR e causa "TypeError: Cannot read properties
// of undefined (reading 'call')".
export function ServiceWorkerUpdater() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    // Limpar proativamente caches antigos com o prefixo legado 'barbershop-'
    if ('caches' in window) {
      caches.keys().then((keys) => {
        for (const key of keys) {
          if (key.startsWith('barbershop-')) {
            caches.delete(key).catch(() => {})
          }
        }
      }).catch(() => {})
    }

    if (!('serviceWorker' in navigator)) return

    // Em ambiente de desenvolvimento ou localhost/127.0.0.1, desregistrar Service Workers
    // para que nada interfira no Fast Refresh / HMR do Next.js
    const isLocalhost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.startsWith('192.168.') ||
      window.location.hostname.endsWith('.local')

    if (process.env.NODE_ENV !== 'production' || isLocalhost) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister().catch(() => {})
        }
      }).catch(() => {})
      return
    }

    // Em produção: registrar sw.js silenciosamente para fins de PWA/Push,
    // sem disparar window.location.reload() forçado enquanto o usuário navega.
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        // Checar atualização quando a aba voltar a ficar visível
        const checkForUpdate = () => {
          registration.update().catch(() => {})
        }
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') checkForUpdate()
        })
      })
      .catch((error) => {
        console.warn('Falha ao registrar o service worker:', error)
      })
  }, [])

  return null
}

export default ServiceWorkerUpdater
