'use client'

import { useState, useEffect } from 'react'
import { X, User, Phone, Mail, Save, Plus, Crown } from 'lucide-react'

const NAME_MIN = 3
const NAME_MAX = 80
const EMAIL_MAX = 80
const EMAIL_PATTERN = /^[a-z0-9._%+\-]+@[a-z0-9.-]+\.[a-z]{2,}$/

function maskName(value: string) {
  return value
    .replace(/[^A-Za-zÀ-ÿ'\-\s]/g, '')
    .slice(0, NAME_MAX)
    .split(' ')
    .map((word) =>
      word.length > 0
        ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        : ''
    )
    .join(' ')
}

function maskEmail(value: string) {
  let formatted = value
    .toLowerCase()
    .replace(/\s/g, '')
    .replace(/[^a-z0-9@._+\-]/g, '')

  const atIndex = formatted.indexOf('@')
  if (atIndex !== -1) {
    const local = formatted.slice(0, atIndex).replace(/@/g, '')
    const domain = formatted.slice(atIndex + 1).replace(/@/g, '')
    formatted = `${local}@${domain}`
  }

  return formatted.slice(0, EMAIL_MAX)
}

interface ClientModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (client: any) => void
  client?: any
}

export default function ClientModal({ isOpen, onClose, onSave, client }: ClientModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    isVip: false
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      if (client) {
        setFormData({
          name: client.name || '',
          phone: client.phone || '',
          email: client.email || '',
          isVip: Boolean(client.isVip)
        })
      } else {
        setFormData({
          name: '',
          phone: '',
          email: '',
          isVip: false
        })
      }
    }
  }, [isOpen, client])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    let formattedValue = value

    if (name === 'name') {
      formattedValue = maskName(value)
    } else if (name === 'phone') {
      const cleaned = value.replace(/\D/g, '')

      if (cleaned.length <= 2) {
        formattedValue = cleaned
      } else if (cleaned.length <= 7) {
        formattedValue = `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`
      } else {
        formattedValue = `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`
      }
    } else if (name === 'email') {
      formattedValue = maskEmail(value)
    }

    setFormData((prev) => ({ ...prev, [name]: formattedValue }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const trimmedName = formData.name.trim()

      if (!trimmedName || !formData.phone) {
        alert('Nome e telefone são obrigatórios')
        setLoading(false)
        return
      }

      if (trimmedName.length < NAME_MIN) {
        alert(`O nome deve ter pelo menos ${NAME_MIN} caracteres`)
        setLoading(false)
        return
      }

      const phoneDigits = formData.phone.replace(/\D/g, '')
      if (phoneDigits.length < 10 || phoneDigits.length > 11) {
        alert('Informe um telefone válido com DDD, no formato (00) 00000-0000')
        setLoading(false)
        return
      }

      if (formData.email && !EMAIL_PATTERN.test(formData.email)) {
        alert('Informe um e-mail válido no formato nome@dominio.com')
        setLoading(false)
        return
      }

      const clientData = {
        name: trimmedName,
        phone: formData.phone,
        email: formData.email,
        isVip: formData.isVip,
      }

      console.log('Enviando dados do cliente:', clientData)

      if (client?.id) {
        // Update existing client
        const response = await fetch(`/api/clients/${client.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(clientData),
        })

        if (response.ok) {
          const result = await response.json()
          console.log('Cliente atualizado:', result)
          onSave(result)
          onClose()
        } else {
          const error = await response.json()
          console.error('Erro ao atualizar:', error)
          alert(error.error || 'Erro ao atualizar cliente')
        }
      } else {
        // Create new client
        const response = await fetch('/api/clients/public', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(clientData),
        })

        if (response.ok) {
          const result = await response.json()
          console.log('Cliente criado:', result)
          onSave(result)
          onClose()
        } else {
          const error = await response.json()
          console.error('Erro ao criar:', error)
          alert(error.error || 'Erro ao criar cliente')
        }
      }
    } catch (error) {
      console.error('Error saving client:', error)
      alert('Erro ao salvar cliente')
    } finally {
      setLoading(false)
    }
  }

  const trimmedName = formData.name.trim()
  const phoneDigits = formData.phone.replace(/\D/g, '')
  const isPhoneValid = phoneDigits.length >= 10 && phoneDigits.length <= 11
  const isEmailValid = !formData.email || EMAIL_PATTERN.test(formData.email)
  const isFormValid = trimmedName.length >= NAME_MIN && isPhoneValid && isEmailValid

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 md:p-6 safe-area-top safe-area-bottom">
      <div className="modal-responsive bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-xl md:rounded-2xl p-4 md:p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <h2 className="text-xl md:text-2xl font-bold text-white">
            {client ? 'Editar Cliente' : 'Novo Cliente'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-all"
            aria-label="Fechar modal"
          >
            <X className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
          {/* Name */}
          <div>
            <label className="block text-white/80 text-xs md:text-sm font-medium mb-1.5 md:mb-2">
              Nome *
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-white/40" />
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="w-full pl-9 md:pl-10 pr-4 py-2.5 md:py-3 bg-white/5 border border-white/10 rounded-lg md:rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-yellow-400/50 focus:bg-white/10 transition-all text-sm md:text-base"
                placeholder="Ex: João Silva"
                required
                minLength={NAME_MIN}
                maxLength={NAME_MAX}
              />
            </div>
            <div className="flex items-center justify-between mt-1">
              <p className="text-white/40 text-xs">
                {NAME_MIN} a {NAME_MAX} caracteres (recomendado para nome completo)
              </p>
              <p className="text-white/40 text-xs">
                {formData.name.length}/{NAME_MAX}
              </p>
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-white/80 text-xs md:text-sm font-medium mb-1.5 md:mb-2">
              Telefone *
            </label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-white/40" />
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full pl-9 md:pl-10 pr-4 py-2.5 md:py-3 bg-white/5 border border-white/10 rounded-lg md:rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-yellow-400/50 focus:bg-white/10 transition-all text-sm md:text-base"
                placeholder="(00) 00000-0000"
                required
                maxLength={15}
              />
            </div>
            {formData.phone && !isPhoneValid ? (
              <p className="text-red-400 text-xs mt-1">
                Telefone incompleto. Informe DDD + número, formato (00) 00000-0000
              </p>
            ) : (
              <p className="text-white/40 text-xs mt-1">Formato automático: (00) 00000-0000</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-white/80 text-xs md:text-sm font-medium mb-1.5 md:mb-2">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 md:w-5 md:h-5 text-white/40" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full pl-9 md:pl-10 pr-4 py-2.5 md:py-3 bg-white/5 border border-white/10 rounded-lg md:rounded-xl text-white placeholder-white/40 focus:outline-none focus:border-yellow-400/50 focus:bg-white/10 transition-all text-sm md:text-base"
                placeholder="nome@dominio.com"
                maxLength={EMAIL_MAX}
                inputMode="email"
                autoComplete="email"
              />
            </div>
            {formData.email && !isEmailValid ? (
              <p className="text-red-400 text-xs mt-1">
                E-mail inválido. Use o formato nome@dominio.com
              </p>
            ) : (
              <p className="text-white/40 text-xs mt-1">
                Máscara: minúsculas, um @ e formato nome@dominio.com
              </p>
            )}
          </div>

          {/* Cliente VIP Toggle */}
          <div className="flex items-center justify-between p-3 md:p-3.5 bg-gradient-to-r from-yellow-400/10 via-amber-400/5 to-transparent border border-yellow-400/20 rounded-lg md:rounded-xl">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-yellow-400/20 flex items-center justify-center flex-shrink-0">
                <Crown className="w-4 h-4 text-yellow-400" />
              </div>
              <div>
                <p className="text-white text-xs md:text-sm font-semibold flex items-center gap-1.5">
                  Cliente VIP
                  {formData.isVip && (
                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-yellow-400/20 text-yellow-300 border border-yellow-400/30">
                      Ativo
                    </span>
                  )}
                </p>
                <p className="text-white/50 text-[11px] md:text-xs">
                  Destacar cliente com atendimento prioritário e badge VIP na agenda
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
              <input
                type="checkbox"
                name="isVip"
                checked={formData.isVip}
                onChange={(e) => setFormData((prev) => ({ ...prev, isVip: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-400"></div>
            </label>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end space-y-2 sm:space-y-0 sm:space-x-4 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 md:px-6 py-2.5 md:py-3 text-white/80 hover:text-white border border-white/20 rounded-lg md:rounded-xl hover:bg-white/10 transition-all text-sm md:text-base"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !isFormValid}
              className="px-4 md:px-6 py-2.5 md:py-3 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-semibold rounded-lg md:rounded-xl hover:from-yellow-500 hover:to-yellow-700 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black"></div>
              ) : (
                <Save className="w-4 h-4" />
              )}
              <span>{client ? 'Atualizar' : 'Salvar'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
