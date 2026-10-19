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
    <div className="min-h-screen bg-gray-950 text-white pb-20 pt-20">
      <DropdownHeader
        title="Backup & Restore"
        subtitle="Disaster Recovery, snapshots diários e validação de integridade no Cloudflare R2"
      />

      <main className="w-full px-4 md:px-8 max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#111827] border border-[#374151] p-6 rounded-xl">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#2563eb] text-white font-bold text-xs uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5" />
                Disaster Recovery & SRE
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white">Gestão de Backup & Restore</h1>
            <p className="text-sm text-gray-200 mt-1 font-medium">
              Snapshots criptografados do banco de dados, integridade e teste de restauração em schemas isolados.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchBackups}
              disabled={loading || isExecuting}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs md:text-sm font-bold rounded-lg border border-[#4b5563] bg-[#1f2937] hover:bg-[#374151] text-white transition-all shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
            <button
              onClick={handleCreateBackup}
              disabled={isExecuting || loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-xs md:text-sm font-bold rounded-lg bg-[#2563eb] hover:bg-blue-600 text-white border border-[#3b82f6] shadow-sm transition-all disabled:opacity-50"
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
                ? 'bg-[#059669] border-[#10b981] text-white'
                : 'bg-[#dc2626] border-[#ef4444] text-white'
            }`}
          >
            <div className="flex items-start gap-2.5 font-bold">
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-white shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-white shrink-0 mt-0.5" />
              )}
              <div>
                <p className="font-extrabold">{feedback.message}</p>
                {feedback.details && (
                  <p className="text-xs mt-1 font-mono text-gray-200">
                    Schema: {feedback.details.schema} | Registros: {feedback.details.totalRecords} | Tempo: {feedback.details.durationMs}ms
                  </p>
                )}
              </div>
            </div>
            <button onClick={() => setFeedback(null)} className="text-white hover:text-gray-200 text-sm font-bold px-2 py-1">
              ✕
            </button>
          </div>
        )}

        {/* Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#111827] border border-[#374151] rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-gray-300 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Último Backup</span>
              <Clock className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-lg font-black text-white">
              {data?.lastBackup ? formatDate(data.lastBackup.createdAt) : 'Nenhum'}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className="inline-flex items-center gap-1.5 text-xs text-white bg-[#059669] px-2 py-0.5 rounded font-bold border border-[#10b981]">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                Sucesso
              </span>
              {data?.lastBackup && (
                <span className="text-xs text-gray-200 font-mono font-bold">
                  ({formatBytes(data.lastBackup.sizeBytes)})
                </span>
              )}
            </div>
          </div>

          <div className="bg-[#111827] border border-[#374151] rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-gray-300 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Backup Automático</span>
              <RotateCcw className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-lg font-black text-white">Diário às 00:30</div>
            <span className="text-xs text-gray-200 font-medium mt-2 block">
              Vercel Cron & node-cron ativo (00:30 BRT)
            </span>
          </div>

          <div className="bg-[#111827] border border-[#374151] rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-gray-300 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Destino Cloud</span>
              <Cloud className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-lg font-black text-white">Cloudflare R2</div>
            <span className="text-xs text-emerald-400 font-bold mt-2 block truncate" title={data?.bucket || 'barbershop-backups-prod'}>
              Bucket: {data?.bucket || 'barbershop-backups-prod'}
            </span>
          </div>

          <div className="bg-[#111827] border border-[#374151] rounded-xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-gray-300 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Metas RPO / RTO</span>
              <Layers className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-lg font-black text-white">RPO: {data?.targetRpoHours || 24}h</div>
            <span className="text-xs text-gray-200 font-medium mt-2 block">
              RTO Alvo: &lt; {data?.targetRtoMinutes || 15} min (.sql.gz)
            </span>
          </div>
        </div>

        {/* Backups List Table */}
        <div className="bg-[#111827] border border-[#374151] rounded-xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-extrabold text-white">Histórico de Snapshots</h2>
              <p className="text-sm text-gray-200 font-medium mt-0.5">Arquivos versionados armazenados no Cloudflare R2 com redundância e integridade.</p>
            </div>
            <FileArchive className="w-5 h-5 text-gray-300" />
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-14 bg-[#030712] rounded-xl animate-pulse border border-[#374151]" />
              ))}
            </div>
          ) : !data || data.backups.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-[#374151] rounded-xl bg-[#030712]">
              <Database className="w-8 h-8 text-gray-400 mx-auto mb-2 opacity-70" />
              <p className="text-sm font-bold text-white">Nenhum backup encontrado.</p>
              <p className="text-xs text-gray-300 mt-0.5">Clique em &quot;Executar Backup Agora&quot; para criar o primeiro snapshot no Cloudflare R2.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#374151] bg-[#1f2937] text-xs font-bold uppercase tracking-wider text-white">
                    <th className="py-3.5 px-4 font-bold">Arquivo</th>
                    <th className="py-3.5 px-3 font-bold">Data / Hora</th>
                    <th className="py-3.5 px-3 font-bold">Tamanho</th>
                    <th className="py-3.5 px-3 font-bold">Destino</th>
                    <th className="py-3.5 px-3 font-bold">Status</th>
                    <th className="py-3.5 px-4 text-right font-bold">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#374151]">
                  {data.backups.map((item) => (
                    <tr key={item.filename} className="hover:bg-[#1f2937]/50 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-xs text-white font-bold">
                        {item.filename}
                      </td>
                      <td className="py-3.5 px-3 text-gray-200 text-xs font-medium">{formatDate(item.createdAt)}</td>
                      <td className="py-3.5 px-3 font-mono text-xs text-white font-bold">{formatBytes(item.sizeBytes)}</td>
                      <td className="py-3.5 px-3">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-bold rounded bg-[#2563eb] text-white border border-[#3b82f6]">
                          <Cloud className="w-3 h-3" />
                          {item.storage || 'Cloudflare R2'}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="px-2.5 py-0.5 text-xs font-bold rounded bg-[#059669] text-white border border-[#10b981]">
                          ● Válido
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right flex items-center justify-end gap-2">
                        <a
                          href={`/api/developer/backup?download=${encodeURIComponent(item.filename)}`}
                          download
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-[#4b5563] bg-[#1f2937] hover:bg-[#374151] text-white transition-all shadow-sm"
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
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-[#f59e0b] bg-[#d97706] hover:bg-amber-600 text-white transition-all shadow-sm"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85">
            <div className="bg-[#111827] border border-[#ef4444] rounded-2xl p-6 md:p-8 max-w-lg w-full space-y-6 shadow-2xl text-white">
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-[#dc2626] text-white border border-[#ef4444] shrink-0">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Confirmar Operação de Restauração</h3>
                  <p className="text-xs text-gray-200 font-medium mt-1">
                    Esta operação valida e restaura os dados em um schema PostgreSQL isolado para auditoria e teste de integridade.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#030712] border border-[#374151] text-xs space-y-2 font-mono">
                <div><strong className="text-white">Arquivo:</strong> {selectedBackup.filename}</div>
                <div><strong className="text-white">Tamanho:</strong> {formatBytes(selectedBackup.sizeBytes)}</div>
                <div><strong className="text-white">Criado em:</strong> {formatDate(selectedBackup.createdAt)}</div>
                <div className="text-amber-400 font-sans font-bold pt-1">
                  ⚠️ Nenhuma credencial nem chave secreta é exposta nesta operação.
                </div>
              </div>

              <form onSubmit={handleRestoreSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-white mb-1.5">
                    Digite exatamente <strong className="text-red-400 font-mono">RESTAURAR-BACKUP</strong> para liberar a execução:
                  </label>
                  <input
                    type="text"
                    value={confirmationCode}
                    onChange={(e) => setConfirmationCode(e.target.value)}
                    placeholder="RESTAURAR-BACKUP"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#030712] border border-[#374151] text-white font-mono text-sm focus:outline-none focus:border-red-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRestoreModalOpen(false)
                      setSelectedBackup(null)
                    }}
                    className="px-4 py-2 text-xs md:text-sm rounded-xl border border-[#4b5563] bg-[#1f2937] hover:bg-[#374151] text-white font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={confirmationCode !== 'RESTAURAR-BACKUP' || isRestoring}
                    className="px-5 py-2 text-xs md:text-sm rounded-xl bg-[#dc2626] text-white font-bold hover:bg-red-600 border border-[#ef4444] transition-all disabled:opacity-40 flex items-center gap-2"
                  >
                    {isRestoring ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
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
