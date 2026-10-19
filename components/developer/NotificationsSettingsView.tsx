'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import DropdownHeader from '@/components/shared/DropdownHeader'
import { getAuthHeaders } from '@/lib/utils'
import {
  Bell,
  Send,
  Mail,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Save,
  HelpCircle,
  ExternalLink,
  ShieldAlert,
  UserCheck,
  Check,
  Radio,
  Clock,
  Zap,
  Info,
  Eye,
  EyeOff,
  Sliders
} from 'lucide-react'

interface NotificationSettings {
  telegramEnabled: boolean
  telegramBotToken: string
  telegramChatId: string
  emailEnabled: boolean
  emailProvider: 'smtp' | 'resend'
  alertEmailTo: string
  resendApiKey: string
  emailFrom: string
  smtpHost: string
  smtpPort: number
  smtpUser: string
  smtpPass: string
  smtpSecure: boolean
  notifyOnNewRegistration: boolean
  notifyOnPasswordError: boolean
  notifyOnStatusChange: boolean
}

interface SentAlertRecord {
  id: string
  timestamp: string
  channel: 'TELEGRAM' | 'EMAIL' | 'IN_APP' | 'ALL'
  eventType: 'NEW_REGISTRATION' | 'PASSWORD_ERROR' | 'STATUS_CHANGE' | 'TEST'
  title: string
  message: string
  status: 'SUCCESS' | 'FAILED'
  error?: string
}

