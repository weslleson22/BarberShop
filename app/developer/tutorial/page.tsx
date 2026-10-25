'use client'

import { useState, useEffect } from 'react'
import DropdownHeader from '@/components/shared/DropdownHeader'
import { useAuth } from '@/lib/auth-context'
import {
  GraduationCap,
  Plus,
  Video,
  Youtube,
  Trash2,
  Edit2,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Play,
  Clock,
  Sparkles,
  Layers,
  X,
  Sliders,
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
import { extractYouTubeEmbedUrl, type DeveloperTutorial } from '@/lib/developer-tutorials'

export default function DeveloperTutorialPage() {
  const { user } = useAuth()

  const [tutorials, setTutorials] = useState<DeveloperTutorial[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Modal para Criar / Editar Tutorial
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    category: 'Geral',
    description: '',
    youtubeUrl: '',
    duration: '3 min',
    order: 1,
  })
  const [isSaving, setIsSaving] = useState(false)
  const [modalFeedback, setModalFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const fetchTutorials = async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/developer/tutorials')
      if (res.ok) {
        const data = await res.json()
        setTutorials(data.tutorials || [])
      }
    } catch (err) {
      console.error('Erro ao carregar tutoriais:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTutorials()
  }, [])

  const handleOpenNewModal = () => {
    setEditingId(null)
    setFormData({
      title: '',
      category: 'Horários & Escala',
      description: '',
      youtubeUrl: '',
      duration: '3 min',
      order: tutorials.length + 1,
    })
    setModalFeedback(null)
    setIsModalOpen(true)
  }

  const handleOpenEditModal = (tut: DeveloperTutorial) => {
    setEditingId(tut.id)
    setFormData({
      title: tut.title,
      category: tut.category,
      description: tut.description,
      youtubeUrl: tut.youtubeUrl,
      duration: tut.duration || '3 min',
      order: tut.order,
    })
    setModalFeedback(null)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setEditingId(null)
    setModalFeedback(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim() || !formData.youtubeUrl.trim()) {
      alert('Por favor, preencha o título e o link do vídeo do YouTube.')
      return
    }

    setIsSaving(true)
    setModalFeedback(null)

    try {
      const method = editingId ? 'PUT' : 'POST'
      const payload = editingId ? { id: editingId, ...formData } : formData

      const res = await fetch('/api/developer/tutorials', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao salvar tutorial')
      }

      setModalFeedback({
        type: 'success',
        text: editingId ? 'Tutorial atualizado com sucesso!' : 'Novo tutorial cadastrado com sucesso!',
      })

      fetchTutorials()
      setTimeout(() => {
        setIsModalOpen(false)
      }, 1000)
    } catch (err: any) {
      setModalFeedback({
        type: 'error',
        text: err.message || 'Erro ao salvar tutorial.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Deseja realmente remover o tutorial "${title}"?`)) {
      return
    }

    try {
      const res = await fetch(`/api/developer/tutorials?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setTutorials((prev) => prev.filter((t) => t.id !== id))
      } else {
        const data = await res.json()
        alert(data.error || 'Erro ao remover tutorial')
      }
    } catch (err) {
      alert('Erro ao excluir tutorial.')
    }
  }

  const embedPreviewUrl = extractYouTubeEmbedUrl(formData.youtubeUrl)

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 pt-20">
      <DropdownHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header */}
        <div className="border-b border-border pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
              <Youtube className="w-7 h-7 text-red-500" />
              Gestão de Tutoriais em Vídeo
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handleOpenNewModal}
              className="gap-2 text-xs h-9"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Tutorial em Vídeo</span>
            </Button>
          </div>
        </div>

        {/* Informações Rápidas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-border shadow-sm p-4">
            <div className="text-xs text-muted-foreground font-medium">Tutoriais em Vídeo</div>
            <div className="text-2xl font-black text-foreground mt-1">{tutorials.length}</div>
          </Card>

          <Card className="border-border shadow-sm p-4 bg-red-500/5 border-red-500/20">
            <div className="text-xs text-red-600 dark:text-red-400 font-semibold">Player Embutido</div>
            <div className="text-2xl font-black text-red-600 dark:text-red-400 mt-1">100%</div>
          </Card>

          <Card className="border-border shadow-sm p-4 bg-emerald-500/5 border-emerald-500/20">
            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">Visualização ao Cliente</div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">Ativa</div>
          </Card>
        </div>

        {/* Lista de Tutoriais Cadastrados */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground text-xs">
            <RefreshCw className="w-5 h-5 animate-spin text-primary mr-2" />
            Carregando tutoriais...
          </div>
        ) : tutorials.length === 0 ? (
          <Card className="p-12 text-center border-dashed border-border">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
              <Video className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-1">
              Nenhum vídeo cadastrado no momento
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-4">
              Clique no botão abaixo para adicionar seu primeiro link do YouTube com orientações para os barbeiros e administradores.
            </p>
            <Button
              type="button"
              size="sm"
              onClick={handleOpenNewModal}
              className="gap-2 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Cadastrar Primeiro Vídeo</span>
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tutorials.map((tut) => (
              <Card key={tut.id} className="border-border shadow-sm overflow-hidden flex flex-col justify-between hover:border-primary/40 transition-all">
                {/* Player ou Preview do Vídeo do YouTube */}
                <div className="relative w-full aspect-video bg-black/90 border-b border-border">
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
                      <Youtube className="w-8 h-8 text-red-500 mb-1" />
                      <span>Sem preview de vídeo</span>
                    </div>
                  )}
                </div>

                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary border-primary/20">
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

                  <CardDescription className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {tut.description || 'Sem descrição informada.'}
                  </CardDescription>
                </CardHeader>

                <CardFooter className="p-4 pt-2 border-t border-border/50 flex items-center justify-between">
                  <span className="text-[11px] font-mono text-muted-foreground">
                    Ordem #{tut.order}
                  </span>

                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEditModal(tut)}
                      className="h-8 px-2.5 text-xs gap-1"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(tut.id, tut.title)}
                      className="h-8 px-2 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {/* Modal de Cadastro / Edição de Tutorial */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <Card className="max-w-xl w-full border-border shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              <CardHeader className="p-5 border-b border-border flex flex-row items-center justify-between">
                <div>
                  <Badge variant="secondary" className="gap-1 font-semibold text-[10px] mb-1 bg-primary/10 text-primary border-primary/20">
                    <Youtube className="w-3 h-3 text-red-500" />
                    Tutorial em Vídeo
                  </Badge>
                  <CardTitle className="text-lg font-bold text-foreground">
                    {editingId ? 'Editar Tutorial' : 'Novo Tutorial em Vídeo'}
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

              <form onSubmit={handleSubmit}>
                <CardContent className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
                  {modalFeedback && (
                    <div
                      className={`p-3.5 rounded-lg text-xs flex items-start gap-2.5 border ${
                        modalFeedback.type === 'success'
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20'
                          : 'bg-destructive/10 text-destructive border-destructive/20'
                      }`}
                    >
                      {modalFeedback.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                      )}
                      <span>{modalFeedback.text}</span>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      Título do Tutorial *
                    </label>
                    <Input
                      type="text"
                      required
                      placeholder="Ex: Como Configurar os Horários de Atendimento da Barbearia"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1.5">
                        Categoria
                      </label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full h-9 px-3 bg-background border border-input rounded-md text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        <option value="Horários & Escala">Horários & Escala</option>
                        <option value="Perfil & Link">Perfil & Link</option>
                        <option value="Serviços">Serviços & Preços</option>
                        <option value="Financeiro & Gastos">Financeiro & Gastos</option>
                        <option value="Agenda">Agenda & Agendamentos</option>
                        <option value="Geral">Geral & Onboarding</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-foreground mb-1.5">
                        Duração Estimada
                      </label>
                      <Input
                        type="text"
                        placeholder="Ex: 3 min, 5 min"
                        value={formData.duration}
                        onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                        className="text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      Link do Vídeo do YouTube *
                    </label>
                    <Input
                      type="url"
                      required
                      placeholder="https://www.youtube.com/watch?v=... ou https://youtu.be/..."
                      value={formData.youtubeUrl}
                      onChange={(e) => setFormData({ ...formData, youtubeUrl: e.target.value })}
                      className="text-xs font-mono"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Aceita formatos como youtube.com/watch?v=ID, youtu.be/ID ou shorts/ID. O sistema converterá automaticamente para o player.
                    </p>
                  </div>

                  {/* Prévia Imediata do Player do YouTube */}
                  {embedPreviewUrl && (
                    <div className="rounded-xl overflow-hidden border border-border bg-black/90">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-3 py-1.5 bg-muted/40 border-b border-border flex items-center gap-1.5">
                        <Play className="w-3 h-3 text-red-500 fill-red-500" />
                        <span>Prévia do Vídeo:</span>
                      </div>
                      <div className="w-full aspect-video">
                        <iframe
                          src={embedPreviewUrl}
                          title="Prévia do vídeo"
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      Descrição / Instruções do Tutorial
                    </label>
                    <textarea
                      rows={3}
                      placeholder="Explique resumidamente o objetivo deste vídeo..."
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full p-3 rounded-md border border-input bg-background text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring leading-relaxed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-foreground mb-1.5">
                      Ordem de Exibição
                    </label>
                    <Input
                      type="number"
                      min={1}
                      value={formData.order}
                      onChange={(e) => setFormData({ ...formData, order: Number(e.target.value) })}
                      className="text-xs w-28"
                    />
                  </div>
                </CardContent>

                <CardFooter className="p-4 border-t border-border flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCloseModal}
                    className="text-xs"
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={isSaving}
                    className="text-xs gap-1.5"
                  >
                    <Youtube className="w-3.5 h-3.5 text-red-500" />
                    <span>{isSaving ? 'Salvando...' : editingId ? 'Atualizar Tutorial' : 'Cadastrar Vídeo'}</span>
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
