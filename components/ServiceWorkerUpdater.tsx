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
// Dispositivo que nunca acessou o site = sem SW instalado = busca tudo da
// rede e instala a versão mais recente na hora. Dispositivo que já usou =
// SW antigo, sem nada forçando a checagem/adoção da versão nova. Isso bate
// exatamente com o sintoma relatado.
//
// A correção: checar atualização proativamente (no load e quando a aba
// ganha foco — não em polling agressivo) e, quando o navegador confirma que
// um novo SW assumiu o controle, recarregar a página UMA única vez (nunca
// mais de uma vez por troca real de controller, o que evita loop infinito).
export function ServiceWorkerUpdater() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    // IMPORTANTE: `controllerchange` também dispara na primeiríssima vez que
    // uma página passa a ser controlada por QUALQUER service worker (ou
    // seja, na primeira visita, quando ainda não havia nenhum). Recarregar
    // nesse caso não tem utilidade nenhuma e pode interromper uma ação em
    // andamento do usuário (ex.: um formulário sendo enviado). Só faz
    // sentido recarregar quando já existia um controller ativo ANTES e ele
    // mudou — isso sim é uma troca de versão de verdade.
    const hadControllerOnLoad = !!navigator.serviceWorker.controller
    let reloaded = false
    let registration: ServiceWorkerRegistration | undefined

    const checkForUpdate = () => {
      registration?.update().catch(() => {})
    }

    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        registration = reg

        // Verifica assim que registra e sempre que a aba volta a ficar
        // visível (ex.: usuário volta de outra aba/app) — cobre o caso comum
        // de deixar o app aberto em background por muito tempo, sem depender
        // só da heurística preguiçosa do navegador.
        checkForUpdate()
        document.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'visible') checkForUpdate()
        })
      })
      .catch((error) => {
        console.error('Falha ao registrar o service worker:', error)
      })

    // Quando o SW que está controlando a página muda, recarrega uma única
    // vez — mas só se já havia um controller antes (troca de versão real).
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloaded || !hadControllerOnLoad) return
      reloaded = true
      window.location.reload()
    })
  }, [])

  return null
}
