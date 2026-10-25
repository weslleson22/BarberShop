'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import DropdownHeader from '@/components/shared/DropdownHeader'
import { useAuth } from '@/lib/auth-context'
import { getAuthHeaders } from '@/lib/utils'
import {
  Database,
  ShieldCheck,
  Clock,
  HardDrive,
  Download,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Lock,
  FileArchive,
  Layers,
  Cloud,
} from 'lucide-react'

interface BackupItem {
  filename: string
  key?: string
  sizeBytes: number
  createdAt: string
  isEncrypted: boolean
  storage?: string
  status: string
}

interface BackupResponse {
  backups: BackupItem[]
  lastBackup: BackupItem | null
  nextScheduledBackup: string
  scheduleDescription?: string
  encryption: string
  storageDestination?: string
  targetRpoHours: number
  targetRtoMinutes: number
  r2Status?: string
  bucket?: string
}

export default function DeveloperBackupPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()

  const [data, setData] = useState<BackupResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [isExecuting, setIsExecuting] = useState(false)
  const [restoreModalOpen, setRestoreModalOpen] = useState(false)
  const [selectedBackup, setSelectedBackup] = useState<BackupItem | null>(null)
  const [confirmationCode, setConfirmationCode] = useState('')
  const [isRestoring, setIsRestoring] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string; details?: any } | null>(null)

  useEffect(() => {
    if (!authLoading && user?.role !== 'DEVELOPER') {
      router.replace('/dashboard')
    }
  }, [user, authLoading, router])

  const fetchBackups = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/developer/backup', {
        headers: getAuthHeaders(),
        credentials: 'include',
      })
      if (res.ok) {
        const json = await res.json()
        setData(json)
      } else {
        const err = await res.json().catch(() => ({}))
        setFeedback({ type: 'error', message: err.error || 'Erro ao carregar backups' })
      }
    } catch {
      setFeedback({ type: 'error', message: 'Erro de conexão ao carregar backups' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user?.role === 'DEVELOPER') {
      fetchBackups()
    }
  }, [user])

  const handleCreateBackup = async () => {
    setIsExecuting(true)
    setFeedback(null)
    try {
      const res = await fetch('/api/developer/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        credentials: 'include',
        body: JSON.stringify({ action: 'create' }),
      })

      const result = await res.json()
      if (res.ok) {
        setFeedback({
          type: 'success',
          message: `Backup ${result.filePath} gerado com sucesso (${formatBytes(result.finalSizeBytes)}).`,
        })
        await fetchBackups()
      } else {
        setFeedback({ type: 'error', message: result.error || 'Falha ao executar backup' })
      }
    } catch {
      setFeedback({ type: 'error', message: 'Erro ao conectar ao servidor para gerar backup' })
    } finally {
      setIsExecuting(false)
    }
  }

  const handleRestoreSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedBackup || confirmationCode !== 'RESTAURAR-BACKUP') return

    setIsRestoring(true)
    setFeedback(null)
    try {
      const res = await fetch('/api/developer/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'restore',
          filename: selectedBackup.filename,
          confirmationCode,
        }),
      })

      const result = await res.json()
      if (res.ok) {
        setFeedback({
          type: 'success',
          message: result.message,
          details: result.details,
        })
        setRestoreModalOpen(false)
        setSelectedBackup(null)
        setConfirmationCode('')
      } else {
        setFeedback({ type: 'error', message: result.error || 'Erro na validação do restore' })
      }
    } catch {
      setFeedback({ type: 'error', message: 'Erro ao processar restauração de teste' })
    } finally {
      setIsRestoring(false)
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return isNaN(d.getTime()) ? '-' : d.toLocaleString('pt-BR')
  }

  if (authLoading || user?.role !== 'DEVELOPER') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-950 text-white">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 pt-20 transition-colors">
      <DropdownHeader
        title="Backup & Restore"
        subtitle="Disaster Recovery, snapshots diários e validação de integridade no Cloudflare R2"
      />

      <main className="w-full px-4 md:px-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border p-6 rounded-xl shadow-xs">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-primary/10 text-primary font-semibold text-xs uppercase tracking-wider border border-primary/20">
                <ShieldCheck className="w-3.5 h-3.5" />
                Disaster Recovery & SRE
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">Gestão de Backup & Restore</h1>
            <p className="text-sm text-muted-foreground mt-1 font-normal">
              Snapshots criptografados do banco de dados, integridade e teste de restauração em schemas isolados.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchBackups}
              disabled={loading || isExecuting}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs md:text-sm font-medium rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-all shadow-xs cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
            <button
              onClick={handleCreateBackup}
              disabled={isExecuting || loading}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs md:text-sm font-medium rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs transition-all disabled:opacity-50 cursor-pointer"
            >
              <Database className="w-4 h-4" />
              <span>{isExecuting ? 'Gerando snapshot...' : 'Executar Backup Agora'}</span>
            </button>
          </div>
        </div>

        {/* Feedback Banner */}
        {feedback && (
          <div
            className={`p-4 rounded-xl border text-sm flex items-start justify-between gap-3 ${
              feedback.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
                : 'bg-destructive/10 border-destructive/30 text-destructive'
            }`}
          >
            <div className="flex items-start gap-2.5 font-semibold">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-bold">{feedback.message}</p>
                {feedback.details && (
                  <p className="text-xs mt-1 font-mono opacity-90">
                    Schema: {feedback.details.schema} | Registros: {feedback.details.totalRecords} | Tempo: {feedback.details.durationMs}ms
                  </p>
                )}
              </div>
            </div>
            <button onClick={() => setFeedback(null)} className="hover:opacity-75 text-sm font-bold px-2 py-1 cursor-pointer">
              ✕
            </button>
          </div>
        )}

        {/* Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Último Backup</span>
              <Clock className="w-4 h-4 text-primary" />
            </div>
            <div className="text-lg font-bold text-card-foreground">
              {data?.lastBackup ? formatDate(data.lastBackup.createdAt) : 'Nenhum'}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-semibold border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Sucesso
              </span>
              {data?.lastBackup && (
                <span className="text-xs text-muted-foreground font-mono font-medium">
                  ({formatBytes(data.lastBackup.sizeBytes)})
                </span>
              )}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Backup Automático</span>
              <RotateCcw className="w-4 h-4 text-primary" />
            </div>
            <div className="text-lg font-bold text-card-foreground">Diário às 00:30</div>
            <span className="text-xs text-muted-foreground font-normal mt-2 block">
              Vercel Cron & node-cron ativo (00:30 BRT)
            </span>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Destino Cloud</span>
              <Cloud className="w-4 h-4 text-primary" />
            </div>
            <div className="text-lg font-bold text-card-foreground">Cloudflare R2</div>
            <span className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold mt-2 block truncate" title={data?.bucket || 'barbershop-backups-prod'}>
              Bucket: {data?.bucket || 'barbershop-backups-prod'}
            </span>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 shadow-xs">
            <div className="flex items-center justify-between text-muted-foreground mb-2">
              <span className="text-xs font-semibold uppercase tracking-wider">Metas RPO / RTO</span>
              <Layers className="w-4 h-4 text-primary" />
            </div>
            <div className="text-lg font-bold text-card-foreground">RPO: {data?.targetRpoHours || 24}h</div>
            <span className="text-xs text-muted-foreground font-normal mt-2 block">
              RTO Alvo: &lt; {data?.targetRtoMinutes || 15} min (.sql.gz)
            </span>
          </div>
        </div>

        {/* Backups List Table */}
        <div className="bg-card border border-border rounded-xl p-6 shadow-xs">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-card-foreground">Histórico de Snapshots</h2>
              <p className="text-sm text-muted-foreground font-normal mt-0.5">Arquivos versionados armazenados no Cloudflare R2 com redundância e integridade.</p>
            </div>
            <FileArchive className="w-5 h-5 text-muted-foreground" />
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-14 bg-muted/50 rounded-xl animate-pulse border border-border" />
              ))}
            </div>
          ) : !data || data.backups.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border rounded-xl bg-muted/20">
              <Database className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-70" />
              <p className="text-sm font-semibold text-card-foreground">Nenhum backup encontrado.</p>
              <p className="text-xs text-muted-foreground mt-0.5">Clique em &quot;Executar Backup Agora&quot; para criar o primeiro snapshot no Cloudflare R2.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <th className="py-3.5 px-4 font-semibold">Arquivo</th>
                    <th className="py-3.5 px-3 font-semibold">Data / Hora</th>
                    <th className="py-3.5 px-3 font-semibold">Tamanho</th>
                    <th className="py-3.5 px-3 font-semibold">Destino</th>
                    <th className="py-3.5 px-3 font-semibold">Status</th>
                    <th className="py-3.5 px-4 text-right font-semibold">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {data.backups.map((item) => (
                    <tr key={item.filename} className="hover:bg-muted/50 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-xs text-foreground font-semibold">
                        {item.filename}
                      </td>
                      <td className="py-3.5 px-3 text-muted-foreground text-xs font-normal">{formatDate(item.createdAt)}</td>
                      <td className="py-3.5 px-3 font-mono text-xs text-foreground font-semibold">{formatBytes(item.sizeBytes)}</td>
                      <td className="py-3.5 px-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded bg-primary/10 text-primary border border-primary/20">
                          <Cloud className="w-3 h-3" />
                          {item.storage || 'Cloudflare R2'}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="px-2.5 py-0.5 text-xs font-semibold rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                          ● Válido
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right flex items-center justify-end gap-2">
                        <a
                          href={`/api/developer/backup?download=${encodeURIComponent(item.filename)}`}
                          download
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-border bg-background hover:bg-muted text-foreground transition-all shadow-xs"
                          title="Baixar arquivo de backup"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Baixar
                        </a>
                        <button
                          onClick={() => {
                            setSelectedBackup(item)
                            setConfirmationCode('')
                            setRestoreModalOpen(true)
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 transition-all shadow-xs cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Testar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Secure Restore Confirmation Modal */}
        {restoreModalOpen && selectedBackup && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-xs">
            <div className="bg-card border border-destructive/40 rounded-xl p-6 md:p-8 max-w-lg w-full space-y-6 shadow-2xl text-card-foreground">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-card-foreground">Confirmar Operação de Restauração</h3>
                  <p className="text-xs text-muted-foreground font-normal mt-1">
                    Esta operação valida e restaura os dados em um schema PostgreSQL isolado para auditoria e teste de integridade.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-muted/40 border border-border text-xs space-y-2 font-mono">
                <div><strong className="text-foreground">Arquivo:</strong> {selectedBackup.filename}</div>
                <div><strong className="text-foreground">Tamanho:</strong> {formatBytes(selectedBackup.sizeBytes)}</div>
                <div><strong className="text-foreground">Criado em:</strong> {formatDate(selectedBackup.createdAt)}</div>
                <div className="text-amber-700 dark:text-amber-400 font-sans font-semibold pt-1">
                  ⚠️ Nenhuma credencial nem chave secreta é exposta nesta operação.
                </div>
              </div>

              <form onSubmit={handleRestoreSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1.5">
                    Digite exatamente <strong className="text-destructive font-mono">RESTAURAR-BACKUP</strong> para liberar a execução:
                  </label>
                  <input
                    type="text"
                    value={confirmationCode}
                    onChange={(e) => setConfirmationCode(e.target.value)}
                    placeholder="RESTAURAR-BACKUP"
                    className="w-full px-3.5 py-2.5 rounded-lg bg-background border border-input text-foreground font-mono text-sm focus:outline-none focus:ring-1 focus:ring-destructive"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRestoreModalOpen(false)
                      setSelectedBackup(null)
                    }}
                    className="px-4 py-2 text-xs md:text-sm rounded-lg border border-border bg-background hover:bg-muted text-foreground font-medium cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={confirmationCode !== 'RESTAURAR-BACKUP' || isRestoring}
                    className="px-5 py-2 text-xs md:text-sm rounded-lg bg-destructive text-destructive-foreground font-medium hover:bg-destructive/90 shadow-xs transition-all disabled:opacity-40 flex items-center gap-2 cursor-pointer"
                  >
                    {isRestoring ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current" />
                    ) : (
                      <RotateCcw className="w-4 h-4" />
                    )}
                    <span>{isRestoring ? 'Restaurando e Validando...' : 'Confirmar e Executar'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
