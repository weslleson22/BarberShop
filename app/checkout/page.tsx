'use client'

import React, { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Loader2, ArrowLeft, ShieldCheck } from 'lucide-react'
import { getAuthHeaders } from '@/lib/utils'
import { useAuth } from '@/lib/auth-context'
import AbacateCheckout, { CheckoutProduct } from '@/components/billing/AbacateCheckout'
import { CheckoutCustomizationConfig, DEFAULT_CHECKOUT_CONFIG } from '@/lib/billing/checkout-config'

function CheckoutContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuth()

  const planId = searchParams.get('planId') || searchParams.get('id')
  const [product, setProduct] = useState<CheckoutProduct | null>(null)
  const [config, setConfig] = useState<CheckoutCustomizationConfig>(DEFAULT_CHECKOUT_CONFIG)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    loadCheckoutData()
  }, [planId])

  const loadCheckoutData = async () => {
    setLoading(true)
    try {
      // 1. Carrega configurações salvas de personalização do checkout
      try {
        const configRes = await fetch('/api/billing/checkout/config')
        if (configRes.ok) {
          const configData = await configRes.json()
          setConfig(configData)
        }
      } catch (e) {
        console.warn('Erro ao carregar config:', e)
      }

      // 2. Carrega dados do plano selecionado
      if (planId) {
        const planRes = await fetch('/api/billing/plans', {
          headers: getAuthHeaders(),
          credentials: 'include',
        })
        if (planRes.ok) {
          const plans = await planRes.json()
          if (Array.isArray(plans)) {
            const found = plans.find((p: any) => p.id === planId)
            if (found) {
              setProduct({
                id: found.id,
                name: found.name,
                description: found.description || 'Assinatura BarberShop Pro',
                price: Number(found.price),
                currency: found.currency || 'BRL',
                billingInterval: found.billingInterval || 'MONTHLY',
              })
              setLoading(false)
              return
            }
          }
        }
      }

      // Fallback padrão se nenhum planId for fornecido
      setProduct({
        id: 'plan_pro_default',
        name: 'Plano BarberShop Pro',
        description: 'Gestão completa da sua barbearia com agendamento online ilimitado',
        price: 49.9,
        currency: 'BRL',
        billingInterval: 'MONTHLY',
      })
    } catch (err: any) {
      console.error('Erro ao carregar checkout:', err)
      setErrorMessage('Não foi possível carregar os detalhes do produto.')
    } finally {
      setLoading(false)
    }
  }

  const handleSuccess = () => {
    // Redireciona de volta para a assinatura com confirmação
    router.push('/dashboard/assinatura?payment=success')
  }

  const handleCancel = () => {
    router.back()
  }

  const isDark = config.theme === 'DARK'

  return (
    <div className={`min-h-screen py-10 px-4 md:px-8 flex flex-col justify-between transition-colors duration-200 ${isDark ? 'bg-[#0a0d14] text-white' : 'bg-[#f4f6f8] text-slate-900'}`}>
      <div className="w-full max-w-5xl mx-auto space-y-6">
        {/* Barra superior com botão voltar */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleCancel}
            className={`inline-flex items-center gap-2 text-xs md:text-sm font-semibold px-3 py-1.5 rounded-xl border transition-all cursor-pointer ${
              isDark
                ? 'border-gray-800 bg-[#121620] text-gray-300 hover:text-white'
                : 'border-gray-300 bg-white text-gray-700 hover:text-black'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Voltar ao painel</span>
          </button>

          <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>AbacatePay Checkout Seguro</span>
          </div>
        </div>

        {loading ? (
          <div className="py-24 text-center">
            <Loader2 className="w-10 h-10 animate-spin text-emerald-500 mx-auto mb-4" />
            <p className="text-sm text-muted-foreground">Carregando checkout seguro...</p>
          </div>
        ) : errorMessage ? (
          <div className="p-8 text-center bg-card border rounded-3xl max-w-md mx-auto">
            <p className="text-rose-400 text-sm mb-4">{errorMessage}</p>
            <button
              onClick={() => router.push('/dashboard/assinatura')}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold"
            >
              Voltar para Planos
            </button>
          </div>
        ) : product ? (
          <AbacateCheckout
            product={product}
            initialTheme={config.theme === 'LIGHT' ? 'LIGHT' : 'DARK'}
            accentColor={config.accentColor}
            showAddress={config.showAddress}
            showTaxId={config.showTaxId}
            showPhone={config.showPhone}
            acceptedMethods={config.acceptedMethods}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
            customerDefaults={{
              name: user?.name,
              email: user?.email,
              phone: user?.phone,
            }}
          />
        ) : null}
      </div>

      {/* Footer simples */}
      <footer className="text-center py-6 text-xs text-muted-foreground">
        © {new Date().getFullYear()} BarberShop SaaS • Plataforma integrada com <strong>AbacatePay v2</strong>
      </footer>
    </div>
  )
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  )
}
