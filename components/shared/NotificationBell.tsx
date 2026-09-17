'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Bell, Check, Loader2, RefreshCw } from 'lucide-react'

interface Notification {
  id: string
  title: string
  message: string
  read: boolean
  createdAt: string
}

const POLL_INTERVAL_MS = 10 * 1000

function getAuthHeaders(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
  const headers: Record<string, string> = {}
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  return headers
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/notifications', {
        headers: getAuthHeaders(),
        credentials: 'include',
      })
      if (!res.ok) {
        console.warn('Falha ao buscar notificações:', res.status)
        return
      }
      const data = await res.json()
      setNotifications(Array.isArray(data.notifications) ? data.notifications : [])
      setUnreadCount(typeof data.unreadCount === 'number' ? data.unreadCount : 0)
    } catch (err) {
      console.error('Erro ao buscar notificações:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, POLL_INTERVAL_MS)

    const handleRefresh = () => {
      fetchNotifications()
    }
    window.addEventListener('notification-refresh', handleRefresh)

    let bc: BroadcastChannel | null = null
    try {
      bc = new BroadcastChannel('barbershop-notifications')
      bc.onmessage = () => {
        fetchNotifications()
      }
    } catch {
      // BroadcastChannel não suportado em ambientes restritos
    }

    return () => {
      clearInterval(interval)
      window.removeEventListener('notification-refresh', handleRefresh)
      if (bc) bc.close()
    }
  }, [fetchNotifications])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleToggle = () => {
    if (!isOpen) {
      fetchNotifications()
    }
    setIsOpen((v) => !v)
  }

  const markAsRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    setUnreadCount((prev) => Math.max(0, prev - 1))
    try {
      await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        credentials: 'include',
      })
    } catch {
      // estado local já foi otimisticamente atualizado
    }
  }

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        credentials: 'include',
      })
    } catch {
      // idem
    }
  }

  const formatRelative = (iso: string) => {
    const date = new Date(iso)
    if (isNaN(date.getTime())) return ''
    const diffMin = Math.floor((Date.now() - date.getTime()) / 60000)
    if (diffMin < 1) return 'agora'
    if (diffMin < 60) return `${diffMin}min atrás`
    const diffH = Math.floor(diffMin / 60)
    if (diffH < 24) return `${diffH}h atrás`
    return date.toLocaleDateString('pt-BR')
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={handleToggle}
        className="relative p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 hover:border-yellow-400/40 transition-all cursor-pointer flex items-center justify-center"
        aria-label="Notificações"
        title="Notificações"
      >
        <Bell className="w-5 h-5 text-white" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white font-bold text-[10px] rounded-full flex items-center justify-center border-2 border-gray-900 shadow-md animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 sm:w-96 max-w-[90vw] bg-gray-900/98 backdrop-blur-xl border border-white/15 rounded-2xl shadow-2xl overflow-hidden z-[100] animate-fadeIn">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/[0.02]">
            <div className="flex items-center gap-2">
              <span className="text-white font-semibold text-sm">Notificações</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 text-[11px] font-bold bg-yellow-400/20 text-yellow-400 border border-yellow-400/30 rounded-full">
                  {unreadCount} novas
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchNotifications}
                disabled={loading}
                className="text-white/40 hover:text-white/80 p-1 rounded transition-colors"
                title="Atualizar notificações"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-yellow-400 hover:text-yellow-300 flex items-center gap-1 font-medium transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  Marcar lidas
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
            {loading && notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4">
                <Loader2 className="w-6 h-6 text-yellow-400 animate-spin mb-2" />
                <p className="text-white/40 text-xs">Carregando notificações...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-10 px-4">
                <Bell className="w-8 h-8 text-white/20 mx-auto mb-2" />
                <p className="text-white/60 text-sm font-medium">Nenhuma notificação</p>
                <p className="text-white/40 text-xs mt-0.5">Você está com tudo em dia por aqui.</p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => !n.read && markAsRead(n.id)}
                  className={`w-full text-left px-4 py-3 transition-all cursor-pointer ${
                    n.read 
                      ? 'opacity-60 hover:opacity-90 hover:bg-white/5' 
                      : 'bg-yellow-400/5 hover:bg-yellow-400/10 border-l-2 border-yellow-400'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-medium ${n.read ? 'text-white/80' : 'text-white'}`}>{n.title}</p>
                    {!n.read && <span className="w-2 h-2 mt-1.5 rounded-full bg-yellow-400 flex-shrink-0" />}
                  </div>
                  <p className="text-white/60 text-xs mt-1 leading-relaxed">{n.message}</p>
                  <p className="text-white/30 text-[10px] mt-1.5 font-medium">{formatRelative(n.createdAt)}</p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