export function NotificationsSettingsView({
  initialTab = 'all'
}: {
  initialTab?: 'all' | 'telegram' | 'email' | 'history'
}) {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'all' | 'telegram' | 'email' | 'history'>(initialTab)

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab)
    }
  }, [initialTab])

  const handleTabChange = (tab: 'all' | 'telegram' | 'email' | 'history') => {
    setActiveTab(tab)
    if (tab === 'all') router.push('/developer/notifications-settings')
    else if (tab === 'telegram') router.push('/developer/notifications-settings/telegram')
    else if (tab === 'email') router.push('/developer/notifications-settings/email')
    else if (tab === 'history') router.push('/developer/notifications-settings/history')
  }

  const [settings, setSettings] = useState<NotificationSettings>({
    telegramEnabled: true,
    telegramBotToken: '',
    telegramChatId: '',
    emailEnabled: true,
    emailProvider: 'smtp',
    alertEmailTo: '',
    resendApiKey: '',
    emailFrom: 'BarberShop Alertas <notificacoes@barbershop.com>',
    smtpHost: 'smtp.gmail.com',
    smtpPort: 465,
    smtpUser: '',
    smtpPass: '',
    smtpSecure: true,
    notifyOnNewRegistration: true,
    notifyOnPasswordError: true,
    notifyOnStatusChange: true,
  })

  const [recentAlerts, setRecentAlerts] = useState<SentAlertRecord[]>([])
  const [botInfo, setBotInfo] = useState<{ ok: boolean; username?: string; firstName?: string; error?: string } | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testingTelegram, setTestingTelegram] = useState(false)
  const [testingEmail, setTestingEmail] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [showTelegramHelp, setShowTelegramHelp] = useState(false)
  const [showSmtpPass, setShowSmtpPass] = useState(false)

  useEffect(() => {
    if (!authLoading && user && user.role !== 'DEVELOPER' && user.role !== 'ADMIN') {
      router.replace('/dashboard')
    }
  }, [user, authLoading, router])

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/developer/notifications-settings', {
        headers: getAuthHeaders(),
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        if (data.settings) setSettings(data.settings)
        if (data.recentAlerts) setRecentAlerts(data.recentAlerts)
        if (data.botInfo) setBotInfo(data.botInfo)
      }
    } catch {
      setFeedback({ type: 'error', message: 'Erro ao carregar configurações de notificação.' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.role === 'DEVELOPER' || user?.role === 'ADMIN' || process.env.NODE_ENV === 'development') {
      fetchSettings()
    }
  }, [user])

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setFeedback(null)

    try {
      const res = await fetch('/api/developer/notifications-settings', {
        method: 'PUT',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify(settings),
      })

      const data = await res.json()
      if (res.ok) {
        setFeedback({ type: 'success', message: 'Configurações de notificações salvas com sucesso!' })
        if (data.settings) setSettings(data.settings)
      } else {
        setFeedback({ type: 'error', message: data.error || 'Erro ao salvar configurações.' })
      }
    } catch {
      setFeedback({ type: 'error', message: 'Falha de conexão ao salvar configurações.' })
    } finally {
      setSaving(false)
      setTimeout(() => setFeedback(null), 5000)
    }
  }

  const handleTestTelegram = async (channelType: 'TELEGRAM' | 'TEST_COMPANY' | 'TEST_CLIENT' = 'TELEGRAM') => {
    if (!settings.telegramBotToken || !settings.telegramChatId) {
      alert('Preencha o Bot Token e o Chat ID do Telegram antes de testar.')
      return
    }

    setTestingTelegram(true)
    setFeedback(null)

    try {
      const res = await fetch('/api/developer/notifications-settings', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({
          channel: channelType,
          testToken: settings.telegramBotToken,
          testChatId: settings.telegramChatId,
          testEmail: settings.alertEmailTo,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        setFeedback({ type: 'success', message: 'Mensagem enviada ao Telegram com sucesso!' })
        fetchSettings()
      } else {
        setFeedback({ type: 'error', message: `Erro Telegram: ${data.error}` })
      }
    } catch {
      setFeedback({ type: 'error', message: 'Falha ao testar conexão com Telegram.' })
    } finally {
      setTestingTelegram(false)
    }
  }

  const handleTestEmail = async () => {
    if (!settings.alertEmailTo) {
      alert('Informe o e-mail de destino para teste.')
      return
    }

    if (settings.emailProvider === 'smtp' && !settings.smtpPass) {
      alert('Informe a Senha de App do Gmail (16 letras) para testar o envio por SMTP.')
      return
    }

    if (settings.emailProvider === 'resend' && !settings.resendApiKey) {
      alert('Informe a API Key do Resend antes de testar.')
      return
    }

    setTestingEmail(true)
    setFeedback(null)

    try {
      const res = await fetch('/api/developer/notifications-settings', {
        method: 'POST',
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        credentials: 'include',
        body: JSON.stringify({
          channel: 'EMAIL',
          testEmail: settings.alertEmailTo,
          testApiKey: settings.resendApiKey,
          testFrom: settings.emailFrom,
          emailProvider: settings.emailProvider,
          smtpHost: settings.smtpHost,
          smtpPort: settings.smtpPort,
          smtpUser: settings.smtpUser,
          smtpPass: settings.smtpPass,
          smtpSecure: settings.smtpSecure,
        }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setFeedback({ type: 'success', message: data.message || 'E-mail de teste enviado com sucesso!' })
        fetchSettings()
      } else {
        setFeedback({ type: 'error', message: `Erro no envio: ${data.error || 'Falha ao testar e-mail'}` })
      }
    } catch {
      setFeedback({ type: 'error', message: 'Falha ao testar envio de e-mail.' })
    } finally {
      setTestingEmail(false)
    }
  }

  const formatEventBadge = (type: string) => {
    switch (type) {
      case 'NEW_REGISTRATION':
        return <span className="bg-emerald-700 text-white px-2 py-0.5 rounded text-[10px] font-bold">Novo Cadastro</span>
      case 'PASSWORD_ERROR':
        return <span className="bg-red-700 text-white px-2 py-0.5 rounded text-[10px] font-bold">Erro de Senha</span>
      case 'STATUS_CHANGE':
        return <span className="bg-blue-700 text-white px-2 py-0.5 rounded text-[10px] font-bold">Status da Conta</span>
      default:
        return <span className="bg-amber-700 text-white px-2 py-0.5 rounded text-[10px] font-bold">Teste</span>
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <DropdownHeader
        title="Notificações & Alertas Integrados"
        subtitle="Configuração de canais Telegram e E-mail para novos cadastros, falhas de senha e status"
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12 space-y-8">
        {/* Banner de Feedback no Topo */}
        {feedback && (
          <div
            className={`p-4 rounded-xl border-2 flex items-start justify-between ${
              feedback.type === 'success'
                ? 'bg-[#064e3b] border-[#10b981] text-white'
                : 'bg-[#7f1d1d] border-[#ef4444] text-white'
            }`}
          >
            <div className="flex items-start gap-3">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-white" />
              ) : (
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-white" />
              )}
              <div className="text-xs sm:text-sm font-bold whitespace-pre-line leading-relaxed text-white">
                {feedback.message}
              </div>
            </div>
            <button
              onClick={() => setFeedback(null)}
              className="text-xs font-bold text-white shrink-0 ml-4 px-3 py-1 bg-[#1f2937] border border-[#374151] rounded-lg hover:bg-[#374151] cursor-pointer"
            >
              Fechar
            </button>
          </div>
        )}

        {/* Navegação por Subitens / Abas */}
        <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-[#111827] border border-[#374151]">
          <button
            type="button"
            onClick={() => handleTabChange('all')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'all'
                ? 'bg-[#2563eb] text-white border border-[#1d4ed8]'
                : 'text-white hover:bg-[#1f2937]'
            }`}
          >
            <Sliders className="w-4 h-4" />
            <span>Todos</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('telegram')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'telegram'
                ? 'bg-[#2563eb] text-white border border-[#1d4ed8]'
                : 'text-white hover:bg-[#1f2937]'
            }`}
          >
            <Send className="w-4 h-4" />
            <span>Telegram</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('email')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'email'
                ? 'bg-[#059669] text-white border border-[#047857]'
                : 'text-white hover:bg-[#1f2937]'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>E-mail SMTP</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('history')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'history'
                ? 'bg-[#374151] text-white border border-[#4b5563]'
                : 'text-white hover:bg-[#1f2937]'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Histórico</span>
            <span className="text-[10px] bg-[#030712] text-white font-bold px-2 py-0.5 rounded-full border border-[#4b5563]">
              {recentAlerts.length}
            </span>
          </button>
        </div>

        {activeTab !== 'history' && (
          <form onSubmit={handleSaveSettings} className="space-y-8">
            <div className={`grid gap-8 ${activeTab === 'all' ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 max-w-4xl mx-auto'}`}>
              
              {/* CANAL 1: TELEGRAM BOT */}
              {(activeTab === 'all' || activeTab === 'telegram') && (
                <div id="telegram" className="p-6 rounded-2xl bg-[#111827] border border-[#374151] space-y-5">
                  <div className="flex items-center justify-between border-b border-[#374151] pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#2563eb] flex items-center justify-center text-white font-bold">
                        <Send className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-base">Canal Telegram Bot</h3>
                        <p className="text-xs text-white font-normal">Receba notificações instantâneas no seu celular</p>
                      </div>
                    </div>

                {/* Toggle Habilitado */}
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.telegramEnabled}
                    onChange={(e) => setSettings({ ...settings, telegramEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[#374151] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2563eb]"></div>
                </label>
              </div>

              {/* Campos do Telegram */}
              <div className="space-y-4">
                {/* Informações do Bot Detectado */}
                {botInfo?.ok && botInfo.username && (
                  <div className="p-4 rounded-xl bg-[#1f2937] border border-[#374151] flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#2563eb] text-white flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">Bot Conectado:</span>
                        <span className="font-mono text-white font-bold bg-[#2563eb] px-2.5 py-0.5 rounded-md border border-[#3b82f6]">
                          @{botInfo.username}
                        </span>
                      </div>
                      <p className="text-white font-medium">
                        Para receber os alertas no grupo <strong>suporte barbershop</strong>:
                      </p>
                      <ol className="list-decimal list-inside text-white space-y-1 pl-1 font-normal">
                        <li>Abra o grupo <strong>suporte barbershop</strong> no Telegram</li>
                        <li>Adicione <strong>@{botInfo.username}</strong> como membro do grupo</li>
                        <li>Promova o bot para <strong>Administrador</strong></li>
                      </ol>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-white mb-1.5">
                    Telegram Bot Token:
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                    value={settings.telegramBotToken}
                    onChange={(e) => setSettings({ ...settings, telegramBotToken: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#030712] border border-[#4b5563] text-xs text-white placeholder-gray-400 focus:outline-none focus:border-[#2563eb] font-mono"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-white">
                      Chat ID / ID do Grupo ou Canal:
                    </label>
                    <span className="text-xs text-white font-medium font-mono">
                      Aceita link do Telegram Web ou ID numérico
                    </span>
                  </div>
                  <input
                    type="text"
                    placeholder="Ex: -1005501250394 ou https://web.telegram.org/k/#-5501250394"
                    value={settings.telegramChatId}
                    onChange={(e) => {
                      let val = e.target.value.trim()
                      const webMatch = val.match(/web\.telegram\.org\/(?:k|a|z)\/#(-?\d+)/i)
                      if (webMatch) {
                        const raw = webMatch[1].replace(/^-/, '')
                        val = `-100${raw}`
                      }
                      setSettings({ ...settings, telegramChatId: val })
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#030712] border border-[#4b5563] text-xs text-white placeholder-gray-400 focus:outline-none focus:border-[#2563eb] font-mono"
                  />
                  {settings.telegramChatId && settings.telegramChatId.startsWith('-100') && (
                    <p className="text-xs text-emerald-400 font-bold mt-1.5 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Formato de Supergrupo/Canal Telegram verificado ({settings.telegramChatId})
                    </p>
                  )}
                </div>

                {/* Botão Como Configurar */}
                <button
                  type="button"
                  onClick={() => setShowTelegramHelp(!showTelegramHelp)}
                  className="text-xs text-white font-bold underline hover:text-blue-300 inline-flex items-center gap-1 cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>{showTelegramHelp ? 'Ocultar instruções de configuração' : 'Como configurar Grupo e Bot no Telegram?'}</span>
                </button>

                {showTelegramHelp && (
                  <div className="p-4 rounded-xl bg-[#0b0f19] border border-[#374151] space-y-3 text-xs text-white leading-relaxed">
                    <p className="font-bold text-white text-sm">Configuração para Grupos (Ex: suporte barbershop):</p>
                    <ol className="list-decimal list-inside space-y-1.5 text-white">
                      <li>Abra o grupo <strong>suporte barbershop</strong> no Telegram.</li>
                      <li>Clique em <strong>Adicionar Membro</strong> e procure pelo bot (ex: <code className="bg-[#1f2937] px-2 py-0.5 rounded border border-[#374151] font-mono">@{botInfo?.username || 'seubot'}</code>).</li>
                      <li>Vá em <strong>Editar Grupo &gt; Administradores &gt; Adicionar Administrador</strong> e selecione o bot.</li>
                      <li>Cole o Chat ID <code className="bg-[#1f2937] px-2 py-0.5 rounded border border-[#374151] font-mono">-1005501250394</code> (ou o link do Telegram Web) no campo acima.</li>
                      <li>Clique em <strong>Testar Conexão com Bot</strong> para confirmar o recebimento!</li>
                    </ol>

                    <div className="pt-2 border-t border-[#374151] text-xs text-white">
                      <strong>Nota:</strong> Em supergrupos do Telegram, a API oficial exige o prefixo <code className="bg-[#1f2937] px-1.5 py-0.5 rounded font-mono">-100</code> antes dos dígitos do ID. Nosso sistema já adiciona isso automaticamente para você.
                    </div>
                  </div>
                )}

                <div className="pt-2 space-y-2">
                  <button
                    type="button"
                    onClick={() => handleTestTelegram('TELEGRAM')}
                    disabled={testingTelegram}
                    className="w-full py-2.5 px-4 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white border border-[#1d4ed8] text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {testingTelegram ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Enviando teste ao Telegram...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        <span>Testar Conexão com Bot</span>
                      </>
                    )}
                  </button>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => handleTestTelegram('TEST_COMPANY')}
                      disabled={testingTelegram}
                      className="py-2.5 px-3 rounded-xl bg-[#1f2937] hover:bg-[#374151] text-white border border-[#4b5563] text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <span>💈</span>
                      <span>Simular Nova Empresa</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTestTelegram('TEST_CLIENT')}
                      disabled={testingTelegram}
                      className="py-2.5 px-3 rounded-xl bg-[#1f2937] hover:bg-[#374151] text-white border border-[#4b5563] text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <span>👤</span>
                      <span>Simular Novo Cliente</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

              {/* CANAL 2: E-MAIL (GMAIL SMTP / RESEND) */}
              {(activeTab === 'all' || activeTab === 'email') && (
                <div id="email" className="p-6 rounded-2xl bg-[#111827] border border-[#374151] space-y-5">
                  <div className="flex items-center justify-between border-b border-[#374151] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#059669] flex items-center justify-center text-white font-bold">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-base">Canal de E-mail (SMTP / Resend)</h3>
                    <p className="text-xs text-white font-normal">Recuperação de senhas e e-mails de boas-vindas</p>
                  </div>
                </div>

                {/* Toggle Habilitado */}
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.emailEnabled}
                    onChange={(e) => setSettings({ ...settings, emailEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[#374151] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#059669]"></div>
                </label>
              </div>

              {/* Seletor de Provedor de E-mail (EMAIL_PROVIDER) */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-white">
                    Provedor de Envio (EMAIL_PROVIDER):
                  </label>
                  <span className="text-xs font-mono text-white font-bold bg-[#374151] px-2.5 py-1 rounded border border-[#4b5563]">
                    EMAIL_PROVIDER=&quot;{settings.emailProvider}&quot;
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, emailProvider: 'smtp' })}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                      settings.emailProvider === 'smtp'
                        ? 'bg-[#059669] border-[#10b981] text-white'
                        : 'bg-[#1f2937] border-[#374151] text-white hover:bg-[#374151]'
                    }`}
                  >
                    <span>📬 Gmail SMTP (Recomendado)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, emailProvider: 'resend' })}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                      settings.emailProvider === 'resend'
                        ? 'bg-[#059669] border-[#10b981] text-white'
                        : 'bg-[#1f2937] border-[#374151] text-white hover:bg-[#374151]'
                    }`}
                  >
                    <span>⚡ Resend API</span>
                  </button>
                </div>
                <p className="text-xs text-white mt-2 leading-relaxed">
                  {settings.emailProvider === 'smtp'
                    ? 'O Gmail SMTP envia diretamente para qualquer e-mail (Gmail, Hotmail, Outlook) sem restrições de sandbox.'
                    : 'A Resend API exige que você verifique um domínio próprio na Resend para enviar e-mails para clientes externos.'}
                </p>
              </div>

              {/* Campos de Configuração Manual do Gmail SMTP */}
              {settings.emailProvider === 'smtp' && (
                <div className="space-y-4 pt-1">
                  {/* SMTP_USER */}
                  <div>
                    <label className="block text-xs font-bold text-white mb-1.5 flex items-center justify-between">
                      <span>E-mail do Usuário SMTP (SMTP_USER):</span>
                      <span className="text-xs text-white font-medium font-mono">Conta Google / Gmail</span>
                    </label>
                    <input
                      type="email"
                      placeholder="seu-email@gmail.com"
                      value={settings.smtpUser}
                      onChange={(e) => setSettings({ ...settings, smtpUser: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#030712] border border-[#4b5563] text-xs text-white placeholder-gray-400 focus:outline-none focus:border-[#059669] font-mono"
                    />
                  </div>

                  {/* SMTP_PASS */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-white">
                        Senha de App do Google (SMTP_PASS):
                      </label>
                      <a
                        href="https://myaccount.google.com/apppasswords"
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-white font-bold hover:text-emerald-300 underline inline-flex items-center gap-1"
                      >
                        <span>Gerar Senha de App (16 letras)</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                    <div className="relative">
                      <input
                        type={showSmtpPass ? 'text' : 'password'}
                        placeholder="Ex: abcd efgh ijkl mnop (ou 16 letras sem espaços)"
                        value={settings.smtpPass}
                        onChange={(e) => setSettings({ ...settings, smtpPass: e.target.value })}
                        className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-[#030712] border border-[#4b5563] text-xs text-white placeholder-gray-400 focus:outline-none focus:border-[#059669] font-mono tracking-wider"
                      />
                      <button
                        type="button"
                        onClick={() => setShowSmtpPass(!showSmtpPass)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-white hover:text-emerald-400 cursor-pointer"
                        title={showSmtpPass ? 'Ocultar Senha' : 'Ver Senha'}
                      >
                        {showSmtpPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-white" />}
                      </button>
                    </div>
                  </div>

                  {/* SMTP_HOST e SMTP_PORT */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-white mb-1 font-mono">
                        Servidor (SMTP_HOST):
                      </label>
                      <input
                        type="text"
                        placeholder="smtp.gmail.com"
                        value={settings.smtpHost || 'smtp.gmail.com'}
                        onChange={(e) => setSettings({ ...settings, smtpHost: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-[#030712] border border-[#4b5563] text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-white mb-1 font-mono">
                        Porta SSL (SMTP_PORT):
                      </label>
                      <input
                        type="number"
                        placeholder="465"
                        value={settings.smtpPort || 465}
                        onChange={(e) => setSettings({ ...settings, smtpPort: Number(e.target.value) })}
                        className="w-full px-3 py-2 rounded-xl bg-[#030712] border border-[#4b5563] text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-[#0b0f19] border border-[#374151] text-xs text-white space-y-2 leading-relaxed">
                    <div className="flex items-center gap-2 text-white font-bold">
                      <Info className="w-4 h-4 text-emerald-400" />
                      <span>Instruções para obter a Senha de App do Google:</span>
                    </div>
                    <ol className="list-decimal list-inside space-y-1.5 text-white">
                      <li>Acesse <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noreferrer" className="text-white font-bold underline hover:text-emerald-300">myaccount.google.com/apppasswords</a> conectado no e-mail <strong>{settings.smtpUser || 'seu-email@gmail.com'}</strong>.</li>
                      <li>Dê um nome para a senha (ex: <strong>BarberShop</strong>) e clique em <strong>Criar</strong>.</li>
                      <li>O Google exibirá um código de 16 letras (ex: <code>abcd efgh ijkl mnop</code>).</li>
                      <li>Copie e cole esse código no campo <strong>SMTP_PASS</strong> acima e clique no botão de teste abaixo.</li>
                    </ol>
                  </div>
                </div>
              )}

              {/* Campos da Resend API */}
              {settings.emailProvider === 'resend' && (
                <div className="space-y-4 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-white mb-1.5">
                      Resend API Key (RESEND_API_KEY):
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: re_12345678_abcdefghijklmnopqrstuvwxyz"
                      value={settings.resendApiKey}
                      onChange={(e) => setSettings({ ...settings, resendApiKey: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#030712] border border-[#4b5563] text-xs text-white placeholder-gray-400 focus:outline-none focus:border-[#059669] font-mono"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-white">
                        Remetente Oficial (EMAIL_FROM):
                      </label>
                      <span className="text-xs text-white font-medium font-mono">
                        Requer domínio verificado na Resend
                      </span>
                    </div>
                    <input
                      type="text"
                      placeholder="BarberShop Alertas <onboarding@resend.dev>"
                      value={settings.emailFrom}
                      onChange={(e) => setSettings({ ...settings, emailFrom: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#030712] border border-[#4b5563] text-xs text-white placeholder-gray-400 focus:outline-none focus:border-[#059669] font-mono"
                    />
                  </div>
                </div>
              )}

              {/* E-mail de destino padrão de alertas / teste */}
              <div>
                <label className="block text-xs font-bold text-white mb-1.5 flex items-center justify-between">
                  <span>E-mail de Destino para Teste (ALERT_EMAIL_TO):</span>
                  <span className="text-xs text-white font-medium font-mono">Onde receber o e-mail de teste</span>
                </label>
                <input
                  type="email"
                  placeholder="Ex: swdevelopmentsuporte@gmail.com"
                  value={settings.alertEmailTo}
                  onChange={(e) => setSettings({ ...settings, alertEmailTo: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#030712] border border-[#4b5563] text-xs text-white placeholder-gray-400 focus:outline-none focus:border-[#059669]"
                />
              </div>

              <div className="pt-2 space-y-3">
                <button
                  type="button"
                  onClick={handleTestEmail}
                  disabled={testingEmail}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#059669] hover:bg-[#047857] text-white border border-[#047857] text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {testingEmail ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Testando e disparando e-mail...</span>
                    </>
                  ) : (
                    <>
                      <Mail className="w-3.5 h-3.5" />
                      <span>Testar Envio via {settings.emailProvider === 'smtp' ? 'Gmail SMTP' : 'Resend'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
          </div>

          {/* GATILHOS DE EVENTOS ATIVOS */}
          <div className={`p-6 rounded-2xl bg-[#111827] border border-[#374151] space-y-5 ${activeTab !== 'all' ? 'max-w-4xl mx-auto' : ''}`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#2563eb] text-white flex items-center justify-center font-bold">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Gatilhos de Notificação Automáticos</h3>
                <p className="text-xs text-white font-normal">
                  Selecione quais ocorrências do sistema devem disparar alertas para os canais ativados:
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              {/* Evento 1 */}
              <label className="flex items-start gap-3 p-4 rounded-xl bg-[#0b0f19] border border-[#374151] hover:border-[#4b5563] cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={settings.notifyOnNewRegistration}
                  onChange={(e) => setSettings({ ...settings, notifyOnNewRegistration: e.target.checked })}
                  className="mt-1 h-5 w-5 rounded border-gray-600 text-blue-600 focus:ring-blue-500 bg-gray-900"
                />
                <div>
                  <span className="font-bold text-white text-sm block mb-1">Novos Cadastros</span>
                  <span className="text-xs text-white font-normal leading-relaxed block">
                    Notificar sempre que um novo cliente ou barbearia se cadastrar na plataforma.
                  </span>
                </div>
              </label>

              {/* Evento 2 */}
              <label className="flex items-start gap-3 p-4 rounded-xl bg-[#0b0f19] border border-[#374151] hover:border-[#4b5563] cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={settings.notifyOnPasswordError}
                  onChange={(e) => setSettings({ ...settings, notifyOnPasswordError: e.target.checked })}
                  className="mt-1 h-5 w-5 rounded border-gray-600 text-blue-600 focus:ring-blue-500 bg-gray-900"
                />
                <div>
                  <span className="font-bold text-white text-sm block mb-1">Erros de Senha & Segurança</span>
                  <span className="text-xs text-white font-normal leading-relaxed block">
                    Alertar em tempo real sobre tentativas de login com senha incorreta ou suspeitas.
                  </span>
                </div>
              </label>

              {/* Evento 3 */}
              <label className="flex items-start gap-3 p-4 rounded-xl bg-[#0b0f19] border border-[#374151] hover:border-[#4b5563] cursor-pointer transition">
                <input
                  type="checkbox"
                  checked={settings.notifyOnStatusChange}
                  onChange={(e) => setSettings({ ...settings, notifyOnStatusChange: e.target.checked })}
                  className="mt-1 h-5 w-5 rounded border-gray-600 text-blue-600 focus:ring-blue-500 bg-gray-900"
                />
                <div>
                  <span className="font-bold text-white text-sm block mb-1">Status & Reset de Trial</span>
                  <span className="text-xs text-white font-normal leading-relaxed block">
                    Notificar aprovações, suspensões, bloqueios e renovações/reset de período de teste.
                  </span>
                </div>
              </label>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#2563eb] hover:bg-[#1d4ed8] text-white font-bold text-xs border border-[#1d4ed8] transition cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Salvar Configurações</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
        )}

        {/* FEED DE ÚLTIMOS ALERTAS DISPARADOS */}
        {(activeTab === 'all' || activeTab === 'history') && (
          <div id="history" className={`p-6 rounded-2xl bg-[#111827] border border-[#374151] space-y-4 ${activeTab === 'history' ? 'max-w-5xl mx-auto' : ''}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#374151] text-white flex items-center justify-center font-bold">
                  <Clock className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-white text-base">Histórico de Alertas Disparados</h3>
                  <span className="text-xs bg-[#374151] px-2.5 py-0.5 rounded-full text-white font-bold border border-[#4b5563]">
                  {recentAlerts.length}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={fetchSettings}
              className="p-2 text-white hover:text-white bg-[#1f2937] hover:bg-[#374151] rounded-lg border border-[#374151] cursor-pointer"
              title="Recarregar histórico"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {recentAlerts.length === 0 ? (
            <div className="py-12 text-center text-xs text-white font-medium">
              Nenhum alerta foi disparado recentemente.
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {recentAlerts.map((alert) => (
                <div key={alert.id} className="p-3.5 rounded-xl bg-[#0b0f19] border border-[#374151] flex items-start justify-between gap-4 text-xs">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      {formatEventBadge(alert.eventType)}
                      <span className="font-bold text-white">{alert.title}</span>
                    </div>
                    <p className="text-white font-normal">{alert.message}</p>
                    {alert.error && (
                      <span className="text-xs text-red-400 block font-mono font-bold">{alert.error}</span>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs text-white font-medium block">
                      {new Date(alert.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                    <span className={`text-xs font-bold inline-block px-2 py-0.5 rounded mt-1 ${alert.status === 'SUCCESS' ? 'bg-[#059669] text-white' : 'bg-[#dc2626] text-white'}`}>
                      {alert.status === 'SUCCESS' ? 'Disparado' : 'Falhou'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        )}
      </main>
    </div>
  )
}

export default NotificationsSettingsView
