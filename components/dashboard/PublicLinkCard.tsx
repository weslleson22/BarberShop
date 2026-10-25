'use client'

import { useState, useEffect } from 'react'
import { Globe, Copy, Check, ExternalLink, Settings } from 'lucide-react'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'

interface BarbershopPublicInfo {
  id: string
  name: string
  slug: string | null
  phone: string | null
  address: string | null
}

export default function PublicLinkCard() {
  const { user } = useAuth()
  const [shop, setShop] = useState<BarbershopPublicInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [origin, setOrigin] = useState('')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setOrigin(window.location.origin)
    }

    const fetchShop = async () => {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null
        const res = await fetch('/api/barbershop', {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          credentials: 'include',
        })
        if (res.ok) {
          const data = await res.json()
          setShop(data)
        }
      } catch (err) {
        console.error('Erro ao carregar dados da barbearia:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchShop()
  }, [])

  if (loading || !shop) {
    return null
  }

  const slug = shop.slug
  if (!slug) {
    return null
  }

  const fullUrl = `${origin}/b/${slug}`

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(fullUrl)
      } else {
        const textArea = document.createElement('textarea')
        textArea.value = fullUrl
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch (err) {
      console.error('Falha ao copiar:', err)
    }
  }

  return (
    <div className="relative overflow-hidden rounded-xl bg-card border border-border p-5 md:p-6 mb-6 shadow-sm">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              Link Oficial da Barbearia
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Ativo
            </span>
          </div>

          <h2 className="text-lg md:text-xl font-bold text-foreground flex items-center gap-2 tracking-tight">
            <Globe className="w-5 h-5 text-amber-500 shrink-0" />
            <span>Página Pública de Agendamentos</span>
          </h2>

          <p className="text-xs md:text-sm text-muted-foreground max-w-2xl leading-relaxed">
            Seus clientes podem visualizar serviços, escolher barbeiros e agendar horários em tempo real através deste link exclusivo.
          </p>

          {/* URL Box */}
          <div className="pt-2 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-muted/50 border border-border text-xs md:text-sm font-mono text-foreground max-w-full overflow-x-auto">
              <span className="text-muted-foreground select-none">{origin}/b/</span>
              <span className="font-bold text-primary underline decoration-primary/40 underline-offset-4">{slug}</span>
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-sm cursor-pointer ${
                copied
                  ? 'bg-emerald-600 text-white border border-emerald-600'
                  : 'bg-primary hover:bg-primary/90 text-primary-foreground'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                  <span>Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar Link</span>
                </>
              )}
            </button>

            <a
              href={`/b/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-card hover:bg-muted text-foreground border border-border transition-colors shadow-sm"
            >
              <span>Abrir Página</span>
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
            </a>

            {user?.role === 'ADMIN' && (
              <Link
                href="/configuracoes?tab=barbershop"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors ml-auto"
                title="Personalizar slug nas configurações"
              >
                <Settings className="w-3.5 h-3.5" />
                <span>Personalizar Slug</span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
