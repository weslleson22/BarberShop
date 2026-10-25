'use client'

import { useState, useEffect } from 'react'
import DropdownHeader from '@/components/shared/DropdownHeader'
import { useAuth } from '@/lib/auth-context'
import {
  HelpCircle,
  MessageCircle,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
  FileQuestion,
  ChevronDown,
  ExternalLink,
  ShieldCheck,
  Headphones,
  FileText,
  Copy,
  Check,
  RefreshCw,
  MessageSquare,
  Sparkles,
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

interface FAQItem {
  question: string
  answer: string
}

interface ClientTicket {
  id: string
  protocol: string
  subject: string
  category: string
  message: string
  status: 'OPEN' | 'IN_PROGRESS' | 'ANSWERED' | 'RESOLVED'
  response?: string
  respondedAt?: string
  respondedBy?: string
  createdAt: string
  updatedAt: string
}

const FAQ_LIST: FAQItem[] = [
  {
    question: 'Como os clientes realizam agendamentos sem precisar me mandar mensagem?',
    answer:
      'Basta você compartilhar o seu Link Público exclusivo (ex: /b/sua-unidade). Você encontra esse link em "Perfil do Estabelecimento > Dados da Barbearia". Seus clientes abrem o link direto no celular, escolhem o serviço, o barbeiro preferido e o horário disponível em tempo real 24 horas por dia.',
  },
  {
    question: 'Como definir os dias em que cada barbeiro da equipe trabalha?',
    answer:
      'Acesse no menu "Perfil do Estabelecimento > Horários de Atendimento". Na seção "Disponibilidade dos Profissionais", você verá cada profissional cadastrado com pílulas interativas de SEG a DOM. Basta clicar no dia desejado para marcar como Atende ou Folga.',
  },
  {
    question: 'Onde registro os gastos com aluguel, luz e produtos da barbearia?',
    answer:
      'No menu lateral, acesse "Financeiro & Métricas > Gastos do Estabelecimento". Lá você pode registrar todas as despesas fixas e variáveis, marcando se estão pagas ou pendentes, além de acompanhar o total de saídas no mês e o controle de estoque.',
  },
  {
    question: 'Os barbeiros da minha equipe têm acesso aos dados financeiros do meu negócio?',
    answer:
      'Não. O perfil "Barbeiro" (BARBER) possui acesso estritamente restrito à sua própria agenda e aos seus relatórios individuais de produtividade. Ele não consegue visualizar faturamento global, configurações da empresa nem os dados de outros profissionais.',
  },
  {
    question: 'Como funciona o cancelamento ou reagendamento de um cliente?',
    answer:
      'Você pode cancelar ou reagendar diretamente na página de "Agenda de Atendimentos" clicando sobre o horário marcado. O horário fica imediatamente liberado na página pública para outros clientes agendarem.',
  },
]

export default function SuportePage() {
  const { user } = useAuth()

  // Aba ativa: 'abrir' (Abrir Chamado) ou 'chamados' (Meus Protocolos & Chamados)
  const [activeTab, setActiveTab] = useState<'abrir' | 'chamados'>('abrir')

  const [formData, setFormData] = useState({
    subject: '',
    category: 'DUVIDA',
    message: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submittedFeedback, setSubmittedFeedback] = useState<{
    text: string
    protocol: string
  } | null>(null)
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0)

  // Lista de chamados do cliente
  const [myTickets, setMyTickets] = useState<ClientTicket[]>([])
  const [isFetchingTickets, setIsFetchingTickets] = useState(false)
  const [copiedProtocol, setCopiedProtocol] = useState<string | null>(null)

  const fetchMyTickets = async () => {
    setIsFetchingTickets(true)
    try {
      const res = await fetch('/api/support/ticket')
      if (res.ok) {
        const data = await res.json()
        setMyTickets(data.tickets || [])
      }
    } catch (err) {
      console.warn('Erro ao carregar chamados:', err)
    } finally {
      setIsFetchingTickets(false)
    }
  }

  useEffect(() => {
    fetchMyTickets()
  }, [])

  const handleCopyProtocol = (proto: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(proto)
      setCopiedProtocol(proto)
      setTimeout(() => setCopiedProtocol(null), 2500)
    }
  }

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.subject.trim() || !formData.message.trim()) {
      alert('Por favor, preencha o assunto e a mensagem detalhada.')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch('/api/support/ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: formData.subject,
          category: formData.category,
          message: formData.message,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao enviar chamado')
      }

      setSubmittedFeedback({
        protocol: data.protocol,
        text: `Seu chamado foi registrado com sucesso sob o protocolo #${data.protocol}. A confirmação foi enviada para seu e-mail e nossa equipe entrará em contato em breve.`,
      })
      setFormData({ subject: '', category: 'DUVIDA', message: '' })
      fetchMyTickets()
    } catch (err: any) {
      alert(err.message || 'Erro ao registrar chamado de suporte.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 pt-20">
      <DropdownHeader />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Cabeçalho */}
        <div className="border-b border-border pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary" className="gap-1.5 font-semibold text-xs bg-primary/10 text-primary border-primary/20">
                <Headphones className="w-3.5 h-3.5" />
                Central de Atendimento & Suporte
              </Badge>
              <span className="text-xs text-muted-foreground">• Suporte com Protocolo</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
              <HelpCircle className="w-7 h-7 text-primary" />
              Como podemos te ajudar hoje?
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Abra chamados técnicos com protocolo oficial, acompanhe as respostas da equipe no painel e no seu e-mail, ou tire dúvidas frequentes.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={activeTab === 'abrir' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setActiveTab('abrir')}
              className="gap-2 text-xs h-9"
            >
              <Send className="w-4 h-4" />
              <span>Abrir Chamado</span>
            </Button>
            <Button
              type="button"
              variant={activeTab === 'chamados' ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setActiveTab('chamados')
                fetchMyTickets()
              }}
              className="gap-2 text-xs h-9"
            >
              <FileText className="w-4 h-4" />
              <span>Meus Protocolos & Chamados</span>
              {myTickets.length > 0 && (
                <Badge variant="secondary" className="font-mono text-[10px] ml-1">
                  {myTickets.length}
                </Badge>
              )}
            </Button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* ABA 1: ABRIR CHAMADO & CANAIS DE CONTATO                      */}
        {/* ============================================================ */}
        {activeTab === 'abrir' && (
          <div className="space-y-8">
            {/* Canais de Contato Direto */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Canal 1: WhatsApp */}
              <Card className="border-border shadow-sm hover:border-emerald-500/40 transition-all flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2">
                    <MessageCircle className="w-5 h-5" />
                  </div>
                  <CardTitle className="text-base font-bold text-foreground">
                    WhatsApp Oficial
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Fale diretamente com nossa equipe de suporte para atendimento imediato.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-semibold mb-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Atendimento Seg-Sex (08h às 18h)</span>
                  </div>
                  <p className="text-xs font-mono text-muted-foreground font-semibold">
                    (98) 98497-1547
                  </p>
                </CardContent>
                <CardFooter className="pt-0">
                  <a
                    href="https://wa.me/5598984971547?text=Ol%C3%A1!%20Preciso%20de%20ajuda%20com%20o%20sistema%20BarberShop."
                    target="_blank"
                    rel="noreferrer"
                    className="w-full"
                  >
                    <Button variant="default" size="sm" className="w-full gap-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
                      <span>Abrir WhatsApp</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                  </a>
                </CardFooter>
              </Card>

              {/* Canal 2: Plantão e Suporte Técnico */}
              <Card className="border-border shadow-sm flex flex-col justify-between">
                <CardHeader className="pb-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-2">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <CardTitle className="text-base font-bold text-foreground">
                    Atendimento com Protocolo
                  </CardTitle>
                  <CardDescription className="text-xs text-muted-foreground">
                    Cada chamado gera um protocolo exclusivo acompanhado pela equipe técnica.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0 space-y-2 text-xs text-muted-foreground">
                  <div className="flex items-center justify-between border-b border-border/50 pb-1.5">
                    <span>Retorno por E-mail & Painel:</span>
                    <strong className="text-foreground">Entraremos em contato</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Acompanhamento:</span>
                    <strong className="text-foreground">Aba "Meus Protocolos"</strong>
                  </div>
                </CardContent>
                <CardFooter className="pt-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab('chamados')}
                    className="w-full justify-center text-xs gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5 text-primary" />
                    <span>Ver meus protocolos abertos ({myTickets.length})</span>
                  </Button>
                </CardFooter>
              </Card>
            </div>

            {/* Linha dupla: Formulário de Abertura de Chamado + FAQ */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Formulário de Chamado (col-span-6) */}
              <Card className="lg:col-span-6 border-border shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Send className="w-4 h-4 text-primary" />
                    <span>Abrir Chamado com a Equipe</span>
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Preencha os campos abaixo. Um número de protocolo será gerado automaticamente.
                  </CardDescription>
                </CardHeader>

                <form onSubmit={handleSubmitTicket}>
                  <CardContent className="space-y-4">
                    {submittedFeedback && (
                      <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs space-y-2">
                        <div className="flex items-start gap-2.5">
                          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
                          <div className="space-y-1">
                            <div className="font-bold flex items-center gap-2">
                              <span>Chamado Registrado! Protocolo:</span>
                              <Badge variant="outline" className="font-mono text-xs bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border-emerald-500/30">
                                #{submittedFeedback.protocol}
                              </Badge>
                            </div>
                            <p className="text-[11px] leading-relaxed">{submittedFeedback.text}</p>
                          </div>
                        </div>
                        <div className="pt-2 border-t border-emerald-500/20 flex justify-end">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setActiveTab('chamados')}
                            className="text-[11px] h-7 gap-1 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
                          >
                            <FileText className="w-3 h-3" />
                            <span>Ver Histórico do Protocolo</span>
                          </Button>
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1.5">
                        Assunto da Solicitação *
                      </label>
                      <Input
                        type="text"
                        required
                        placeholder="Ex: Dúvida sobre horários dos barbeiros, erro ao cadastrar serviço..."
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        className="text-xs"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1.5">
                        Categoria da Dúvida
                      </label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full h-10 px-3 bg-background border border-input rounded-md text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="DUVIDA">Dúvida Operacional / Configuração</option>
                        <option value="HORARIOS">Horários de Atendimento & Barbeiros</option>
                        <option value="AGENDAMENTO">Problema com Agendamentos</option>
                        <option value="FINANCEIRO">Financeiro, Gastos ou Assinatura</option>
                        <option value="SUGESTAO">Sugestão de Nova Funcionalidade</option>
                        <option value="OUTRO">Outro Assunto</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1.5">
                        Mensagem Detalhada *
                      </label>
                      <textarea
                        rows={4}
                        required
                        placeholder="Descreva com o máximo de detalhes como podemos te ajudar..."
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        className="w-full p-3 rounded-md border border-input bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </CardContent>

                  <CardFooter className="border-t border-border/60 pt-3 flex justify-between items-center">
                    <span className="text-[11px] text-muted-foreground">
                      Identificado como: <strong>{user?.name || user?.email || 'Administrador'}</strong>
                    </span>
                    <Button type="submit" size="sm" disabled={isSubmitting} className="text-xs gap-1.5">
                      <Send className="w-3.5 h-3.5" />
                      <span>{isSubmitting ? 'Gerando protocolo...' : 'Enviar Chamado'}</span>
                    </Button>
                  </CardFooter>
                </form>
              </Card>

              {/* FAQ (col-span-6) */}
              <div className="lg:col-span-6 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileQuestion className="w-5 h-5 text-primary" />
                  <h2 className="text-base font-bold text-foreground">Perguntas Frequentes (FAQ)</h2>
                </div>

                <div className="space-y-3">
                  {FAQ_LIST.map((faq, index) => {
                    const isOpen = openFaqIndex === index

                    return (
                      <Card key={index} className="border-border shadow-sm overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                          className="w-full p-4 text-left flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
                        >
                          <span className="text-xs sm:text-sm font-semibold text-foreground">
                            {faq.question}
                          </span>
                          <ChevronDown
                            className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
                              isOpen ? 'rotate-180' : ''
                            }`}
                          />
                        </button>

                        {isOpen && (
                          <CardContent className="pt-0 pb-4 text-xs text-muted-foreground leading-relaxed border-t border-border/40 bg-muted/10">
                            <div className="pt-3">{faq.answer}</div>
                          </CardContent>
                        )}
                      </Card>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================ */}
        {/* ABA 2: MEUS CHAMADOS & PROTOCOLOS                            */}
        {/* ============================================================ */}
        {activeTab === 'chamados' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  <span>Histórico de Chamados & Protocolos</span>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Acompanhe em tempo real o andamento das suas solicitações e as respostas oficiais da equipe de suporte.
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={fetchMyTickets}
                disabled={isFetchingTickets}
                className="gap-1.5 text-xs h-8"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isFetchingTickets ? 'animate-spin' : ''}`} />
                <span>Atualizar</span>
              </Button>
            </div>

            {isFetchingTickets ? (
              <div className="flex items-center justify-center py-16 text-muted-foreground text-xs">
                <RefreshCw className="w-5 h-5 animate-spin text-primary mr-2" />
                Carregando seus chamados...
              </div>
            ) : myTickets.length === 0 ? (
              <Card className="p-12 text-center border-dashed border-border">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1">
                  Nenhum chamado aberto no momento
                </h3>
                <p className="text-xs text-muted-foreground max-w-md mx-auto mb-4">
                  Sempre que você precisar de ajuda técnica, ajustes ou tiver dúvidas, abra um chamado na aba "Abrir Chamado" e acompanhe seu protocolo por aqui.
                </p>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setActiveTab('abrir')}
                  className="gap-2 text-xs"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Abrir Meu Primeiro Chamado</span>
                </Button>
              </Card>
            ) : (
              <div className="space-y-4">
                {myTickets.map((tkt) => {
                  const createdDate = new Date(tkt.createdAt).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })

                  return (
                    <Card key={tkt.id} className="border-border shadow-sm overflow-hidden">
                      {/* Topo do Card com Protocolo e Status */}
                      <CardHeader className="p-4 sm:p-5 border-b border-border/60 bg-muted/20">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="text-xs text-muted-foreground font-semibold">Protocolo:</span>
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

                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {createdDate}
                            </span>
                          </div>

                          <div>
                            {tkt.status === 'OPEN' && (
                              <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs">
                                Aberto (Em Fila)
                              </Badge>
                            )}
                            {tkt.status === 'IN_PROGRESS' && (
                              <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 text-xs">
                                Em Análise Técnica
                              </Badge>
                            )}
                            {tkt.status === 'ANSWERED' && (
                              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs">
                                Respondido pelo Suporte
                              </Badge>
                            )}
                            {tkt.status === 'RESOLVED' && (
                              <Badge className="bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30 text-xs">
                                Resolvido / Concluído
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="pt-2">
                          <h3 className="text-sm sm:text-base font-bold text-foreground">
                            {tkt.subject}
                          </h3>
                        </div>
                      </CardHeader>

                      {/* Conteúdo da Mensagem e da Resposta */}
                      <CardContent className="p-4 sm:p-5 space-y-4">
                        {/* Mensagem Enviada pelo Solicitante */}
                        <div>
                          <div className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground mb-1.5">
                            Sua Solicitação:
                          </div>
                          <div className="p-3.5 rounded-lg bg-muted/30 border border-border/70 text-xs text-foreground leading-relaxed whitespace-pre-wrap">
                            {tkt.message}
                          </div>
                        </div>

                        {/* Parecer / Resposta do Suporte */}
                        {tkt.response ? (
                          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-2">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                                <Sparkles className="w-4 h-4" />
                                <span>Resposta Oficial do Suporte ({tkt.respondedBy || 'Equipe Técnica'}):</span>
                              </div>
                              {tkt.respondedAt && (
                                <span className="text-[11px] text-emerald-600/80 dark:text-emerald-400/80 font-mono">
                                  {new Date(tkt.respondedAt).toLocaleString('pt-BR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              )}
                            </div>

                            <div className="text-xs text-foreground leading-relaxed whitespace-pre-wrap font-medium">
                              {tkt.response}
                            </div>

                            <div className="pt-2 border-t border-emerald-500/20 text-[11px] text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              <span>Esta resposta também foi encaminhada para a sua caixa de entrada no e-mail.</span>
                            </div>
                          </div>
                        ) : (
                          <div className="p-3.5 rounded-lg bg-blue-500/5 border border-blue-500/20 text-xs text-blue-600 dark:text-blue-400 flex items-center gap-2.5">
                            <Clock className="w-4 h-4 shrink-0 text-blue-500" />
                            <span>
                              Aguardando parecer da equipe técnica. Assim que respondido, o retorno aparecerá aqui e chegará no seu e-mail cadastrado.
                            </span>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
