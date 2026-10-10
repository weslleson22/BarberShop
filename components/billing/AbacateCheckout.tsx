'use client'

import React, { useState, useEffect } from 'react'
import {
  Lock,
  ArrowRight,
  ArrowLeft,
  QrCode,
  CreditCard,
  Barcode,
  CheckCircle2,
  Copy,
  Check,
  Sparkles,
  ShieldCheck,
  Sun,
  Moon,
  Loader2,
  AlertCircle,
  HelpCircle,
  Smartphone,
  Calendar,
  Building
} from 'lucide-react'
import { getAuthHeaders } from '@/lib/utils'

export interface CheckoutProduct {
  id: string
  name: string
  description?: string
  price: number // em reais
  currency?: string
  billingInterval?: string
  imageUrl?: string
}

export interface AbacateCheckoutProps {
  product: CheckoutProduct
  initialTheme?: 'LIGHT' | 'DARK'
  accentColor?: string
  showAddress?: boolean
  showTaxId?: boolean
  showPhone?: boolean
  acceptedMethods?: ('PIX' | 'CREDIT_CARD' | 'BOLETO')[]
  onSuccess?: (paymentData: any) => void
  onCancel?: () => void
  customerDefaults?: {
    name?: string
    email?: string
    taxId?: string
    phone?: string
  }
}

