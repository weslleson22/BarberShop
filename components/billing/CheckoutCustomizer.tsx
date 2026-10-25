'use client'

import React, { useState, useEffect } from 'react'
import {
  Palette,
  Sliders,
  CheckCircle2,
  Save,
  RefreshCw,
  Eye,
  Smartphone,
  MapPin,
  FileText,
  CreditCard,
  QrCode,
  Barcode
} from 'lucide-react'
import { getAuthHeaders } from '@/lib/utils'
import AbacateCheckout, { CheckoutProduct } from './AbacateCheckout'
import { CheckoutCustomizationConfig, DEFAULT_CHECKOUT_CONFIG } from '@/lib/billing/checkout-config'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

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
      if (current.length === 1) return
      setConfig({ ...config, acceptedMethods: current.filter((m) => m !== method) })
    } else {
      setConfig({ ...config, acceptedMethods: [...current, method] })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header com Ações */}
      <Card className="p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <Sliders className="w-4 h-4" />
              </span>
              <h2 className="text-xl font-bold text-foreground">Personalizar Checkout AbacatePay</h2>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Ajuste a identidade visual, etapas e campos exibidos aos seus clientes na hora de pagar.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fetchConfig}
              disabled={loading}
              className="gap-2 h-9"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-primary' : ''}`} />
              <span>Restaurar</span>
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleSave}
              disabled={saving}
              className="gap-2 h-9"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>Salvar Personalização</span>
            </Button>
          </div>
        </div>
      </Card>

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center gap-3 text-sm font-medium">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Grid: Controles de Customização (Esquerda) + Preview ao Vivo (Direita) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Painel de Controles */}
        <Card className="xl:col-span-5 p-6 shadow-sm space-y-6">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-primary" />
            <h3 className="text-base font-semibold text-foreground">Configurações Visuais</h3>
          </div>

          {/* Tema Padrão */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              Tema Padrão do Checkout
            </label>
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant={config.theme === 'LIGHT' ? 'default' : 'outline'}
                onClick={() => {
                  setConfig({ ...config, theme: 'LIGHT' })
                  setPreviewTheme('LIGHT')
                }}
                className="h-10 text-xs font-semibold"
              >
                <span>☀️ Claro (Light)</span>
              </Button>

              <Button
                type="button"
                variant={config.theme === 'DARK' ? 'default' : 'outline'}
                onClick={() => {
                  setConfig({ ...config, theme: 'DARK' })
                  setPreviewTheme('DARK')
                }}
                className="h-10 text-xs font-semibold"
              >
                <span>🌙 Escuro (Dark)</span>
              </Button>
            </div>
          </div>

          {/* Cor de Destaque */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              Cor de Destaque dos Botões
            </label>
            <div className="grid grid-cols-3 gap-2">
              {COLOR_PRESETS.map((color) => {
                const isSelected = config.accentColor === color.value
                return (
                  <Button
                    key={color.value}
                    type="button"
                    variant={isSelected ? 'default' : 'outline'}
                    onClick={() => setConfig({ ...config, accentColor: color.value })}
                    className="h-9 px-2.5 justify-start gap-2 text-[11px]"
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 shadow-xs border border-white/20"
                      style={{ backgroundColor: color.value }}
                    />
                    <span className="truncate">{color.name.split(' ')[0]}</span>
                  </Button>
                )
              })}
            </div>
          </div>

          {/* Nome da Loja */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              Nome de Exibição da Loja
            </label>
            <Input
              type="text"
              value={config.storeName}
              onChange={(e) => setConfig({ ...config, storeName: e.target.value })}
              className="h-10"
            />
          </div>

          {/* Selo de Garantia */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              Texto do Selo de Segurança
            </label>
            <Input
              type="text"
              value={config.guaranteeBadgeText}
              onChange={(e) => setConfig({ ...config, guaranteeBadgeText: e.target.value })}
              className="h-10"
            />
          </div>

          <Separator />

          {/* Campos Obrigatórios / Exibidos */}
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <h3 className="text-base font-semibold text-foreground">Campos do Formulário</h3>
          </div>

          <div className="space-y-2.5">
            <label className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-card hover:bg-muted/40 transition-colors cursor-pointer">
              <div className="flex items-center gap-2.5">
                <MapPin className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-medium text-foreground">Exigir Endereço Completo (Passo 2)</span>
              </div>
              <input
                type="checkbox"
                checked={config.showAddress}
                onChange={(e) => setConfig({ ...config, showAddress: e.target.checked })}
                className="w-4 h-4 rounded text-primary accent-primary cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-card hover:bg-muted/40 transition-colors cursor-pointer">
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-medium text-foreground">Solicitar CPF / CNPJ</span>
              </div>
              <input
                type="checkbox"
                checked={config.showTaxId}
                onChange={(e) => setConfig({ ...config, showTaxId: e.target.checked })}
                className="w-4 h-4 rounded text-primary accent-primary cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-card hover:bg-muted/40 transition-colors cursor-pointer">
              <div className="flex items-center gap-2.5">
                <Smartphone className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-medium text-foreground">Solicitar Telefone de Contato</span>
              </div>
              <input
                type="checkbox"
                checked={config.showPhone}
                onChange={(e) => setConfig({ ...config, showPhone: e.target.checked })}
                className="w-4 h-4 rounded text-primary accent-primary cursor-pointer"
              />
            </label>
          </div>

          <Separator />

          {/* Métodos de Pagamento Permitidos */}
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary" />
            <h3 className="text-base font-semibold text-foreground">Métodos de Pagamento Aceitos</h3>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Button
              type="button"
              variant={config.acceptedMethods.includes('PIX') ? 'default' : 'outline'}
              onClick={() => toggleMethod('PIX')}
              className="h-16 flex-col gap-1.5"
            >
              <QrCode className="w-5 h-5" />
              <span className="text-xs">PIX</span>
            </Button>

            <Button
              type="button"
              variant={config.acceptedMethods.includes('CREDIT_CARD') ? 'default' : 'outline'}
              onClick={() => toggleMethod('CREDIT_CARD')}
              className="h-16 flex-col gap-1.5"
            >
              <CreditCard className="w-5 h-5" />
              <span className="text-xs">Cartão</span>
            </Button>

            <Button
              type="button"
              variant={config.acceptedMethods.includes('BOLETO') ? 'default' : 'outline'}
              onClick={() => toggleMethod('BOLETO')}
              className="h-16 flex-col gap-1.5"
            >
              <Barcode className="w-5 h-5" />
              <span className="text-xs">Boleto</span>
            </Button>
          </div>
        </Card>

        {/* Live Preview do Checkout Interativo (Direita) */}
        <div className="xl:col-span-7 space-y-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-foreground">Live Preview em Tempo Real</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-medium hidden sm:inline">Visualizar como:</span>
              <div className="flex items-center gap-1 p-1 rounded-lg border border-border bg-card">
                <Button
                  type="button"
                  variant={previewTheme === 'LIGHT' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setPreviewTheme('LIGHT')}
                  className="h-7 text-xs px-2.5"
                >
                  Claro
                </Button>
                <Button
                  type="button"
                  variant={previewTheme === 'DARK' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setPreviewTheme('DARK')}
                  className="h-7 text-xs px-2.5"
                >
                  Escuro
                </Button>
              </div>
            </div>
          </div>

          {/* O componente de checkout real rodando com os parâmetros ao vivo */}
          <div className="p-4 sm:p-6 rounded-2xl border border-border bg-card/60 backdrop-blur-sm shadow-sm">
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
