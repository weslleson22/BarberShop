'use client'

import React, { useState, useEffect } from 'react'
import {
  Palette,
  Sliders,
  CheckCircle2,
  Save,
  RefreshCw,
  Eye,
  Shield,
  Smartphone,
  MapPin,
  FileText,
  CreditCard,
  QrCode,
  Barcode,
  Sparkles,
  ExternalLink
} from 'lucide-react'
import { getAuthHeaders } from '@/lib/utils'
import AbacateCheckout, { CheckoutProduct } from './AbacateCheckout'
import { CheckoutCustomizationConfig, DEFAULT_CHECKOUT_CONFIG } from '@/lib/billing/checkout-config'

const COLOR_PRESETS = [
  { name: 'AbacatePay (Padrão)', value: '#84cc16' },
  { name: 'Esmeralda', value: '#10b981' },
  { name: 'Dourado Barber', value: '#f59e0b' },
  { name: 'Índigo Moderno', value: '#6366f1' },
  { name: 'Azul Elétrico', value: '#06b6d4' },
  { name: 'Rosa Vibrante', value: '#ec4899' },
]

export default function CheckoutCustomizer() {
  const [config, setConfig] = useState<CheckoutCustomizationConfig>(DEFAULT_CHECKOUT_CONFIG)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [previewTheme, setPreviewTheme] = useState<'LIGHT' | 'DARK'>('DARK')

  // Produto de exemplo para o preview ao vivo
  const sampleProduct: CheckoutProduct = {
    id: 'prod_preview_1',
    name: 'Plano BarberShop Pro',
    description: 'Gestão completa com agendamentos ilimitados e relatórios',
    price: 49.9,
    currency: 'BRL',
    billingInterval: 'MONTHLY',
  }

  // Carrega as configurações atuais
  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/billing/checkout/config', {
        headers: getAuthHeaders(),
        credentials: 'include',
      })
      if (res.ok) {
        const data = await res.json()
        setConfig(data)
        if (data.theme === 'LIGHT' || data.theme === 'DARK') {
          setPreviewTheme(data.theme)
        }
      }
    } catch (err) {
      console.warn('Erro ao carregar configurações de checkout:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    setSuccessMessage(null)
    try {
      const res = await fetch('/api/billing/checkout/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        credentials: 'include',
        body: JSON.stringify(config),
      })
      if (res.ok) {
        setSuccessMessage('Personalização do checkout salva com sucesso!')
        setTimeout(() => setSuccessMessage(null), 3000)
      }
    } catch (err) {
      console.error('Erro ao salvar:', err)
    } finally {
      setSaving(false)
    }
  }

  const toggleMethod = (method: 'PIX' | 'CREDIT_CARD' | 'BOLETO') => {
    const current = config.acceptedMethods
    if (current.includes(method)) {
      if (current.length === 1) return // não permite desmarcar todos
      setConfig({ ...config, acceptedMethods: current.filter((m) => m !== method) })
    } else {
      setConfig({ ...config, acceptedMethods: [...current, method] })
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in">
      {/* Header com Ações */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border p-6 rounded-2xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400">
              <Sliders className="w-4 h-4" />
            </span>
            <h2 className="text-xl font-bold text-foreground">Personalizar Checkout AbacatePay</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Ajuste a identidade visual, etapas e campos exibidos aos seus clientes na hora de pagar.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchConfig}
            disabled={loading}
            className="p-2.5 rounded-xl border border-border bg-card hover:bg-accent text-foreground text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Restaurar</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="py-2.5 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-bold flex items-center gap-2 transition-all shadow-md cursor-pointer disabled:opacity-50"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            <span>Salvar Personalização</span>
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center gap-3 text-sm animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Grid: Controles de Customização (Esquerda) + Preview ao Vivo (Direita) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
        {/* Painel de Controles */}
        <div className="xl:col-span-5 space-y-6 bg-card border border-border p-6 rounded-2xl shadow-sm">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Palette className="w-4 h-4 text-emerald-400" />
            <span>Configurações Visuais</span>
          </h3>

          {/* Tema Padrão */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Tema Padrão do Checkout</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setConfig({ ...config, theme: 'LIGHT' })
                  setPreviewTheme('LIGHT')
                }}
                className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  config.theme === 'LIGHT'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500'
                    : 'border-border text-foreground hover:bg-accent'
                }`}
              >
                <span>☀️ Claro (Light)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setConfig({ ...config, theme: 'DARK' })
                  setPreviewTheme('DARK')
                }}
                className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  config.theme === 'DARK'
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500'
                    : 'border-border text-foreground hover:bg-accent'
                }`}
              >
                <span>🌙 Escuro (Dark)</span>
              </button>
            </div>
          </div>

          {/* Cor de Destaque */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Cor de Destaque dos Botões</label>
            <div className="grid grid-cols-3 gap-2">
              {COLOR_PRESETS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setConfig({ ...config, accentColor: color.value })}
                  className={`p-2.5 rounded-xl border text-[11px] font-semibold flex items-center gap-2 transition-all cursor-pointer ${
                    config.accentColor === color.value
                      ? 'border-foreground shadow-sm'
                      : 'border-border hover:border-muted-foreground'
                  }`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0 shadow-inner"
                    style={{ backgroundColor: color.value }}
                  />
                  <span className="truncate text-foreground">{color.name.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Nome da Loja */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Nome de Exibição da Loja</label>
            <input
              type="text"
              value={config.storeName}
              onChange={(e) => setConfig({ ...config, storeName: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Selo de Garantia */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Texto do Selo de Segurança</label>
            <input
              type="text"
              value={config.guaranteeBadgeText}
              onChange={(e) => setConfig({ ...config, guaranteeBadgeText: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-sm text-foreground focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="h-[1px] bg-border my-4" />

          {/* Campos Obrigatórios / Exibidos */}
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>Campos do Formulário</span>
          </h3>

          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 rounded-xl border border-border bg-background cursor-pointer hover:bg-accent/40 transition-colors">
              <div className="flex items-center gap-2.5">
                <MapPin className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-medium text-foreground">Exigir Endereço Completo (Passo 2)</span>
              </div>
              <input
                type="checkbox"
                checked={config.showAddress}
                onChange={(e) => setConfig({ ...config, showAddress: e.target.checked })}
                className="w-4 h-4 rounded text-emerald-500 accent-emerald-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl border border-border bg-background cursor-pointer hover:bg-accent/40 transition-colors">
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-medium text-foreground">Solicitar CPF / CNPJ</span>
              </div>
              <input
                type="checkbox"
                checked={config.showTaxId}
                onChange={(e) => setConfig({ ...config, showTaxId: e.target.checked })}
                className="w-4 h-4 rounded text-emerald-500 accent-emerald-500"
              />
            </label>

            <label className="flex items-center justify-between p-3 rounded-xl border border-border bg-background cursor-pointer hover:bg-accent/40 transition-colors">
              <div className="flex items-center gap-2.5">
                <Smartphone className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-medium text-foreground">Solicitar Telefone de Contato</span>
              </div>
              <input
                type="checkbox"
                checked={config.showPhone}
                onChange={(e) => setConfig({ ...config, showPhone: e.target.checked })}
                className="w-4 h-4 rounded text-emerald-500 accent-emerald-500"
              />
            </label>
          </div>

          <div className="h-[1px] bg-border my-4" />

          {/* Métodos de Pagamento Permitidos */}
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-emerald-400" />
            <span>Métodos de Pagamento Aceitos</span>
          </h3>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => toggleMethod('PIX')}
              className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                config.acceptedMethods.includes('PIX')
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                  : 'border-border text-muted-foreground hover:bg-accent'
              }`}
            >
              <QrCode className="w-5 h-5" />
              <span>PIX</span>
            </button>

            <button
              type="button"
              onClick={() => toggleMethod('CREDIT_CARD')}
              className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                config.acceptedMethods.includes('CREDIT_CARD')
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                  : 'border-border text-muted-foreground hover:bg-accent'
              }`}
            >
              <CreditCard className="w-5 h-5" />
              <span>Cartão</span>
            </button>

            <button
              type="button"
              onClick={() => toggleMethod('BOLETO')}
              className={`p-3 rounded-xl border text-xs font-semibold flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                config.acceptedMethods.includes('BOLETO')
                  ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                  : 'border-border text-muted-foreground hover:bg-accent'
              }`}
            >
              <Barcode className="w-5 h-5" />
              <span>Boleto</span>
            </button>
          </div>
        </div>

        {/* Live Preview do Checkout Interativo (Direita) */}
        <div className="xl:col-span-7 space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-bold text-foreground">Live Preview em Tempo Real</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground hidden sm:inline">Visualizar como:</span>
              <div className="flex items-center gap-1 p-1 rounded-xl bg-card border border-border">
                <button
                  type="button"
                  onClick={() => setPreviewTheme('LIGHT')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    previewTheme === 'LIGHT' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'
                  }`}
                >
                  Claro
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewTheme('DARK')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    previewTheme === 'DARK' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'
                  }`}
                >
                  Escuro
                </button>
              </div>
            </div>
          </div>

          {/* O componente de checkout real rodando com os parâmetros ao vivo */}
          <div className="p-4 sm:p-6 rounded-3xl bg-black/30 border border-border shadow-inner">
            <AbacateCheckout
              key={`${previewTheme}-${config.accentColor}-${config.showAddress}`}
              product={sampleProduct}
              initialTheme={previewTheme}
              accentColor={config.accentColor}
              showAddress={config.showAddress}
              showTaxId={config.showTaxId}
              showPhone={config.showPhone}
              acceptedMethods={config.acceptedMethods}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
