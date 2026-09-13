'use client'

import { useState, useEffect } from 'react'
import { X, User, Phone, Mail, Save, Plus } from 'lucide-react'

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
    email: ''
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      if (client) {
        setFormData({
          name: client.name || '',
          phone: client.phone || '',
          email: client.email || ''
        })
      } else {
        setFormData({
          name: '',
          phone: '',
          email: ''
        })
      }
    }
  }, [isOpen, client])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    let formattedValue = value

    // Apply masks based on field name
    if (name === 'name') {
      // Name mask - proper case (first letter uppercase, rest lowercase)
      formattedValue = value
        .split(' ')
        .map(word => 
          word.length > 0 
            ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            : ''
        )
        .join(' ')
    } else if (name === 'phone') {
      // Phone mask - (00) 00000-0000
      const cleaned = value.replace(/\D/g, '')
      
      if (cleaned.length <= 2) {
        formattedValue = cleaned
      } else if (cleaned.length <= 7) {
        formattedValue = `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`
      } else {
        formattedValue = `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7, 11)}`
      }
    } else if (name === 'email') {
      // Email mask - lowercase and basic format validation
      formattedValue = value.toLowerCase()
    }

    setFormData(prev => ({ ...prev, [name]: formattedValue }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (!formData.name || !formData.phone) {
        alert('Nome e telefone são obrigatórios')
        setLoading(false)
        return
      }

      const clientData = {
        name: formData.name,
        phone: formData.phone,
        email: formData.email
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
                maxLength={100}
              />
            </div>
            <p className="text-white/40 text-xs mt-1">Primeira letra maiúscula automaticamente</p>
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
            <p className="text-white/40 text-xs mt-1">Formato automático: (00) 00000-0000</p>
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
                placeholder="email@exemplo.com"
                maxLength={100}
              />
            </div>
            <p className="text-white/40 text-xs mt-1">Convertido para minúsculas automaticamente</p>
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
              disabled={loading}
              className="px-4 md:px-6 py-2.5 md:py-3 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-semibold rounded-lg md:rounded-xl hover:from-yellow-500 hover:to-yellow-700 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 text-sm md:text-base"
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
