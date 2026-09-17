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
        <div className="absolute top-full right-0 mt-2 w-80 sm:w-96 max-w-[92vw] bg-gray-950 border border-yellow-500/30 rounded-2xl shadow-[0_12px_45px_rgba(0,0,0,0.95)] overflow-hidden z-[100] animate-fadeIn">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-gray-900">
            <div className="flex items-center gap-2">
              <span className="text-white font-bold text-sm tracking-wide">Notificações</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-[11px] font-bold bg-yellow-400 text-black rounded-full shadow-sm">
                  {unreadCount} {unreadCount === 1 ? 'nova' : 'novas'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchNotifications}
                disabled={loading}
                className="text-gray-300 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                title="Atualizar notificações"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-yellow-400' : ''}`} />
              </button>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-yellow-400 hover:text-yellow-300 flex items-center gap-1 font-semibold px-2 py-1 rounded-md hover:bg-yellow-400/10 transition-colors"
                >
                  <Check className="w-3.5 h-3.5" />
                  Marcar lidas
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="max-h-84 overflow-y-auto divide-y divide-gray-800/80 bg-gray-950">
            {loading && notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4">
                <Loader2 className="w-7 h-7 text-yellow-400 animate-spin mb-2" />
                <p className="text-gray-300 text-xs font-medium">Carregando notificações...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-10 px-4 bg-gray-950">
                <div className="w-12 h-12 rounded-full bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center mx-auto mb-3">
                  <Bell className="w-6 h-6 text-yellow-400" />
                </div>
                <p className="text-white text-sm font-semibold">Nenhuma notificação</p>
                <p className="text-gray-300 text-xs mt-1">Você está com tudo em dia por aqui.</p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => !n.read && markAsRead(n.id)}
                  className={`w-full text-left px-4 py-3.5 transition-all cursor-pointer ${
                    n.read 
                      ? 'bg-gray-900/60 hover:bg-gray-800/80 border-l-4 border-transparent' 
                      : 'bg-yellow-950/40 hover:bg-yellow-950/60 border-l-4 border-yellow-400'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm ${n.read ? 'font-medium text-gray-200' : 'font-bold text-yellow-300'}`}>
                      {n.title}
                    </p>
                    {!n.read && (
                      <span className="w-2.5 h-2.5 mt-1 rounded-full bg-yellow-400 shadow-sm shadow-yellow-400 flex-shrink-0 animate-pulse" />
                    )}
                  </div>
                  <p className={`text-xs mt-1.5 leading-relaxed ${n.read ? 'text-gray-300' : 'text-white font-medium'}`}>
                    {n.message}
                  </p>
                  <p className={`text-[11px] mt-2 font-medium ${n.read ? 'text-gray-400' : 'text-yellow-400/90'}`}>
                    {formatRelative(n.createdAt)}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
