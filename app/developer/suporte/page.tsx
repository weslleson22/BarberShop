'use client'

import { useState, useEffect } from 'react'
import DropdownHeader from '@/components/shared/DropdownHeader'
import { useAuth } from '@/lib/auth-context'
import {
  Headphones,
  FileText,
  Search,
  Filter,
  RefreshCw,
  Send,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  Building2,
  Mail,
  Phone,
  MessageSquare,
  Sparkles,
  Check,
  Copy,
  ExternalLink,
  ChevronRight,
  X,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

interface SupportTicket {
  id: string
  protocol: string
  userId: string
  userName: string
  userEmail: string
  userPhone: string
  barbershopId?: string
  barbershopName: string
  subject: string
  category: string
  message: string
  status: 'OPEN' | 'IN_PROGRESS' | 'ANSWERED' | 'RESOLVED'
  priority?: 'LOW' | 'MEDIUM' | 'HIGH'
  response?: string
  respondedAt?: string
  respondedBy?: string
  createdAt: string
  updatedAt: string
}

export default function DeveloperSuportePage() {
  const { user } = useAuth()

  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [copiedProtocol, setCopiedProtocol] = useState<string | null>(null)

  // Ticket sendo visualizado / respondido na modal
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null)
  const [replyText, setReplyText] = useState('')
  const [replyStatus, setReplyStatus] = useState<'OPEN' | 'IN_PROGRESS' | 'ANSWERED' | 'RESOLVED'>('ANSWERED')
  const [sendEmailNotify, setSendEmailNotify] = useState(true)
  const [isSavingReply, setIsSavingReply] = useState(false)
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const fetchTickets = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/support/ticket')
      if (res.ok) {
        const data = await res.json()
        setTickets(data.tickets || [])
      }
    } catch (err) {
      console.error('Erro ao carregar chamados do suporte:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTickets()
  }, [])

  const handleCopyProtocol = (proto: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(proto)
      setCopiedProtocol(proto)
      setTimeout(() => setCopiedProtocol(null), 2500)
    }
  }

  const handleOpenTicketModal = (ticket: SupportTicket) => {
    setSelectedTicket(ticket)
    setReplyText(ticket.response || '')
    setReplyStatus(ticket.status === 'OPEN' ? 'IN_PROGRESS' : ticket.status)
    setActionFeedback(null)
  }

  const handleCloseModal = () => {
    setSelectedTicket(null)
    setReplyText('')
    setActionFeedback(null)
  }

  const handleSaveReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTicket) return

    setIsSavingReply(true)
    setActionFeedback(null)

    try {
      const res = await fetch('/api/support/ticket', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketId: selectedTicket.id,
          status: replyStatus,
          response: replyText.trim(),
          sendEmailToClient: sendEmailNotify,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao registrar resposta')
      }

      setActionFeedback({
        type: 'success',
        text: `Chamado #${selectedTicket.protocol} atualizado com sucesso! ${
          sendEmailNotify && data.clientEmailDispatched
            ? 'E-mail enviado ao cliente com a resposta.'
            : ''
        }`,
      })

      // Atualiza lista local
      setTickets((prev) =>
        prev.map((t) => (t.id === selectedTicket.id ? data.ticket : t))
      )
      setSelectedTicket(data.ticket)
    } catch (err: any) {
      setActionFeedback({
        type: 'error',
        text: err.message || 'Falha ao salvar resposta.',
      })
    } finally {
      setIsSavingReply(false)
    }
  }

  // Filtragem
  const filteredTickets = tickets.filter((t) => {
    if (statusFilter !== 'ALL' && t.status !== statusFilter) return false
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim()
      return (
        t.protocol.toLowerCase().includes(q) ||
        t.barbershopName.toLowerCase().includes(q) ||
        t.userName.toLowerCase().includes(q) ||
        t.userEmail.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q)
      )
    }
    return true
  })

  // Métricas
  const totalTickets = tickets.length
  const openCount = tickets.filter((t) => t.status === 'OPEN').length
  const inProgressCount = tickets.filter((t) => t.status === 'IN_PROGRESS').length
  const answeredCount = tickets.filter((t) => t.status === 'ANSWERED' || t.status === 'RESOLVED').length

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 pt-20">
      <DropdownHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="border-b border-border pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
              <FileText className="w-7 h-7 text-primary" />
              Gestão de Chamados & Protocolos
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fetchTickets}
              disabled={isLoading}
              className="gap-2 text-xs h-9"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Atualizar Chamados</span>
            </Button>
          </div>
        </div>

        {/* Métricas do Helpdesk */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-border shadow-sm p-4">
            <div className="text-xs text-muted-foreground font-medium">Total de Chamados</div>
            <div className="text-2xl font-black text-foreground mt-1">{totalTickets}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Histórico global</div>
          </Card>

          <Card className="border-border shadow-sm p-4 bg-amber-500/5 border-amber-500/20">
            <div className="text-xs text-amber-600 dark:text-amber-400 font-semibold">Em Fila (Abertos)</div>
            <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">{openCount}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Aguardando 1º contato</div>
          </Card>

          <Card className="border-border shadow-sm p-4 bg-blue-500/5 border-blue-500/20">
            <div className="text-xs text-blue-600 dark:text-blue-400 font-semibold">Em Atendimento</div>
            <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">{inProgressCount}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Em análise técnica</div>
          </Card>

          <Card className="border-border shadow-sm p-4 bg-emerald-500/5 border-emerald-500/20">
            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">Respondidos / Resolvidos</div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{answeredCount}</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">Finalizados com sucesso</div>
          </Card>
        </div>

        {/* Barra de Filtros e Busca */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar por protocolo, barbearia, cliente, assunto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 text-xs"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            <Button
              type="button"
              variant={statusFilter === 'ALL' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('ALL')}
              className="text-xs h-8"
            >
              Todos ({totalTickets})
            </Button>
            <Button
              type="button"
              variant={statusFilter === 'OPEN' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('OPEN')}
              className="text-xs h-8"
            >
              Abertos ({openCount})
            </Button>
            <Button
              type="button"
              variant={statusFilter === 'IN_PROGRESS' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('IN_PROGRESS')}
              className="text-xs h-8"
            >
              Em Análise ({inProgressCount})
            </Button>
            <Button
              type="button"
              variant={statusFilter === 'ANSWERED' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('ANSWERED')}
              className="text-xs h-8"
            >
              Respondidos
            </Button>
            <Button
              type="button"
              variant={statusFilter === 'RESOLVED' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('RESOLVED')}
              className="text-xs h-8"
            >
              Resolvidos
            </Button>
          </div>
        </div>

        {/* Tabela / Lista de Chamados */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground text-xs">
            <RefreshCw className="w-5 h-5 animate-spin text-primary mr-2" />
            Carregando chamados...
          </div>
        ) : filteredTickets.length === 0 ? (
          <Card className="p-12 text-center border-dashed border-border">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">
              Nenhum chamado encontrado
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {searchTerm || statusFilter !== 'ALL'
                ? 'Tente ajustar os filtros de busca para encontrar outros protocolos.'
                : 'Quando os clientes abrirem chamados de suporte, eles aparecerão organizados aqui.'}
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredTickets.map((tkt) => {
              const createdDate = new Date(tkt.createdAt).toLocaleString('pt-BR', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })

              return (
                <Card
                  key={tkt.id}
                  className={`border-border shadow-sm hover:border-primary/40 transition-all overflow-hidden ${
                    tkt.status === 'OPEN' ? 'border-l-4 border-l-amber-500' : ''
                  }`}
                >
                  <CardHeader className="p-4 sm:p-5 pb-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <Badge
                          variant="outline"
                          className="font-mono text-xs font-bold px-2.5 py-0.5 bg-primary/10 text-primary border-primary/20 flex items-center gap-1.5"
                        >
                          <span>#{tkt.protocol}</span>
                          <button
                            type="button"
                            onClick={() => handleCopyProtocol(tkt.protocol)}
                            title="Copiar protocolo"
                            className="hover:text-foreground transition-colors ml-1"
                          >
                            {copiedProtocol === tkt.protocol ? (
                              <Check className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </Badge>

                        <div className="flex items-center gap-1 text-xs font-semibold text-foreground">
                          <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>{tkt.barbershopName}</span>
                        </div>

                        <span className="text-xs text-muted-foreground">•</span>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <User className="w-3.5 h-3.5" />
                          <span>{tkt.userName}</span>
                        </div>

                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {createdDate}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {tkt.status === 'OPEN' && (
                          <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs">
                            Aberto (Fila)
                          </Badge>
                        )}
                        {tkt.status === 'IN_PROGRESS' && (
                          <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 text-xs">
                            Em Análise
                          </Badge>
                        )}
                        {tkt.status === 'ANSWERED' && (
                          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs">
                            Respondido
                          </Badge>
                        )}
                        {tkt.status === 'RESOLVED' && (
                          <Badge className="bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30 text-xs">
                            Resolvido
                          </Badge>
                        )}

                        <Button
                          type="button"
                          size="sm"
                          variant="default"
                          onClick={() => handleOpenTicketModal(tkt)}
                          className="text-xs h-7 gap-1"
                        >
                          <span>Atender</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="pt-2">
                      <h3 className="text-sm sm:text-base font-bold text-foreground">
                        {tkt.subject}
                      </h3>
                    </div>
                  </CardHeader>

                  <CardContent className="p-4 sm:p-5 pt-0 space-y-3">
                    <div className="p-3 rounded-lg bg-muted/20 border border-border/50 text-xs text-muted-foreground line-clamp-2">
                      {tkt.message}
                    </div>

                    {tkt.response && (
                      <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2">
                        <Sparkles className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                        <div className="line-clamp-2">
                          <strong>Resposta enviada:</strong> {tkt.response}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* Modal / Drawer para Visualizar e Responder Chamado */}
        {selectedTicket && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <Card className="max-w-2xl w-full border-border shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <CardHeader className="p-5 border-b border-border flex flex-row items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="font-mono text-xs bg-primary/10 text-primary border-primary/20">
                      Protocolo #{selectedTicket.protocol}
                    </Badge>
                    <span className="text-xs text-muted-foreground">• Central de Atendimento</span>
                  </div>
                  <CardTitle className="text-lg font-bold text-foreground">
                    {selectedTicket.subject}
                  </CardTitle>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleCloseModal}
                  className="h-8 w-8 p-0 rounded-full"
                >
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>

              <form onSubmit={handleSaveReply}>
                <CardContent className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
                  {/* Feedback da Ação */}
                  {actionFeedback && (
                    <div
                      className={`p-3.5 rounded-lg text-xs flex items-start gap-2.5 border ${
                        actionFeedback.type === 'success'
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                          : 'bg-destructive/10 text-destructive border-destructive/20'
                      }`}
                    >
                      {actionFeedback.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                      )}
                      <span>{actionFeedback.text}</span>
                    </div>
                  )}

                  {/* Informações do Solicitante */}
                  <div className="p-3.5 rounded-xl bg-muted/40 border border-border space-y-2 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="flex items-center gap-2 text-foreground">
                        <Building2 className="w-4 h-4 text-primary shrink-0" />
                        <span><strong>Barbearia:</strong> {selectedTicket.barbershopName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-foreground">
                        <User className="w-4 h-4 text-primary shrink-0" />
                        <span><strong>Solicitante:</strong> {selectedTicket.userName}</span>
                      </div>
                      <div className="flex items-center gap-2 text-foreground">
                        <Mail className="w-4 h-4 text-primary shrink-0" />
                        <span><strong>E-mail:</strong> {selectedTicket.userEmail || 'Não informado'}</span>
                      </div>
                      {selectedTicket.userPhone && (
                        <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium">
                          <Phone className="w-4 h-4 shrink-0" />
                          <span><strong>WhatsApp:</strong> {selectedTicket.userPhone}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Mensagem do Cliente */}
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      Mensagem do Cliente:
                    </label>
                    <div className="p-3.5 rounded-lg bg-muted/20 border border-border text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                      {selectedTicket.message}
                    </div>
                  </div>

                  {/* Status do Chamado */}
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      Status do Atendimento
                    </label>
                    <select
                      value={replyStatus}
                      onChange={(e) => setReplyStatus(e.target.value as any)}
                      className="w-full h-9 px-3 bg-background border border-input rounded-md text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="OPEN">Aberto (Em Fila)</option>
                      <option value="IN_PROGRESS">Em Análise Técnica</option>
                      <option value="ANSWERED">Respondido</option>
                      <option value="RESOLVED">Resolvido / Finalizado</option>
                    </select>
                  </div>

                  {/* Resposta do Desenvolvedor */}
                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      Resposta Oficial do Suporte
                    </label>
                    <textarea
                      rows={5}
                      required
                      placeholder="Digite o parecer técnico, solução ou orientações para o cliente..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      className="w-full p-3 rounded-md border border-input bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring leading-relaxed"
                    />
                  </div>

                  {/* Flag de Envio por E-mail */}
                  <label className="flex items-center gap-2.5 p-3 rounded-lg border border-border bg-muted/20 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sendEmailNotify}
                      onChange={(e) => setSendEmailNotify(e.target.checked)}
                      className="rounded border-input text-primary focus:ring-primary w-4 h-4"
                    />
                    <div className="text-xs">
                      <span className="font-semibold text-foreground">Disparar e-mail com a resposta oficial</span>
                      <p className="text-[11px] text-muted-foreground">
                        Envia a resposta e o número do protocolo para {selectedTicket.userEmail || 'o e-mail do cliente'}.
                      </p>
                    </div>
                  </label>
                </CardContent>

                <CardFooter className="p-4 border-t border-border flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCloseModal}
                    className="text-xs"
                  >
                    Fechar
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isSavingReply}
                    className="text-xs gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSavingReply ? 'Gravando resposta...' : 'Salvar & Enviar Resposta'}</span>
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