export default function AbacateCheckout({
  product,
  initialTheme = 'DARK',
  accentColor = '#84cc16',
  showAddress = true,
  showTaxId = true,
  showPhone = true,
  acceptedMethods = ['PIX', 'CREDIT_CARD', 'BOLETO'],
  onSuccess,
  onCancel,
  customerDefaults,
}: AbacateCheckoutProps) {
  // Tema local (permite alternar entre Claro e Escuro dinamicamente)
  const [theme, setTheme] = useState<'LIGHT' | 'DARK'>(initialTheme)

  // Etapa atual: 1 = Dados, 2 = Endereço, 3 = Pagamento
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1)

  // Dados Pessoais
  const [customer, setCustomer] = useState({
    name: customerDefaults?.name || '',
    taxId: customerDefaults?.taxId || '',
    email: customerDefaults?.email || '',
    phone: customerDefaults?.phone || '',
  })

  // Endereço
  const [address, setAddress] = useState({
    zipCode: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
  })
  const [loadingCep, setLoadingCep] = useState(false)

  // Método de pagamento selecionado
  const [selectedMethod, setSelectedMethod] = useState<'PIX' | 'CREDIT_CARD' | 'BOLETO'>('PIX')

  // Dados do Cartão de Crédito
  const [cardData, setCardData] = useState({
    number: '',
    holder: customerDefaults?.name || '',
    expiry: '',
    cvv: '',
    installments: '1',
  })

  // Estados de processamento
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [pixData, setPixData] = useState<{
    id?: string
    brCode?: string
    brCodeBase64?: string
    status?: string
  } | null>(null)
  const [boletoData, setBoletoData] = useState<{
    id?: string
    barCode?: string
    identificationNumber?: string
    url?: string
  } | null>(null)
  const [paymentCompleted, setPaymentCompleted] = useState(false)
  const [copiedPix, setCopiedPix] = useState(false)
  const [copiedBoleto, setCopiedBoleto] = useState(false)

  // Atualiza titular do cartão quando nome mudar
  useEffect(() => {
    if (customer.name && !cardData.holder) {
      setCardData((prev) => ({ ...prev, holder: customer.name.toUpperCase() }))
    }
  }, [customer.name, cardData.holder])

  // Máscaras de formulário
  const formatCpfCnpj = (val: string) => {
    const raw = val.replace(/\D/g, '')
    if (raw.length <= 11) {
      return raw
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d)/, '$1.$2')
        .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
        .slice(0, 14)
    }
    return raw
      .replace(/^(\d{2})(\d)/, '$1.$2')
      .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
      .replace(/\.(\d{3})(\d)/, '.$1/$2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .slice(0, 18)
  }

  const formatPhone = (val: string) => {
    const raw = val.replace(/\D/g, '')
    if (raw.length <= 10) {
      return raw.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').slice(0, 14)
    }
    return raw.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').slice(0, 15)
  }

  const formatCep = (val: string) => {
    const raw = val.replace(/\D/g, '')
    return raw.replace(/(\d{5})(\d{1,3})/, '$1-$2').slice(0, 9)
  }

  const formatCardNumber = (val: string) => {
    const raw = val.replace(/\D/g, '')
    return raw.replace(/(\d{4})/g, '$1 ').trim().slice(0, 19)
  }

  const formatExpiry = (val: string) => {
    const raw = val.replace(/\D/g, '')
    return raw.replace(/(\d{2})(\d{1,2})/, '$1/$2').slice(0, 5)
  }

  // Busca CEP via ViaCEP
  const handleCepBlur = async () => {
    const cleanCep = address.zipCode.replace(/\D/g, '')
    if (cleanCep.length === 8) {
      setLoadingCep(true)
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`)
        const data = await res.json()
        if (!data.erro) {
          setAddress((prev) => ({
            ...prev,
            street: data.logradouro || '',
            neighborhood: data.bairro || '',
            city: data.localidade || '',
            state: data.uf || '',
          }))
        }
      } catch (err) {
        console.warn('Erro ao consultar CEP:', err)
      } finally {
        setLoadingCep(false)
      }
    }
  }

  // Validação do Passo 1
  const handleContinueStep1 = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!customer.name.trim()) {
      setErrorMessage('Por favor, informe seu nome completo.')
      return
    }

    if (showTaxId && customer.taxId.replace(/\D/g, '').length < 11) {
      setErrorMessage('Por favor, informe um CPF ou CNPJ válido.')
      return
    }

    if (!customer.email || !customer.email.includes('@')) {
      setErrorMessage('Por favor, informe um email válido.')
      return
    }

    if (showPhone && customer.phone.replace(/\D/g, '').length < 10) {
      setErrorMessage('Por favor, informe um telefone de contato válido.')
      return
    }

    if (showAddress) {
      setCurrentStep(2)
    } else {
      setCurrentStep(3)
      initiatePaymentMethod(selectedMethod)
    }
  }

  // Validação do Passo 2
  const handleContinueStep2 = (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (showAddress) {
      if (!address.street.trim() || !address.number.trim() || !address.city.trim() || !address.state.trim()) {
        setErrorMessage('Por favor, preencha os campos obrigatórios de endereço.')
        return
      }
    }

    setCurrentStep(3)
    initiatePaymentMethod(selectedMethod)
  }

  // Inicia o método selecionado (gerar PIX ou Boleto na AbacatePay)
  const initiatePaymentMethod = async (method: 'PIX' | 'CREDIT_CARD' | 'BOLETO') => {
    setSelectedMethod(method)
    setErrorMessage(null)

    if (method === 'PIX' && !pixData?.brCode) {
      await generatePix()
    } else if (method === 'BOLETO' && !boletoData?.barCode) {
      await generateBoleto()
    }
  }

  // Geração de PIX na AbacatePay
  const generatePix = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        credentials: 'include',
        body: JSON.stringify({
          planId: product.id,
          mode: 'TRANSPARENT',
          provider: 'ABACATEPAY',
          customerTaxId: customer.taxId,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao gerar cobrança PIX.')
      }

      if (data.pix) {
        setPixData({
          id: data.pix.id,
          brCode: data.pix.brCode,
          brCodeBase64: data.pix.brCodeBase64,
          status: 'PENDING',
        })
      }
    } catch (err: any) {
      console.warn('Erro ao gerar PIX:', err)
      setErrorMessage(err.message || 'Falha ao conectar com o gateway PIX.')
    } finally {
      setLoading(false)
    }
  }

  // Geração de Boleto na AbacatePay
  const generateBoleto = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/billing/charges', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        credentials: 'include',
        body: JSON.stringify({
          amount: product.price,
          method: 'BOLETO',
          description: `Assinatura ${product.name}`,
          customerName: customer.name,
          customerEmail: customer.email,
          customerTaxId: customer.taxId,
          customerPhone: customer.phone,
          address,
          planId: product.id,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao emitir boleto.')
      }

      if (data.charge) {
        setBoletoData({
          id: data.charge.id,
          barCode: data.charge.barCode,
          identificationNumber: data.charge.identificationNumber,
          url: data.charge.url,
        })
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Falha ao emitir boleto.')
    } finally {
      setLoading(false)
    }
  }

  // Pagamento via Cartão de Crédito
  const handlePayCard = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMessage(null)

    try {
      const res = await fetch('/api/billing/card/pay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        credentials: 'include',
        body: JSON.stringify({
          planId: product.id,
          cardNumber: cardData.number,
          cardHolder: cardData.holder,
          cardExpiry: cardData.expiry,
          cardCvv: cardData.cvv,
          installments: cardData.installments,
          customerTaxId: customer.taxId,
        }),
      })

      const data = await res.json()
      if (!res.ok) {
        throw new Error(data.error || 'Falha na aprovação do cartão.')
      }

      setPaymentCompleted(true)
      if (onSuccess) {
        setTimeout(() => onSuccess(data), 1800)
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Erro ao processar o pagamento com cartão.')
    } finally {
      setLoading(false)
    }
  }

  // Simular Aprovação do PIX (DevMode / Sandbox)
  const handleSimulatePixPayment = async () => {
    if (!pixData?.id) return
    setLoading(true)
    try {
      const res = await fetch('/api/billing/pix/simulate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        credentials: 'include',
        body: JSON.stringify({
          pixId: pixData.id,
          planId: product.id,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        setPaymentCompleted(true)
        if (onSuccess) {
          setTimeout(() => onSuccess(data), 1800)
        }
      }
    } catch (err) {
      console.warn('Erro ao simular:', err)
    } finally {
      setLoading(false)
    }
  }

  // Copiar código PIX
  const handleCopyPix = () => {
    if (pixData?.brCode) {
      navigator.clipboard.writeText(pixData.brCode)
      setCopiedPix(true)
      setTimeout(() => setCopiedPix(false), 2200)
    }
  }

  // Copiar linha digitável do Boleto
  const handleCopyBoleto = () => {
    if (boletoData?.identificationNumber) {
      navigator.clipboard.writeText(boletoData.identificationNumber)
      setCopiedBoleto(true)
      setTimeout(() => setCopiedBoleto(false), 2200)
    }
  }

  const formatPrice = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)
  }

  // Cores dinâmicas de acordo com o tema Claro / Escuro (exatamente como nos screenshots)
  const isDark = theme === 'DARK'
  const containerBg = isDark ? 'bg-[#121620]' : 'bg-white'
  const cardBorder = isDark ? 'border-[#222a3a]' : 'border-gray-200'
  const textTitle = isDark ? 'text-white' : 'text-[#0f172a]'
  const textMuted = isDark ? 'text-[#94a3b8]' : 'text-[#64748b]'
  const inputBg = isDark ? 'bg-[#182030]' : 'bg-white'
  const inputBorder = isDark ? 'border-[#29354d]' : 'border-gray-300'
  const summaryBoxBg = isDark ? 'bg-[#161d2b]' : 'bg-[#f8fafc]'
  const activeGreen = accentColor || '#84cc16'

  return (
    <div className={`w-full max-w-5xl mx-auto rounded-3xl overflow-hidden border shadow-2xl transition-colors duration-200 ${containerBg} ${cardBorder}`}>
      {/* Top Header com Logo AbacatePay, Cadeado e Switcher de Tema */}
      <div className={`px-6 md:px-10 py-5 border-b flex items-center justify-between ${isDark ? 'border-[#222a3a] bg-[#121620]' : 'border-gray-100 bg-white'}`}>
        <div className="flex items-center gap-3">
          {/* Logo AbacatePay estilizado fiel ao screenshot */}
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center p-0.5">
              <span className="text-base leading-none select-none">🥑</span>
            </div>
            <span className={`text-xl font-bold tracking-tight ${textTitle}`}>
              Pay
            </span>
          </div>

          <div className={`h-4 w-[1px] ${isDark ? 'bg-gray-700' : 'bg-gray-300'}`} />

          <div className={`flex items-center gap-1.5 text-xs font-medium ${textMuted}`}>
            <Lock className="w-3.5 h-3.5 text-emerald-500" />
            <span>Compra 100% segura</span>
          </div>
        </div>

        {/* Alternador de Tema Claro / Escuro (para conferência e preview do usuário) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setTheme(isDark ? 'LIGHT' : 'DARK')}
            className={`p-2 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 cursor-pointer ${
              isDark
                ? 'bg-[#1e2738] border-[#2c3850] text-gray-200 hover:bg-[#273349]'
                : 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200'
            }`}
            title="Alternar entre modo Claro e Escuro"
          >
            {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-700" />}
            <span className="hidden sm:inline">{isDark ? 'Tema Claro' : 'Tema Escuro'}</span>
          </button>
        </div>
      </div>

      {/* Conteúdo Principal do Checkout dividido em Colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[580px]">
        {/* LADO ESQUERDO: Formulário Multi-etapas (Dados > Endereço > Pagamento) */}
        <div className="lg:col-span-7 p-6 md:p-10 flex flex-col justify-between">
          <div>
            {/* Stepper / Breadcrumbs */}
            <div className="flex items-center gap-2 text-xs md:text-sm mb-8 font-medium">
              <button
                type="button"
                onClick={() => setCurrentStep(1)}
                className={`transition-colors cursor-pointer ${
                  currentStep === 1
                    ? `${textTitle} font-bold underline underline-offset-4 decoration-emerald-500`
                    : textMuted
                }`}
              >
                Dados
              </button>

              <span className={textMuted}>&gt;</span>

              {showAddress ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      if (customer.name && customer.email) setCurrentStep(2)
                    }}
                    className={`transition-colors ${
                      currentStep === 2
                        ? `${textTitle} font-bold underline underline-offset-4 decoration-emerald-500`
                        : textMuted
                    }`}
                  >
                    Endereço
                  </button>
                  <span className={textMuted}>&gt;</span>
                </>
              ) : null}

              <button
                type="button"
                onClick={() => {
                  if (customer.name && customer.email) setCurrentStep(3)
                }}
                className={`transition-colors ${
                  currentStep === 3
                    ? `${textTitle} font-bold underline underline-offset-4 decoration-emerald-500`
                    : textMuted
                }`}
              >
                Pagamento
              </button>
            </div>

            {/* Mensagem de Erro, se houver */}
            {errorMessage && (
              <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 flex items-center gap-3 text-xs md:text-sm animate-in fade-in">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Sucesso do Pagamento */}
            {paymentCompleted ? (
              <div className="text-center py-12 space-y-4 animate-in zoom-in-95">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className={`text-2xl font-bold ${textTitle}`}>Pagamento Confirmado!</h3>
                <p className={`text-sm ${textMuted} max-w-md mx-auto`}>
                  Sua assinatura do plano <strong>{product.name}</strong> foi ativada com sucesso via AbacatePay.
                </p>
                <div className="pt-4">
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-semibold">
                    <Sparkles className="w-4 h-4" />
                    Acesso Imediato Liberado
                  </span>
                </div>
              </div>
            ) : (
              <>
                {/* ETAPA 1: DADOS PESSOAIS */}
                {currentStep === 1 && (
                  <form onSubmit={handleContinueStep1} className="space-y-5 animate-in fade-in">
                    <h2 className={`text-xl md:text-2xl font-bold ${textTitle}`}>Dados Pessoais</h2>

                    <div>
                      <label className={`block text-xs font-medium mb-1.5 ${textMuted}`}>
                        Nome Completo
                      </label>
                      <input
                        type="text"
                        required
                        value={customer.name}
                        onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                        placeholder="Nome completo do titular"
                        className={`w-full px-4 py-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${inputBg} ${inputBorder} ${textTitle}`}
                      />
                    </div>

                    {showTaxId && (
                      <div>
                        <label className={`block text-xs font-medium mb-1.5 ${textMuted}`}>
                          CPF / CNPJ
                        </label>
                        <input
                          type="text"
                          required
                          value={customer.taxId}
                          onChange={(e) => setCustomer({ ...customer, taxId: formatCpfCnpj(e.target.value) })}
                          placeholder="000.000.000-00 ou 00.000.000/0000-00"
                          className={`w-full px-4 py-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${inputBg} ${inputBorder} ${textTitle}`}
                        />
                      </div>
                    )}

                    <div>
                      <label className={`block text-xs font-medium mb-1.5 ${textMuted}`}>
                        Email
                      </label>
                      <input
                        type="email"
                        required
                        value={customer.email}
                        onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                        placeholder="seu.email@exemplo.com"
                        className={`w-full px-4 py-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${inputBg} ${inputBorder} ${textTitle}`}
                      />
                    </div>

                    {showPhone && (
                      <div>
                        <label className={`block text-xs font-medium mb-1.5 ${textMuted}`}>
                          Telefone
                        </label>
                        <input
                          type="tel"
                          required
                          value={customer.phone}
                          onChange={(e) => setCustomer({ ...customer, phone: formatPhone(e.target.value) })}
                          placeholder="(11) 99999-9999"
                          className={`w-full px-4 py-3 rounded-xl border text-sm transition-all focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${inputBg} ${inputBorder} ${textTitle}`}
                        />
                      </div>
                    )}

                    {/* Botão para celular/dispositivos menores */}
                    <div className="lg:hidden pt-4">
                      <button
                        type="submit"
                        style={{ backgroundColor: activeGreen }}
                        className="w-full py-3.5 px-6 rounded-full font-bold text-slate-950 flex items-center justify-center gap-2 hover:opacity-95 transition-all shadow-md cursor-pointer"
                      >
                        <span>Continuar</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </form>
                )}

                {/* ETAPA 2: ENDEREÇO DE COBRANÇA */}
                {currentStep === 2 && (
                  <form onSubmit={handleContinueStep2} className="space-y-4 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <h2 className={`text-xl md:text-2xl font-bold ${textTitle}`}>Endereço de Cobrança</h2>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(1)}
                        className={`text-xs font-medium flex items-center gap-1 ${textMuted} hover:text-emerald-400`}
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Voltar
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className={`block text-xs font-medium mb-1.5 ${textMuted}`}>CEP</label>
                        <div className="relative">
                          <input
                            type="text"
                            required
                            value={address.zipCode}
                            onChange={(e) => setAddress({ ...address, zipCode: formatCep(e.target.value) })}
                            onBlur={handleCepBlur}
                            placeholder="00000-000"
                            className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${inputBg} ${inputBorder} ${textTitle}`}
                          />
                          {loadingCep && (
                            <Loader2 className="w-4 h-4 text-emerald-400 animate-spin absolute right-3 top-3" />
                          )}
                        </div>
                      </div>

                      <div>
                        <label className={`block text-xs font-medium mb-1.5 ${textMuted}`}>Estado (UF)</label>
                        <input
                          type="text"
                          required
                          maxLength={2}
                          value={address.state}
                          onChange={(e) => setAddress({ ...address, state: e.target.value.toUpperCase() })}
                          placeholder="SP"
                          className={`w-full px-4 py-2.5 rounded-xl border text-sm uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${inputBg} ${inputBorder} ${textTitle}`}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="sm:col-span-2">
                        <label className={`block text-xs font-medium mb-1.5 ${textMuted}`}>Logradouro / Rua</label>
                        <input
                          type="text"
                          required
                          value={address.street}
                          onChange={(e) => setAddress({ ...address, street: e.target.value })}
                          placeholder="Ex: Av. Paulista"
                          className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${inputBg} ${inputBorder} ${textTitle}`}
                        />
                      </div>

                      <div>
                        <label className={`block text-xs font-medium mb-1.5 ${textMuted}`}>Número</label>
                        <input
                          type="text"
                          required
                          value={address.number}
                          onChange={(e) => setAddress({ ...address, number: e.target.value })}
                          placeholder="123"
                          className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${inputBg} ${inputBorder} ${textTitle}`}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className={`block text-xs font-medium mb-1.5 ${textMuted}`}>Bairro</label>
                        <input
                          type="text"
                          required
                          value={address.neighborhood}
                          onChange={(e) => setAddress({ ...address, neighborhood: e.target.value })}
                          placeholder="Centro"
                          className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${inputBg} ${inputBorder} ${textTitle}`}
                        />
                      </div>

                      <div>
                        <label className={`block text-xs font-medium mb-1.5 ${textMuted}`}>Cidade</label>
                        <input
                          type="text"
                          required
                          value={address.city}
                          onChange={(e) => setAddress({ ...address, city: e.target.value })}
                          placeholder="São Paulo"
                          className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${inputBg} ${inputBorder} ${textTitle}`}
                        />
                      </div>
                    </div>

                    <div className="lg:hidden pt-4">
                      <button
                        type="submit"
                        style={{ backgroundColor: activeGreen }}
                        className="w-full py-3.5 px-6 rounded-full font-bold text-slate-950 flex items-center justify-center gap-2 hover:opacity-95 transition-all shadow-md cursor-pointer"
                      >
                        <span>Continuar para Pagamento</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </form>
                )}

                {/* ETAPA 3: PAGAMENTO (PIX, CARTÃO, BOLETO) */}
                {currentStep === 3 && (
                  <div className="space-y-6 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <h2 className={`text-xl md:text-2xl font-bold ${textTitle}`}>Forma de Pagamento</h2>
                      <button
                        type="button"
                        onClick={() => setCurrentStep(showAddress ? 2 : 1)}
                        className={`text-xs font-medium flex items-center gap-1 ${textMuted} hover:text-emerald-400`}
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        Voltar
                      </button>
                    </div>

                    {/* Seleção de Abas de Pagamento */}
                    <div className="grid grid-cols-3 gap-2 p-1 rounded-2xl bg-black/10 border border-gray-500/10">
                      {acceptedMethods.includes('PIX') && (
                        <button
                          type="button"
                          onClick={() => initiatePaymentMethod('PIX')}
                          className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            selectedMethod === 'PIX'
                              ? 'bg-emerald-500 text-black shadow-md'
                              : `${textMuted} hover:${textTitle}`
                          }`}
                        >
                          <QrCode className="w-4 h-4" />
                          <span>PIX</span>
                        </button>
                      )}

                      {acceptedMethods.includes('CREDIT_CARD') && (
                        <button
                          type="button"
                          onClick={() => initiatePaymentMethod('CREDIT_CARD')}
                          className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            selectedMethod === 'CREDIT_CARD'
                              ? 'bg-emerald-500 text-black shadow-md'
                              : `${textMuted} hover:${textTitle}`
                          }`}
                        >
                          <CreditCard className="w-4 h-4" />
                          <span>Cartão</span>
                        </button>
                      )}

                      {acceptedMethods.includes('BOLETO') && (
                        <button
                          type="button"
                          onClick={() => initiatePaymentMethod('BOLETO')}
                          className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            selectedMethod === 'BOLETO'
                              ? 'bg-emerald-500 text-black shadow-md'
                              : `${textMuted} hover:${textTitle}`
                          }`}
                        >
                          <Barcode className="w-4 h-4" />
                          <span>Boleto</span>
                        </button>
                      )}
                    </div>

                    {/* CONTEÚDO DO PIX */}
                    {selectedMethod === 'PIX' && (
                      <div className={`p-6 rounded-2xl border text-center space-y-4 ${summaryBoxBg} ${cardBorder}`}>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-semibold">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                          <span>QR Code PIX Dinâmico Gerado</span>
                        </div>

                        {loading ? (
                          <div className="py-10 flex flex-col items-center justify-center gap-2">
                            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                            <span className={`text-xs ${textMuted}`}>Conectando à AbacatePay...</span>
                          </div>
                        ) : (
                          <>
                            {pixData?.brCodeBase64 ? (
                              <div className="p-3 bg-white rounded-2xl inline-block shadow-md">
                                <img
                                  src={pixData.brCodeBase64.startsWith('data:') ? pixData.brCodeBase64 : `data:image/png;base64,${pixData.brCodeBase64}`}
                                  alt="PIX QR Code"
                                  className="w-48 h-48 object-contain"
                                />
                              </div>
                            ) : (
                              <div className="p-4 bg-white rounded-2xl inline-block shadow-md">
                                <QrCode className="w-40 h-40 text-slate-900" />
                              </div>
                            )}

                            <div>
                              <p className={`text-xs ${textMuted} max-w-sm mx-auto mb-3`}>
                                Abra o aplicativo do seu banco, escolha <strong>Pagar via PIX</strong> e escaneie o código ou use a chave Copia e Cola:
                              </p>

                              <button
                                type="button"
                                onClick={handleCopyPix}
                                className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                  copiedPix
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                    : `${inputBg} ${inputBorder} ${textTitle} hover:border-emerald-500`
                                }`}
                              >
                                {copiedPix ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                                <span>{copiedPix ? 'Código PIX Copiado com Sucesso!' : 'Copiar Código PIX (Copia e Cola)'}</span>
                              </button>
                            </div>

                            {/* DevMode Simulator */}
                            <div className="pt-2 border-t border-gray-500/20">
                              <button
                                type="button"
                                onClick={handleSimulatePixPayment}
                                className="text-xs text-emerald-400 hover:underline inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Simular Pagamento Aprovado (Dev Sandbox)</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* CONTEÚDO DO CARTÃO DE CRÉDITO */}
                    {selectedMethod === 'CREDIT_CARD' && (
                      <form onSubmit={handlePayCard} className="space-y-4">
                        <div>
                          <label className={`block text-xs font-medium mb-1.5 ${textMuted}`}>Número do Cartão</label>
                          <input
                            type="text"
                            required
                            value={cardData.number}
                            onChange={(e) => setCardData({ ...cardData, number: formatCardNumber(e.target.value) })}
                            placeholder="0000 0000 0000 0000"
                            className={`w-full px-4 py-2.5 rounded-xl border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${inputBg} ${inputBorder} ${textTitle}`}
                          />
                        </div>

                        <div>
                          <label className={`block text-xs font-medium mb-1.5 ${textMuted}`}>Nome Impresso no Cartão</label>
                          <input
                            type="text"
                            required
                            value={cardData.holder}
                            onChange={(e) => setCardData({ ...cardData, holder: e.target.value.toUpperCase() })}
                            placeholder="NOME COMO NO CARTÃO"
                            className={`w-full px-4 py-2.5 rounded-xl border text-sm uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${inputBg} ${inputBorder} ${textTitle}`}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className={`block text-xs font-medium mb-1.5 ${textMuted}`}>Validade</label>
                            <input
                              type="text"
                              required
                              value={cardData.expiry}
                              onChange={(e) => setCardData({ ...cardData, expiry: formatExpiry(e.target.value) })}
                              placeholder="MM/AA"
                              className={`w-full px-4 py-2.5 rounded-xl border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${inputBg} ${inputBorder} ${textTitle}`}
                            />
                          </div>

                          <div>
                            <label className={`block text-xs font-medium mb-1.5 ${textMuted}`}>CVV</label>
                            <input
                              type="password"
                              maxLength={4}
                              required
                              value={cardData.cvv}
                              onChange={(e) => setCardData({ ...cardData, cvv: e.target.value.replace(/\D/g, '') })}
                              placeholder="123"
                              className={`w-full px-4 py-2.5 rounded-xl border text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${inputBg} ${inputBorder} ${textTitle}`}
                            />
                          </div>
                        </div>

                        <div>
                          <label className={`block text-xs font-medium mb-1.5 ${textMuted}`}>Parcelamento</label>
                          <select
                            value={cardData.installments}
                            onChange={(e) => setCardData({ ...cardData, installments: e.target.value })}
                            className={`w-full px-4 py-2.5 rounded-xl border text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${inputBg} ${inputBorder} ${textTitle}`}
                          >
                            <option value="1">1x de {formatPrice(product.price)} à vista (Sem juros)</option>
                            <option value="2">2x de {formatPrice(product.price / 2)} (Sem juros)</option>
                            <option value="3">3x de {formatPrice(product.price / 3)} (Sem juros)</option>
                            <option value="6">6x de {formatPrice(product.price / 6)} (Sem juros)</option>
                            <option value="12">12x de {formatPrice(product.price / 12)} (Sem juros)</option>
                          </select>
                        </div>

                        <button
                          type="submit"
                          disabled={loading}
                          style={{ backgroundColor: activeGreen }}
                          className="w-full py-3.5 px-6 rounded-full font-bold text-slate-950 flex items-center justify-center gap-2 hover:opacity-95 transition-all shadow-md cursor-pointer disabled:opacity-50"
                        >
                          {loading ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Processando...</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-4 h-4" />
                              <span>Pagar {formatPrice(product.price)} no Cartão</span>
                            </>
                          )}
                        </button>
                      </form>
                    )}

                    {/* CONTEÚDO DO BOLETO */}
                    {selectedMethod === 'BOLETO' && (
                      <div className={`p-6 rounded-2xl border text-center space-y-4 ${summaryBoxBg} ${cardBorder}`}>
                        <div className="w-12 h-12 rounded-full bg-blue-500/20 text-blue-400 mx-auto flex items-center justify-center">
                          <Barcode className="w-6 h-6" />
                        </div>
                        <h4 className={`font-bold text-base ${textTitle}`}>Boleto Bancário Registrado</h4>
                        <p className={`text-xs ${textMuted} max-w-sm mx-auto`}>
                          O boleto bancário é compensado em até 1 dia útil após o pagamento.
                        </p>

                        {boletoData?.identificationNumber && (
                          <div className="space-y-3">
                            <div className={`p-3 rounded-xl border text-xs font-mono break-all ${inputBg} ${inputBorder} ${textTitle}`}>
                              {boletoData.identificationNumber}
                            </div>
                            <button
                              type="button"
                              onClick={handleCopyBoleto}
                              className={`w-full py-2.5 px-4 rounded-xl text-xs font-semibold border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                copiedBoleto
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                  : `${inputBg} ${inputBorder} ${textTitle} hover:border-emerald-500`
                              }`}
                            >
                              {copiedBoleto ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                              <span>{copiedBoleto ? 'Linha Digitável Copiada!' : 'Copiar Linha Digitável'}</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* LADO DIREITO: Resumo do Pedido & Botão de Ação Verde (idêntico aos screenshots) */}
        <div className={`lg:col-span-5 p-6 md:p-10 border-t lg:border-t-0 lg:border-l flex flex-col justify-between ${isDark ? 'border-[#222a3a] bg-[#121620]/90' : 'border-gray-100 bg-[#fafbfc]'}`}>
          <div className="space-y-6">
            {/* Box do Produto */}
            <div className={`p-4 rounded-2xl border flex items-center gap-4 ${summaryBoxBg} ${cardBorder}`}>
              <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 border ${isDark ? 'bg-[#1e2738] border-[#2c3850]' : 'bg-gray-100 border-gray-200'}`}>
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.name} className="w-10 h-10 object-contain rounded-lg" />
                ) : (
                  <span className="text-2xl select-none">💈</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className={`font-bold text-sm md:text-base truncate ${textTitle}`}>{product.name}</h3>
                <span className={`text-xs md:text-sm font-semibold ${textMuted}`}>
                  {formatPrice(product.price)}
                </span>
              </div>
            </div>

            {/* Seção Resumo */}
            <div className="space-y-3">
              <span className={`text-xs font-bold uppercase tracking-wider block ${textMuted}`}>Resumo</span>
              <div className="flex items-center justify-between text-xs md:text-sm">
                <span className={textMuted}>{product.name}</span>
                <span className={`font-semibold ${textTitle}`}>{formatPrice(product.price)}</span>
              </div>
            </div>

            <div className={`h-[1px] w-full ${isDark ? 'bg-[#222a3a]' : 'bg-gray-200'}`} />

            {/* Total Grande e Destacado */}
            <div className="flex items-center justify-between">
              <span className={`text-base md:text-lg font-bold ${textTitle}`}>Total:</span>
              <span className={`text-xl md:text-2xl font-extrabold ${textTitle}`}>
                {formatPrice(product.price)}
              </span>
            </div>
          </div>

          {/* Botão de Ação Verde "Continuar ->" (Desktop) */}
          <div className="pt-8">
            {currentStep === 1 ? (
              <button
                type="button"
                onClick={handleContinueStep1}
                style={{ backgroundColor: activeGreen }}
                className="w-full py-4 px-6 rounded-full font-bold text-slate-950 flex items-center justify-center gap-2 hover:opacity-95 transition-all shadow-lg hover:shadow-emerald-500/20 cursor-pointer active:scale-[0.99]"
              >
                <span className="text-sm md:text-base">Continuar</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : currentStep === 2 ? (
              <button
                type="button"
                onClick={handleContinueStep2}
                style={{ backgroundColor: activeGreen }}
                className="w-full py-4 px-6 rounded-full font-bold text-slate-950 flex items-center justify-center gap-2 hover:opacity-95 transition-all shadow-lg hover:shadow-emerald-500/20 cursor-pointer active:scale-[0.99]"
              >
                <span className="text-sm md:text-base">Continuar</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <div className="text-center">
                <span className={`text-xs ${textMuted} flex items-center justify-center gap-1.5`}>
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Ambiente criptografado e seguro</span>
                </span>
              </div>
            )}

            <div className="mt-4 text-center">
              <span className={`text-[11px] ${textMuted}`}>
                Processado com segurança via <strong>AbacatePay v2</strong>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
