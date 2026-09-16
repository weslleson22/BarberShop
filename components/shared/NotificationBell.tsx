'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Bell, Check } from 'lucide-react'

interface Notification {
  id: string
  title: string
  message: string
  read: boolean
  createdAt: string
}

const POLL_INTERVAL_MS = 60 * 1000

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications')
      if (!res.ok) return
      const data = await res.json()
      setNotifications(Array.isArray(data.notifications) ? data.notifications : [])
      setUnreadCount(typeof data.unreadCount === 'number' ? data.unreadCount : 0)
    } catch {
      // silencioso — o sino simplesmente não atualiza nesta tentativa
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
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

  const markAsRead = async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    setUnreadCount((prev) => Math.max(0, prev - 1))
    try {
      await fetch(`/api/notifications/${id}`, { method: 'PATCH' })
    } catch {
      // estado local já foi otimisticamente atualizado; próxima checagem corrige se falhar
    }
  }

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)
    try {
      await fetch('/api/notifications', { method: 'PATCH' })
    } catch {
      // idem
    }
  }

  const formatRelative = (iso: string) => {
    const date = new Date(iso)
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
        onClick={() => setIsOpen((v) => !v)}
        className="relative p-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 transition-all"
        aria-label="Notificações"
      >
        <Bell className="w-5 h-5 text-white" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-80 max-w-[90vw] bg-gray-900/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <span className="text-white font-medium text-sm">Notificações</span>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-yellow-400 hover:text-yellow-300 flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                Marcar todas como lidas
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="text-white/50 text-sm text-center py-8 px-4">Nenhuma notificação por aqui.</p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => !n.read && markAsRead(n.id)}
                  className={`w-full text-left px-4 py-3 border-b border-white/5 last:border-0 transition-all ${
                    n.read ? 'opacity-60' : 'bg-yellow-400/5 hover:bg-yellow-400/10'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-white text-sm font-medium">{n.title}</p>
                    {!n.read && <span className="w-2 h-2 mt-1.5 rounded-full bg-yellow-400 flex-shrink-0" />}
                  </div>
                  <p className="text-white/60 text-xs mt-0.5">{n.message}</p>
                  <p className="text-white/30 text-xs mt-1">{formatRelative(n.createdAt)}</p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
