'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import DropdownHeader from '@/components/shared/DropdownHeader'
import {
  GraduationCap,
  Sparkles,
  BookOpen,
  Calendar,
  Clock,
  Scissors,
  Users,
  DollarSign,
  TrendingDown,
  ExternalLink,
  ChevronRight,
  CheckCircle2,
  Store,
  Share2,
  HelpCircle,
  Lightbulb,
  Search,
  Sliders,
  Receipt,
  Video,
  Youtube,
  Play,
  RefreshCw,
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
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { type DeveloperTutorial } from '@/lib/developer-tutorials'

interface TutorialGuide {
  id: string
  title: string
  category: 'CONFIG' | 'SCHEDULE' | 'SERVICES' | 'FINANCE' | 'CLIENTS'
  timeToRead: string
  description: string
  linkText: string
  linkHref: string
  steps: string[]
  tip?: string
}

const TUTORIAL_GUIDES: TutorialGuide[] = [
  {
    id: 'perfil-estabelecimento',
    title: '1. Configurando o Perfil da Barbearia & Link Público',
    category: 'CONFIG',
    timeToRead: '3 min',
    description: 'Configure os dados principais do seu negócio, faça upload da logo oficial e gere seu endereço web exclusivo para clientes agendarem.',
    linkText: 'Acessar Perfil da Barbearia',
    linkHref: '/configuracoes?tab=barbershop',
    steps: [
      'Acesse no menu lateral "Configurações > Perfil do Estabelecimento > Dados da Barbearia".',
      'Preencha o nome fantasia, telefone comercial, endereço completo e uma bio calorosa.',
      'Envie a logo oficial da barbearia (PNG ou JPG) para personalizar a página pública.',
      'Defina o Slug exclusivo (ex: barbearia-estilo) que gera o link https://seusite.com/b/barbearia-estilo.',
      'Copie o link gerado e adicione na bio do Instagram e mensagem automática do WhatsApp Business.',
    ],
    tip: 'Barbearias que divulgam o link com antecedência aumentam em até 40% o volume de atendimentos agendados sem intervenção manual.',
  },
  {
    id: 'horarios-atendimento',
    title: '2. Definindo Horários de Atendimento & Escala dos Profissionais',
    category: 'SCHEDULE',
    timeToRead: '4 min',
    description: 'Configure quando o estabelecimento abre e fecha, e personalize quais dias da semana cada barbeiro da equipe está disponível para atender.',
    linkText: 'Configurar Horários & Escalas',
    linkHref: '/configuracoes?tab=hours',
    steps: [
      'Acesse "Configurações > Perfil do Estabelecimento > Horários de Atendimento".',
      'Na seção "Disponibilidade dos Profissionais", ative o Switch dos barbeiros que estão atendendo.',
      'Clique nos botões de dias (SEG, TER, QUA, QUI, SEX, SÁB, DOM) para marcar quando cada profissional atende ou está de folga.',
      'Use os atalhos rápidos "Todos os Dias" ou "Segunda a Sexta" para preenchimento em lote.',
      'Na "Grade Semanal de Expediente", defina os horários de abertura e fechamento geral da unidade e intervalos de almoço.',
    ],
    tip: 'Se um barbeiro estiver de folga em uma quarta-feira, a página de agendamento bloqueará automaticamente a seleção desse dia para ele.',
  },
  {
    id: 'servicos-precos',
    title: '3. Cadastrando Serviços, Duração e Preços',
    category: 'SERVICES',
    timeToRead: '3 min',
    description: 'Adicione todos os procedimentos da sua barbearia. A duração de cada serviço calcula automaticamente a grade de horários livres.',
    linkText: 'Gerenciar Serviços',
    linkHref: '/servicos',
    steps: [
      'No menu lateral, clique em "Gestão do Negócio > Serviços & Preços".',
      'Clique no botão "Novo Serviço" no canto superior direito.',
      'Informe o nome do serviço (ex: Corte Degradê, Barboterapia, Combo Completo).',
      'Defina o valor em reais (R$) e a duração em minutos (ex: 30 min, 45 min, 60 min).',
      'Adicione uma breve descrição para informar ao cliente o que está incluso no procedimento.',
    ],
    tip: 'A duração define o tamanho exato dos slots na agenda. Se um corte dura 30 minutos, o sistema calcula os intervalos com precisão cirúrgica.',
  },
  {
    id: 'equipe-barbeiros',
    title: '4. Cadastrando e Convidando a Equipe de Barbeiros',
    category: 'CLIENTS',
    timeToRead: '4 min',
    description: 'Crie contas para os barbeiros da barbearia poderem acessar suas próprias agendas e acompanhar comissões em tempo real.',
    linkText: 'Acessar Equipe de Barbeiros',
    linkHref: '/usuarios',
    steps: [
      'Acesse no menu lateral "Gestão do Negócio > Equipe de Barbeiros".',
      'Clique em "Novo Usuário" e preencha o nome, e-mail e telefone do profissional.',
      'Selecione a função "Barbeiro" (BARBER).',
      'Defina uma senha provisória de acesso para ele efetuar login no sistema.',
      'O profissional terá acesso restrito à sua própria agenda e aos relatórios individuais de produtividade.',
    ],
    tip: 'Barbeiros não possuem acesso a configurações globais da unidade nem ao faturamento total da barbearia, garantindo total privacidade gerencial.',
  },
  {
    id: 'gastos-estabelecimento',
    title: '5. Controle de Despesas em "Gastos do Estabelecimento"',
    category: 'FINANCE',
    timeToRead: '3 min',
    description: 'Registre saídas de caixa, aluguel, compras de insumos e controle de estoque para saber exatamente o lucro líquido do seu negócio.',
    linkText: 'Acessar Gastos do Estabelecimento',
    linkHref: '/dashboard/gastos',
    steps: [
      'Acesse "Financeiro & Métricas > Gastos do Estabelecimento".',
      'Clique em "Novo Gasto" para cadastrar uma despesa fixa, variável ou compra de estoque.',
      'Acompanhe o saldo do estoque, controle de validade e alertas de reposição.',
      'Informe o valor, a data de vencimento e marque se já foi Pago ou se está Pendente.',
      'Clique no status diretamente na tabela para alternar entre "Pago" e "Pendente" quando quitar o boleto.',
    ],
    tip: 'Acompanhe na aba "Relatórios & BI" o comparativo entre o faturamento total e seus gastos para manter a barbearia sempre no azul.',
  },
  {
    id: 'agenda-atendimentos',
    title: '6. Gerenciando a Agenda Diária & Google Calendar View',
    category: 'SCHEDULE',
    timeToRead: '4 min',
    description: 'Visualize todos os agendamentos confirmados, acompanhe a fila do dia e crie reservas de balcão rapidamente.',
    linkText: 'Acessar Agenda',
    linkHref: '/agenda',
    steps: [
      'Clique em "Principal > Agenda de Atendimentos".',
      'Alterne entre visualizações Diária, Semanal ou Lista conforme sua preferência.',
      'Clique em qualquer horário vago para adicionar um agendamento rápido de cliente que chegou presencialmente.',
      'Quando o cliente for atendido, mude o status para "Concluído" para alimentar o faturamento do caixa.',
    ],
    tip: 'Você pode filtrar a agenda por profissional para ver apenas os atendimentos de uma cadeira específica.',
  },
]

export default function TutorialPage() {
  // Sub-itens: 'videos' (Tutoriais em Vídeo) ou 'guias' (Guias & Manuais)
  const [activeSubItem, setActiveSubItem] = useState<'videos' | 'guias'>('videos')

  // Estado dos vídeos do YouTube
  const [videoTutorials, setVideoTutorials] = useState<DeveloperTutorial[]>([])
  const [isLoadingVideos, setIsLoadingVideos] = useState(true)
  const [selectedVideoCategory, setSelectedVideoCategory] = useState<string>('ALL')

  // Estado dos guias escritos
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedGuideCategory, setSelectedGuideCategory] = useState<string>('ALL')

  const fetchVideos = async () => {
    setIsLoadingVideos(true)
    try {
      const res = await fetch('/api/developer/tutorials')
      if (res.ok) {
        const data = await res.json()
        setVideoTutorials(data.tutorials || [])
      }
    } catch (err) {
      console.warn('Erro ao carregar tutoriais em vídeo:', err)
    } finally {
      setIsLoadingVideos(false)
    }
  }

  useEffect(() => {
    fetchVideos()
  }, [])

  // Filtragem de vídeos
  const filteredVideos = videoTutorials.filter((v) => {
    if (selectedVideoCategory !== 'ALL' && v.category !== selectedVideoCategory) return false
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim()
      return (
        v.title.toLowerCase().includes(q) ||
        v.description.toLowerCase().includes(q) ||
        v.category.toLowerCase().includes(q)
      )
    }
    return true
  })

  // Categorias únicas dos vídeos
  const videoCategories = Array.from(new Set(videoTutorials.map((v) => v.category)))

  // Filtragem de guias escritos
  const filteredGuides = TUTORIAL_GUIDES.filter((guide) => {
    if (selectedGuideCategory !== 'ALL' && guide.category !== selectedGuideCategory) return false
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim()
      return (
        guide.title.toLowerCase().includes(q) ||
        guide.description.toLowerCase().includes(q) ||
        guide.steps.some((s) => s.toLowerCase().includes(q))
      )
    }
    return true
  })

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 pt-20">
      <DropdownHeader />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary" className="gap-1.5 font-semibold text-xs bg-primary/10 text-primary border-primary/20">
                <GraduationCap className="w-3.5 h-3.5" />
                Central de Treinamento
              </Badge>
              <span className="text-xs text-muted-foreground">• Vídeos & Guias Práticos</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
              <BookOpen className="w-7 h-7 text-primary" />
              Tutoriais & Manual do BarberShop
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Assista a vídeos práticos no YouTube ou leia o manual passo a passo para configurar horários de atendimento, serviços, profissionais e estoque.
            </p>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <Link href="/dashboard/suporte">
              <Button variant="outline" size="sm" className="gap-2 text-xs h-9">
                <HelpCircle className="w-4 h-4 text-primary" />
                <span>Precisa de Ajuda? Fale com Suporte</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Abas Sub-itens: Tutoriais em Vídeo vs Guias Escritos */}
        <div className="flex items-center gap-2 border-b border-border/80 pb-3 overflow-x-auto">
          <Button
            type="button"
            variant={activeSubItem === 'videos' ? 'default' : 'outline'}
            onClick={() => setActiveSubItem('videos')}
            className="gap-2 h-9 text-xs"
          >
            <Youtube className="w-4 h-4 text-red-500" />
            <span>Tutoriais em Vídeo (YouTube)</span>
            {videoTutorials.length > 0 && (
              <Badge variant="secondary" className="font-mono text-[10px] ml-1">
                {videoTutorials.length}
              </Badge>
            )}
          </Button>

          <Button
            type="button"
            variant={activeSubItem === 'guias' ? 'default' : 'outline'}
            onClick={() => setActiveSubItem('guias')}
            className="gap-2 h-9 text-xs"
          >
            <BookOpen className="w-4 h-4" />
            <span>Guias & Manuais de Uso</span>
            <Badge variant="secondary" className="font-mono text-[10px] ml-1">
              {TUTORIAL_GUIDES.length}
            </Badge>
          </Button>
        </div>

        {/* ============================================================ */}
        {/* SUBITEM 1: TUTORIAIS EM VÍDEO (YOUTUBE EMBED)                 */}
        {/* ============================================================ */}
        {activeSubItem === 'videos' && (
          <div className="space-y-6">
            {/* Barra de Filtro de Categorias de Vídeo */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Buscar tutorial em vídeo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 text-xs"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                <Button
                  type="button"
                  variant={selectedVideoCategory === 'ALL' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedVideoCategory('ALL')}
                  className="text-xs h-8"
                >
                  Todos ({videoTutorials.length})
                </Button>
                {videoCategories.map((cat) => (
                  <Button
                    key={cat}
                    type="button"
                    variant={selectedVideoCategory === cat ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedVideoCategory(cat)}
                    className="text-xs h-8 whitespace-nowrap"
                  >
                    {cat}
                  </Button>
                ))}
              </div>
            </div>

            {/* Grid dos Vídeos com Player do YouTube */}
            {isLoadingVideos ? (
              <div className="flex items-center justify-center py-20 text-muted-foreground text-xs">
                <RefreshCw className="w-5 h-5 animate-spin text-primary mr-2" />
                Carregando vídeos tutoriais...
              </div>
            ) : filteredVideos.length === 0 ? (
              <Card className="p-12 text-center border-dashed border-border">
                <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto mb-3">
                  <Youtube className="w-6 h-6" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-1">
                  Nenhum vídeo tutorial encontrado
                </h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Tente alterar os termos da busca ou filtre por outra categoria.
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                {filteredVideos.map((tut) => (
                  <Card key={tut.id} className="border-border shadow-sm overflow-hidden flex flex-col justify-between hover:border-primary/40 transition-all">
                    {/* Player do YouTube Embutido (16:9) */}
                    <div className="relative w-full aspect-video bg-black/95">
                      {tut.embedUrl ? (
                        <iframe
                          src={tut.embedUrl}
                          title={tut.title}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground text-xs">
                          <Youtube className="w-10 h-10 text-red-500 mb-2" />
                          <span>Player de Vídeo Indisponível</span>
                        </div>
                      )}
                    </div>

                    <CardHeader className="p-5 pb-3">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <Badge variant="outline" className="text-[10px] px-2.5 py-0.5 bg-primary/10 text-primary border-primary/20">
                          {tut.category}
                        </Badge>
                        <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3" />
                          {tut.duration || '3 min'}
                        </span>
                      </div>

                      <CardTitle className="text-base font-bold text-foreground leading-snug">
                        {tut.title}
                      </CardTitle>

                      <CardDescription className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                        {tut.description || 'Assista a esta demonstração prática para tirar suas dúvidas e aproveitar ao máximo os recursos do sistema.'}
                      </CardDescription>
                    </CardHeader>

                    <CardFooter className="p-5 pt-2 border-t border-border/50 flex items-center justify-between">
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                        <Play className="w-3 h-3 text-red-500 fill-red-500" />
                        <span>Vídeo Tutorial</span>
                      </span>

                      {tut.youtubeUrl && (
                        <a
                          href={tut.youtubeUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-primary hover:underline inline-flex items-center gap-1 font-medium"
                        >
                          <span>Assistir no YouTube</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ============================================================ */}
        {/* SUBITEM 2: GUIAS & MANUAIS ESCRITOS                           */}
        {/* ============================================================ */}
        {activeSubItem === 'guias' && (
          <div className="space-y-6">
            {/* Barra de Busca e Filtros de Categoria */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Buscar guia ou funcionalidade..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 text-xs"
                />
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                <Button
                  type="button"
                  variant={selectedGuideCategory === 'ALL' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedGuideCategory('ALL')}
                  className="text-xs h-8"
                >
                  Todos
                </Button>
                <Button
                  type="button"
                  variant={selectedGuideCategory === 'CONFIG' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedGuideCategory('CONFIG')}
                  className="text-xs h-8"
                >
                  Perfil & Link
                </Button>
                <Button
                  type="button"
                  variant={selectedGuideCategory === 'SCHEDULE' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedGuideCategory('SCHEDULE')}
                  className="text-xs h-8"
                >
                  Horários & Escala
                </Button>
                <Button
                  type="button"
                  variant={selectedGuideCategory === 'SERVICES' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedGuideCategory('SERVICES')}
                  className="text-xs h-8"
                >
                  Serviços
                </Button>
                <Button
                  type="button"
                  variant={selectedGuideCategory === 'FINANCE' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedGuideCategory('FINANCE')}
                  className="text-xs h-8"
                >
                  Financeiro & Gastos
                </Button>
              </div>
            </div>

            {/* Lista de Guias */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredGuides.map((guide) => (
                <Card key={guide.id} className="border-border shadow-sm flex flex-col justify-between hover:border-border/80 transition-all">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-muted/30">
                        Leitura: {guide.timeToRead}
                      </Badge>
                      <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">
                        {guide.category === 'CONFIG' && 'Configuração'}
                        {guide.category === 'SCHEDULE' && 'Horários & Agenda'}
                        {guide.category === 'SERVICES' && 'Catálogo de Serviços'}
                        {guide.category === 'FINANCE' && 'Gestão Financeira'}
                        {guide.category === 'CLIENTS' && 'Equipe & Clientes'}
                      </span>
                    </div>
                    <CardTitle className="text-base font-bold text-foreground leading-snug">
                      {guide.title}
                    </CardTitle>
                    <CardDescription className="text-xs text-muted-foreground mt-1">
                      {guide.description}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-3 pt-0">
                    <div className="space-y-2 rounded-xl bg-muted/30 p-3.5 border border-border/60">
                      <span className="text-xs font-semibold text-foreground block mb-1">
                        Passo a Passo Prático:
                      </span>
                      {guide.steps.map((step, idx) => (
                        <div key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <span className="w-4 h-4 rounded-full bg-primary/10 text-primary font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <span>{step}</span>
                        </div>
                      ))}
                    </div>

                    {guide.tip && (
                      <div className="p-3 rounded-xl bg-primary/5 border border-primary/15 flex items-start gap-2.5 text-xs text-muted-foreground">
                        <Lightbulb className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                        <span>
                          <strong className="text-foreground font-semibold">Dica de Sucesso:</strong>{' '}
                          {guide.tip}
                        </span>
                      </div>
                    )}
                  </CardContent>

                  <CardFooter className="pt-2 border-t border-border/50 flex justify-end">
                    <Link href={guide.linkHref} className="w-full sm:w-auto">
                      <Button variant="outline" size="sm" className="w-full gap-2 text-xs h-8">
                        <span>{guide.linkText}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
