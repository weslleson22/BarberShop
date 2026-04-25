'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { User, Camera, Mail, Phone, MapPin, Calendar, Shield, Settings, Save, Upload } from 'lucide-react'
import AppSidebar from '@/components/dashboard/AppSidebar'

export default function ConfiguracoesPage() {
  const { user, updateUser } = useAuth()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    birthDate: '',
    bio: ''
  })
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState('')

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || 'Wesleson Souza',
        email: user.email || 'wes@gmail.com',
        phone: (user as any).phone || '(11) 99999-8888',
        address: (user as any).address || '',
        birthDate: (user as any).birthDate || '',
        bio: (user as any).bio || ''
      })
      // Carregar avatar salvo no localStorage
      const savedAvatar = localStorage.getItem('userAvatar')
      if (savedAvatar) {
        setAvatarPreview(savedAvatar)
      }
    } else {
      // Se não houver usuário, preencher com dados de exemplo
      setFormData({
        name: 'Wesleson Souza',
        email: 'wes@gmail.com',
        phone: '(11) 99999-8888',
        address: '',
        birthDate: '',
        bio: ''
      })
    }
  }, [user])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    // Aplicar máscara manualmente
    let formattedValue = value.replace(/\D/g, '')
    
    // Limitar a 11 dígitos
    if (formattedValue.length > 11) {
      formattedValue = formattedValue.slice(0, 11)
    }
    
    // Aplicar formatação (XX) XXXXX-XXXX
    if (formattedValue.length > 10) {
      formattedValue = `(${formattedValue.slice(0, 2)}) ${formattedValue.slice(2, 7)}-${formattedValue.slice(7, 11)}`
    } else if (formattedValue.length > 6) {
      formattedValue = `(${formattedValue.slice(0, 2)}) ${formattedValue.slice(2, 7)}`
    } else if (formattedValue.length > 2) {
      formattedValue = `(${formattedValue.slice(0, 2)}) ${formattedValue.slice(2)}`
    }
    
    setFormData(prev => ({ ...prev, [name]: formattedValue }))
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Chamar API real para atualizar usuário
      const response = await fetch('/api/user/update', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          birthDate: formData.birthDate,
          bio: formData.bio
        })
      })

      if (response.ok) {
        const updatedUser = await response.json()
        
        // Atualizar contexto do usuário com a função updateUser
        updateUser(updatedUser)
        
        // Salvar avatar separadamente se houver
        if (typeof window !== 'undefined' && avatarPreview) {
          localStorage.setItem('userAvatar', avatarPreview)
        }
        
        alert('Perfil atualizado com sucesso!')
        
        // Recarregar a página para mostrar as atualizações
        window.location.reload()
      } else {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Erro ao atualizar perfil')
      }
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error)
      alert('Erro ao atualizar perfil. Tente novamente.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950 to-black">
      <div className="lg:pl-80">
        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-white mb-2">Configurações</h1>
              <p className="text-white/60">Gerencie seu perfil e preferências</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Avatar Section */}
              <div className="lg:col-span-1">
                <div className="bg-gradient-to-br from-gray-800/50 to-black/50 border border-white/6 rounded-xl p-6">
                  <h2 className="text-lg font-semibold text-white mb-4">Foto do Perfil</h2>
                  
                  <div className="flex flex-col items-center">
                    <div className="relative mb-4">
                      <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center">
                        {avatarPreview ? (
                          <img 
                            src={avatarPreview} 
                            alt="Avatar" 
                            className="w-24 h-24 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-black font-bold text-2xl">
                            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                          </span>
                        )}
                      </div>
                      <label className="absolute bottom-0 right-0 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full p-2 cursor-pointer hover:from-yellow-500 hover:to-yellow-700 transition-all">
                        <Camera className="w-4 h-4 text-black" />
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*"
                          onChange={handleAvatarChange}
                        />
                      </label>
                    </div>
                    
                    <label className="w-full py-2 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-semibold rounded-lg hover:from-yellow-500 hover:to-yellow-700 transition-all flex items-center justify-center space-x-2 cursor-pointer">
                      <Upload className="w-4 h-4" />
                      <span>Alterar Foto</span>
                      <input 
                        type="file" 
                        className="hidden" 
                        accept="image/*"
                        onChange={handleAvatarChange}
                      />
                    </label>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-gradient-to-br from-gray-800/50 to-black/50 border border-white/6 rounded-xl p-6 mt-6">
                  <h2 className="text-lg font-semibold text-white mb-4">Ações Rápidas</h2>
                  <div className="space-y-3">
                    <button className="w-full py-2 bg-white/5 border border-white/10 rounded-lg text-white hover:bg-white/10 transition-all flex items-center justify-center space-x-2">
                      <Shield className="w-4 h-4" />
                      <span>Alterar Senha</span>
                    </button>
                    <button className="w-full py-2 bg-white/5 border border-white/10 rounded-lg text-white hover:bg-white/10 transition-all flex items-center justify-center space-x-2">
                      <Settings className="w-4 h-4" />
                      <span>Notificações</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Form Section */}
              <div className="lg:col-span-2">
                <div className="bg-gradient-to-br from-gray-800/50 to-black/50 border border-white/6 rounded-xl p-6">
                  <h2 className="text-lg font-semibold text-white mb-6">Informações Pessoais</h2>
                  
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-medium text-white mb-2">
                          <User className="w-4 h-4 inline mr-2" />
                          Nome Completo
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-yellow-400/50 focus:bg-white/10 transition-all"
                          placeholder="Wesleson Souza"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-white mb-2">
                          <Mail className="w-4 h-4 inline mr-2" />
                          E-mail
                        </label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-yellow-400/50 focus:bg-white/10 transition-all"
                          placeholder="wes@gmail.com"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-white mb-2">
                          <Phone className="w-4 h-4 inline mr-2" />
                          Telefone
                        </label>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handlePhoneChange}
                          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-yellow-400/50 focus:bg-white/10 transition-all"
                          placeholder="(11) 99999-8888"
                          maxLength={15}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-white mb-2">
                          <Calendar className="w-4 h-4 inline mr-2" />
                          Data de Nascimento
                        </label>
                        <input
                          type="date"
                          name="birthDate"
                          value={formData.birthDate}
                          onChange={handleInputChange}
                          className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-yellow-400/50 focus:bg-white/10 transition-all"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        <MapPin className="w-4 h-4 inline mr-2" />
                        Endereço
                      </label>
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-yellow-400/50 focus:bg-white/10 transition-all"
                        placeholder="Seu endereço"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white mb-2">Bio</label>
                      <textarea
                        name="bio"
                        value={formData.bio}
                        onChange={handleInputChange}
                        rows={4}
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-yellow-400/50 focus:bg-white/10 transition-all resize-none"
                        placeholder="Fale um pouco sobre você..."
                      />
                    </div>

                    <div className="flex justify-end space-x-4">
                      <button
                        type="button"
                        onClick={() => router.back()}
                        className="px-6 py-2 bg-white/5 border border-white/10 rounded-lg text-white hover:bg-white/10 transition-all"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="px-6 py-2 bg-gradient-to-r from-yellow-400 to-yellow-600 text-black font-semibold rounded-lg hover:from-yellow-500 hover:to-yellow-700 transition-all flex items-center space-x-2 disabled:opacity-50"
                      >
                        <Save className="w-4 h-4" />
                        <span>{isLoading ? 'Salvando...' : 'Salvar Alterações'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <AppSidebar />
    </div>
  )
}
