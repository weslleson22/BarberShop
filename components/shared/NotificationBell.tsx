'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Bell, Check, Loader2, RefreshCw, Trash2, CheckCheck } from 'lucide-react'
import { getAuthHeaders } from '@/lib/utils'

interface Notification {
  id: string
  title: string
  message: string
  read: boolean
  createdAt: string
}

const POLL_INTERVAL_MS = 10 * 1000

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'all' | 'unread'>('all')
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
    // Atualização otimista
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    setUnreadCount((prev) => Math.max(0, prev - 1))
    try {
      const res = await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({ read: true }),
      })
      if (!res.ok) {
        console.error('Falha ao marcar notificação como lida no servidor:', res.status)
        fetchNotifications()
      }
    } catch (err) {
      console.error('Erro de conexão ao marcar notificação:', err)
      fetchNotifications()
    }
  }

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)
    try {
      const res = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({ read: true }),
      })
      if (!res.ok) {
        console.error('Falha ao marcar todas como lidas no servidor:', res.status)
        fetchNotifications()
      }
    } catch (err) {
      console.error('Erro de conexão ao marcar todas:', err)
      fetchNotifications()
    }
  }

  const clearReadNotifications = async () => {
    setNotifications((prev) => prev.filter((n) => !n.read))
    try {
      const res = await fetch('/api/notifications', {
        method: 'DELETE',
        headers: getAuthHeaders(),
        credentials: 'include',
      })
      if (!res.ok) {
        fetchNotifications()
      }
    } catch (err) {
      console.error('Erro ao limpar lidas:', err)
      fetchNotifications()
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

  const displayedNotifications = activeTab === 'unread'
    ? notifications.filter((n) => !n.read)
    : notifications

  const hasReadNotifications = notifications.some((n) => n.read)

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
            <div className="flex items-center gap-1.5">
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
                  title="Marcar todas como lidas"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Marcar</span> lidas
                </button>
              )}
              {hasReadNotifications && (
                <button
                  onClick={clearReadNotifications}
                  className="text-gray-400 hover:text-red-400 p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                  title="Limpar lidas"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex border-b border-white/10 bg-gray-900/70 px-2 pt-1">
            <button
              onClick={() => setActiveTab('all')}
              className={`flex-1 py-1.5 text-xs font-semibold text-center border-b-2 transition-colors ${
                activeTab === 'all'
                  ? 'text-yellow-400 border-yellow-400'
                  : 'text-gray-400 border-transparent hover:text-gray-200'
              }`}
            >
              Todas ({notifications.length})
            </button>
            <button
              onClick={() => setActiveTab('unread')}
              className={`flex-1 py-1.5 text-xs font-semibold text-center border-b-2 transition-colors ${
                activeTab === 'unread'
                  ? 'text-yellow-400 border-yellow-400'
                  : 'text-gray-400 border-transparent hover:text-gray-200'
              }`}
            >
              Não lidas ({unreadCount})
            </button>
          </div>

          {/* List com Scrollview funcional */}
          <div className="max-h-[380px] overflow-y-auto overscroll-contain divide-y divide-gray-800/80 bg-gray-950">
            {loading && notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4">
                <Loader2 className="w-7 h-7 text-yellow-400 animate-spin mb-2" />
                <p className="text-gray-300 text-xs font-medium">Carregando notificações...</p>
              </div>
            ) : displayedNotifications.length === 0 ? (
              <div className="text-center py-10 px-4 bg-gray-950">
                <div className="w-12 h-12 rounded-full bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center mx-auto mb-3">
                  <Bell className="w-6 h-6 text-yellow-400" />
                </div>
                <p className="text-white text-sm font-semibold">
                  {activeTab === 'unread' ? 'Nenhuma não lida' : 'Nenhuma notificação'}
                </p>
                <p className="text-gray-300 text-xs mt-1">
                  {activeTab === 'unread' 
                    ? 'Você já visualizou todas as suas notificações.' 
                    : 'Você está com tudo em dia por aqui.'}
                </p>
              </div>
            ) : (
              displayedNotifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => !n.read && markAsRead(n.id)}
                  className={`w-full text-left px-4 py-3.5 transition-all cursor-pointer ${
                    n.read 
                      ? 'bg-gray-950/90 hover:bg-gray-900 border-l-4 border-transparent opacity-75' 
                      : 'bg-yellow-950/40 hover:bg-yellow-950/60 border-l-4 border-yellow-400 opacity-100'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm ${n.read ? 'font-medium text-gray-300' : 'font-bold text-yellow-300'}`}>
                      {n.title}
                    </p>
                    {!n.read && (
                      <span className="w-2.5 h-2.5 mt-1 rounded-full bg-yellow-400 shadow-sm shadow-yellow-400 flex-shrink-0 animate-pulse" />
                    )}
                  </div>
                  <p className={`text-xs mt-1.5 leading-relaxed ${n.read ? 'text-gray-400' : 'text-white font-medium'}`}>
                    {n.message}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <p className={`text-[11px] font-medium ${n.read ? 'text-gray-500' : 'text-yellow-400/90'}`}>
                      {formatRelative(n.createdAt)}
                    </p>
                    {!n.read && (
                      <span className="text-[10px] text-yellow-400/80 hover:text-yellow-300 font-semibold">
                        Clique para marcar como lida
                      </span>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
