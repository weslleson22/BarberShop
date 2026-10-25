'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import DropdownHeader from '@/components/shared/DropdownHeader'
import { getAuthHeaders } from '@/lib/utils'
import {
  KeyRound,
  Shield,
  Search,
  RefreshCw,
  Lock,
  Unlock,
  Copy,
  Check,
  Eye,
  EyeOff,
  UserCheck,
  Building2,
  ExternalLink,
  Send,
  AlertTriangle,
  CheckCircle2,
  Phone,
  HelpCircle,
  LogIn
} from 'lucide-react'

interface UserCredential {
  id: string
  name: string
  email: string
  role: string
  phone: string | null
  isActive: boolean
  createdAt: string
  avatar: string | null
  barbershopId: string | null
  barbershop: {
    id: string
    name: string
    slug: string | null
  } | null
  hasActiveSession: boolean
  lastActive: number | null
  hashAlgorithm: string
}

export default function DeveloperCredentialsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [users, setUsers] = useState<UserCredential[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRole, setSelectedRole] = useState('ALL')

  // Modal de gerenciamento
  const [selectedUser, setSelectedUser] = useState<UserCredential | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null)
  const [customPassword, setCustomPassword] = useState('')
  const [showPassword, setShowPassword] = useState(true)
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [successFeedback, setSuccessFeedback] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && user?.role !== 'DEVELOPER') {
      router.replace('/dashboard')
    }
  }, [user, authLoading, router])

  const fetchUsers = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/developer/credentials', {
        headers: getAuthHeaders(),
        credentials: 'include',
      })
      if (res.ok) {
        const json = await res.json()
        setUsers(json.users || [])
      } else {
        const errJson = await res.json().catch(() => ({}))
        setError(errJson.error || 'Erro ao carregar credenciais')
      }
    } catch {
      setError('Falha de conexão com os serviços de autenticação')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.role === 'DEVELOPER') {
      fetchUsers()
    }
  }, [user])

  // Gerar nova senha temporária
  const handleResetPassword = async (useCustom = false) => {
    if (!selectedUser) return
    setActionLoading(true)
    setSuccessFeedback(null)

    try {
      const payload: any = {
        action: 'reset_password',
        userId: selectedUser.id,
      }
      if (useCustom && customPassword.trim()) {
        payload.customPassword = customPassword.trim()
      }

      const res = await fetch('/api/developer/credentials', {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      const json = await res.json()
      if (res.ok) {
        setGeneratedPassword(json.temporaryPassword)
        setSuccessFeedback(`Nova senha definida com sucesso para ${selectedUser.name}!`)
        setCustomPassword('')
      } else {
        alert(json.error || 'Erro ao redefinir a senha do usuário.')
      }
    } catch {
      alert('Erro de comunicação ao redefinir a senha.')
    } finally {
      setActionLoading(false)
    }
  }

  // Acessar como usuário (Suporte Rápido)
  const handleImpersonate = async () => {
    if (!selectedUser) return
    if (!confirm(`Deseja iniciar uma sessão de suporte rápida como "${selectedUser.name}" (${selectedUser.role})?`)) return

    setActionLoading(true)
    try {
      const res = await fetch('/api/developer/credentials', {
        method: 'POST',
        headers: getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify({
          action: 'impersonate',
          userId: selectedUser.id,
        }),
      })

      const json = await res.json()
      if (res.ok && json.token) {
        localStorage.setItem('auth_token', json.token)
        localStorage.setItem('user_data', JSON.stringify(json.user))
        window.location.href = '/dashboard'
      } else {
        alert(json.error || 'Erro ao gerar acesso de suporte.')
      }
    } catch {
      alert('Erro de conexão ao solicitar acesso de suporte.')
    } finally {
      setActionLoading(false)
    }
  }

  const copyToClipboard = (text: string, keyName: string) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(keyName)
    setTimeout(() => setCopiedKey(null), 2500)
  }

  const filteredUsers = users.filter((u) => {
    if (selectedRole !== 'ALL' && u.role !== selectedRole) return false
    if (searchTerm.trim()) {
      const t = searchTerm.toLowerCase()
      const matchName = u.name.toLowerCase().includes(t)
      const matchEmail = u.email.toLowerCase().includes(t)
      const matchShop = u.barbershop?.name?.toLowerCase().includes(t)
      return matchName || matchEmail || matchShop
    }
    return true
  })

  const getShareMessage = () => {
    if (!selectedUser || !generatedPassword) return ''
    return `Olá ${selectedUser.name}!\n\nSeus dados de acesso ao sistema foram configurados com sucesso:\n\n👤 Usuário/E-mail: ${selectedUser.email}\n🔑 Senha de Acesso: ${generatedPassword}\n\n👉 Acesse agora: ${window.location.origin}/login\n\nPor favor, altere sua senha no primeiro login em "Meu Perfil".`
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 pt-20">
      <DropdownHeader
        title="Gestão de Credenciais & Senhas"
        subtitle="Controle administrativo restrito para visualização de logins, recuperação e emissão de senhas"
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Filtros e Busca */}
        <div className="p-4 rounded-xl bg-card border border-border flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nome, email ou barbearia..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-background border border-border text-xs md:text-sm text-foreground placeholder:text-muted-foreground font-normal focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-3.5 py-2 rounded-lg bg-background border border-border text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="ALL">Todos os Perfis</option>
              <option value="ADMIN">Administradores</option>
              <option value="BARBER">Barbeiros</option>
              <option value="CLIENT">Clientes</option>
              <option value="DEVELOPER">Desenvolvedores</option>
            </select>

            <button
              type="button"
              onClick={fetchUsers}
              disabled={loading}
              className="px-3 py-2 rounded-lg bg-card hover:bg-accent text-foreground font-medium border border-border transition flex items-center gap-2 text-xs cursor-pointer shadow-sm"
              title="Recarregar usuários"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-primary' : 'text-muted-foreground'}`} />
              <span>Atualizar</span>
            </button>
          </div>
        </div>

        {/* Tabela de Usuários */}
        <div className="rounded-xl bg-card border border-border overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-amber-500" />
              <h3 className="font-semibold text-foreground text-base">Credenciais de Usuários</h3>
              <span className="text-xs bg-primary/10 px-2.5 py-0.5 rounded-md text-primary font-medium border border-primary/20">
                {filteredUsers.length} contas
              </span>
            </div>
          </div>

          {loading ? (
            <div className="py-20 text-center space-y-3">
              <RefreshCw className="w-8 h-8 text-primary animate-spin mx-auto" />
              <p className="text-xs text-muted-foreground font-medium">Carregando dados de usuários...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="py-20 text-center text-xs text-muted-foreground font-normal">
              Nenhum usuário encontrado com os filtros selecionados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-muted-foreground uppercase font-semibold text-[11px] tracking-wider">
                    <th className="py-3.5 px-4">Usuário / Nome</th>
                    <th className="py-3.5 px-4">Login / E-mail</th>
                    <th className="py-3.5 px-4">Perfil</th>
                    <th className="py-3.5 px-4">Estabelecimento</th>
                    <th className="py-3.5 px-4">Segurança / Hash</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-muted/40 transition group">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-xs">
                            {u.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-semibold text-foreground text-sm">
                              {u.name}
                            </span>
                            {u.phone && <div className="text-[11px] text-muted-foreground font-normal">{u.phone}</div>}
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-foreground font-medium">
                        <div className="flex items-center gap-2">
                          <span>{u.email}</span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(u.email, `email_${u.id}`)}
                            className="text-muted-foreground hover:text-foreground p-1 rounded hover:bg-muted"
                            title="Copiar email"
                          >
                            {copiedKey === `email_${u.id}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-medium bg-muted border border-border text-foreground">
                          {u.role}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {u.barbershop ? (
                          <span className="text-foreground font-medium">{u.barbershop.name}</span>
                        ) : (
                          <span className="text-muted-foreground italic">Global / Sem unidade</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-mono">
                          <Lock className="w-3 h-3" /> Bcrypt (Ativo)
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        {u.hasActiveSession ? (
                          <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                            Conectado
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[10px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded border border-border">Offline</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedUser(u)
                            setGeneratedPassword(null)
                            setCustomPassword('')
                            setSuccessFeedback(null)
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-card hover:bg-accent text-foreground font-medium text-xs transition border border-border shadow-sm cursor-pointer"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                          <span>Gerenciar</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Modal de Gestão de Credenciais e Senha */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div className="bg-card border border-border w-full max-w-lg rounded-xl p-6 shadow-2xl space-y-6 text-card-foreground">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground text-base">Gerenciar Credenciais</h4>
                  <p className="text-xs text-muted-foreground font-normal">{selectedUser.name}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="text-muted-foreground hover:text-foreground text-sm font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Informações da Conta */}
            <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-normal">Usuário / Login:</span>
                <span className="font-mono font-semibold text-foreground">{selectedUser.email}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-normal">Perfil de Acesso:</span>
                <span className="font-semibold text-amber-600">{selectedUser.role}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-normal">Barbearia / Estabelecimento:</span>
                <span className="text-foreground font-semibold">{selectedUser.barbershop?.name || 'Geral'}</span>
              </div>
            </div>

            {/* Feedback de Sucesso */}
            {successFeedback && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{successFeedback}</span>
              </div>
            )}

            {/* Exibição da Senha Gerada */}
            {generatedPassword ? (
              <div className="p-4 rounded-xl bg-muted/40 border border-amber-500/30 space-y-3">
                <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider block">
                  Nova Senha de Acesso Gerada:
                </span>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      readOnly
                      value={generatedPassword}
                      className="w-full py-2.5 px-3 rounded-lg bg-background border border-border text-amber-600 font-mono font-bold text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(generatedPassword, 'generated_pass')}
                    className="p-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs transition border border-transparent flex items-center gap-1.5 shadow-sm"
                    title="Copiar senha"
                  >
                    {copiedKey === 'generated_pass' ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copiar</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Mensagem Pronta para Envio */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-foreground">
                      Mensagem de Boas-Vindas Pronta:
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(getShareMessage(), 'share_msg')}
                      className="text-xs text-primary hover:underline font-medium flex items-center gap-1 cursor-pointer"
                    >
                      {copiedKey === 'share_msg' ? 'Copiado!' : 'Copiar Texto Completo'}
                    </button>
                  </div>
                  <textarea
                    readOnly
                    rows={4}
                    value={getShareMessage()}
                    className="w-full p-2.5 rounded-lg bg-background border border-border text-xs text-foreground font-mono resize-none"
                  />
                  {selectedUser.phone && (
                    <a
                      href={`https://wa.me/55${selectedUser.phone.replace(/\D/g, '')}?text=${encodeURIComponent(getShareMessage())}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center justify-center gap-2 w-full py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-xs transition shadow-sm"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Enviar Credenciais pelo WhatsApp</span>
                    </a>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Opção 1: Gerar Senha Instantânea */}
                <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2">
                  <h5 className="font-semibold text-foreground text-xs">Opção 1: Senha Instantânea Segura</h5>
                  <p className="text-xs text-muted-foreground font-normal">
                    O sistema cria uma senha forte aleatória, salva no banco e exibe na tela para você copiar e enviar ao usuário.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleResetPassword(false)}
                    disabled={actionLoading}
                    className="w-full py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground font-medium text-xs transition border border-transparent flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>Gerar Nova Senha Temporária</span>
                  </button>
                </div>

                {/* Opção 2: Definir Senha Manual */}
                <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2">
                  <h5 className="font-semibold text-foreground text-xs">Opção 2: Definir Senha Manualmente</h5>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Digite a nova senha desejada..."
                      value={customPassword}
                      onChange={(e) => setCustomPassword(e.target.value)}
                      className="flex-1 py-2 px-3 rounded-lg bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground font-normal focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    <button
                      type="button"
                      onClick={() => handleResetPassword(true)}
                      disabled={actionLoading || !customPassword.trim()}
                      className="px-4 py-2 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-medium transition disabled:opacity-50 shadow-sm cursor-pointer"
                    >
                      Salvar Senha
                    </button>
                  </div>
                </div>

                {/* Opção 3: Suporte Direto / Impersonação */}
                <div className="p-4 rounded-xl bg-muted/40 border border-border space-y-2">
                  <h5 className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                    <LogIn className="w-3.5 h-3.5 text-primary" />
                    Opção 3: Suporte Rápido (Login como Usuário)
                  </h5>
                  <p className="text-xs text-muted-foreground font-normal">
                    Permite ao desenvolvedor abrir uma sessão de suporte autenticada como este usuário para verificar bugs ou dúvidas, sem alterar a senha dele.
                  </p>
                  <button
                    type="button"
                    onClick={handleImpersonate}
                    disabled={actionLoading}
                    className="w-full py-2.5 rounded-lg bg-secondary hover:bg-accent text-secondary-foreground border border-border font-medium text-xs transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Acessar Painel como {selectedUser.name}</span>
                  </button>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="px-5 py-2 rounded-lg bg-secondary hover:bg-accent text-secondary-foreground text-xs font-medium border border-border transition cursor-pointer"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
