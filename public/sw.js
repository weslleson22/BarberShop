const CACHE_NAME = 'agendasaas-pwa-v4'
// Apenas assets estáticos do PWA essenciais para instalação.
// NUNCA incluir '/', rotas HTML ou chunks do Next.js aqui.
const urlsToCache = [
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
]

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache)
      })
      .then(() => self.skipWaiting())
  )
})

// Fetch event
// - Navegações / HTML: SEMPRE buscar da rede diretamente. NUNCA armazenar em cache.
// - Chunks do Next.js / API: NUNCA interceptar ou reter em cache no SW.
// - Apenas ícones e manifest do PWA pré-cacheados são servidos do cache.
self.addEventListener('fetch', (event) => {
  const { request } = event

  // Ignorar chamadas em localhost/dev, APIs, Webpack HMR e extensões
  if (
    request.url.includes('/api/') ||
    request.url.includes('_next/') ||
    request.url.includes('hot-update') ||
    request.url.startsWith('chrome-extension') ||
    self.location.hostname === 'localhost' ||
    self.location.hostname === '127.0.0.1'
  ) {
    return
  }

  // Navegações de página (HTML): sempre da rede, sem nunca gravar em cache
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(
      fetch(request).catch(() => {
        return new Response(
          '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Offline | AgendaSaaS</title></head><body style="margin:0;font-family:system-ui,sans-serif;background:#090D16;color:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;text-align:center;padding:20px;"><div style="background:#0F172A;padding:32px;border-radius:16px;border:1px solid rgba(255,255,255,0.1);max-width:400px;"><h2 style="margin:0 0 12px;color:#38BDF8;">Você está offline</h2><p style="color:#94A3B8;font-size:14px;line-height:1.5;margin:0 0 20px;">Não foi possível carregar a página porque não há conexão com a internet.</p><button onclick="window.location.reload()" style="background:#2563EB;color:#fff;border:none;padding:10px 20px;border-radius:8px;font-weight:600;cursor:pointer;">Tentar Novamente</button></div></body></html>',
          { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
        )
      })
    )
    return
  }

  // Apenas arquivos do PWA presentes em urlsToCache podem usar cache
  const url = new URL(request.url)
  if (urlsToCache.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        return cachedResponse || fetch(request)
      })
    )
  }
})

// Activate event - limpar TODOS os caches antigos (v1, v2, v3, barbershop-*)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Excluindo cache antigo do Service Worker:', cacheName)
            return caches.delete(cacheName)
          }
        })
      )
    }).then(() => self.clients.claim())
  )
})

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync())
  }
})

async function doBackgroundSync() {
  // Handle offline-to-online synchronization
  try {
    const offlineActions = await getOfflineActions()
    
    for (const action of offlineActions) {
      try {
        await fetch(action.url, {
          method: action.method,
          headers: action.headers,
          body: action.body
        })
        
        // Remove successful action from offline storage
        await removeOfflineAction(action.id)
      } catch (error) {
        console.error('Failed to sync action:', error)
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error)
  }
}

// Push notification handler
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : 'Nova notificação',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Ver Detalhes',
        icon: '/icons/icon-96x96.png'
      },
      {
        action: 'close',
        title: 'Fechar',
        icon: '/icons/icon-96x96.png'
      }
    ]
  }

  event.waitUntil(
    self.registration.showNotification('Barbershop Scheduler', options)
  )
})

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    )
  }
})

// Helper functions for offline storage
async function getOfflineActions() {
  // In a real implementation, this would use IndexedDB
  return []
}

async function removeOfflineAction(id) {
  // In a real implementation, this would remove from IndexedDB
  console.log('Removing offline action:', id)
}
