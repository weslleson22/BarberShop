'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import AppSidebar from '@/components/dashboard/AppSidebar'
import { 
  User, 
  Camera, 
  Mail, 
  Phone, 
  MapPin, 
  Save,
  X,
  Settings,
  Upload
} from 'lucide-react'

export default function PerfilPage() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    avatar: user?.avatar || ''
  })

  const handleSaveProfile = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        const updatedUser = await response.json()
        // Update user in context and localStorage
        localStorage.setItem('user-data', JSON.stringify(updatedUser))
        router.push('/perfil')
      } else {
        console.error('Erro ao atualizar perfil')
      }
    } catch (error) {
      console.error('Erro ao salvar perfil:', error)
    } finally {
      setIsLoading(false)
      setIsEditing(false)
    }
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = (event) => {
        const result = event.target?.result
        if (typeof result === 'string') {
          setFormData(prev => ({ ...prev, avatar: result }))
        }
      }
      reader.readAsDataURL(file)
    }
  }

  if (!user) {
    router.push('/login')
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-blue-950 to-black">
      {/* Sidebar Fixado atrás do conteúdo */}
      <div className="fixed inset-y-0 left-0 z-30 w-80">
        <AppSidebar />
      </div>
      
      {/* Conteúdo principal à frente do sidebar */}
      <div className="lg:pl-80 relative z-40">
        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            
            <div className="bg-gradient-to-br from-gray-800/50 to-black/50 border border-white/6 rounded-2xl p-6">
              <h2 className="text-2xl font-bold text-white mb-6">Meu Perfil</h2>
              
              <div className="space-y-6">
                {/* Avatar Section */}
                <div className="flex items-center space-x-6">
                  <div className="flex flex-col items-center space-y-2">
                    <div className="relative">
                      <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center">
                        {formData.avatar ? (
                          <img 
                            src={formData.avatar} 
                            alt="Profile" 
                            className="w-24 h-24 rounded-full object-cover"
                          />
                        ) : (
                          <span className="text-2xl font-bold text-black">
                            {formData.name?.charAt(0)?.toUpperCase() || 'U'}
                          </span>
                        )}
                      </div>
                      {isEditing && (
                        <label className="absolute bottom-0 right-0 bg-yellow-400 text-black p-2 rounded-full cursor-pointer hover:bg-yellow-500 transition-colors">
                          <Camera className="w-4 h-4" />
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarChange}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                    {isEditing && (
                      <div className="mt-4">
                        <label className="text-white/60 text-sm cursor-pointer hover:text-white transition-colors flex items-center">
                          <Upload className="w-4 h-4 mr-2" />
                          Alterar Foto
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarChange}
                            className="hidden"
                          />
                        </label>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white mb-4">Informações Pessoais</h3>
                    
                    {isEditing ? (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-white/80 mb-1">Nome</label>
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Seu nome"
                            className="w-full px-3 py-2 bg-white/5 border border-white/6 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-white/80 mb-1">Email</label>
                          <input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="Seu email"
                            disabled // Email não pode ser alterado
                            className="w-full px-3 py-2 bg-white/5 border border-white/6 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-yellow-400/50 focus:border-yellow-400/50 transition-all disabled:opacity-50"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center space-x-2">
                          <User className="w-5 h-5 text-white/60" />
                          <span className="text-white">{formData.name}</span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Mail className="w-5 h-5 text-white/60" />
                          <span className="text-white/80">{formData.email}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Role Badge */}
                <div className="flex items-center space-x-4 p-4 bg-white/5 border border-white/6 rounded-xl">
                  <div className="text-center">
                    <p className="text-sm text-white/60">Tipo de Conta</p>
                    <div className="text-2xl font-bold text-yellow-400 mt-1">
                      {user?.role === 'ADMIN' && 'Administrador'}
                      {user?.role === 'BARBER' && 'Barbeiro'}
                      {user?.role === 'CLIENT' && 'Cliente'}
                    </div>
                    <p className="text-xs text-white/60 mt-1">
                      {user?.role === 'ADMIN' && 'Acesso total ao sistema'}
                      {user?.role === 'BARBER' && 'Gerencia agendamentos e serviços'}
                      {user?.role === 'CLIENT' && 'Realiza agendamentos'}
                    </p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end space-x-4 pt-6 border-t border-white/10">
                  {!isEditing ? (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black px-6 py-3 rounded-xl hover:from-yellow-500 hover:to-yellow-700 transition-all flex items-center font-medium"
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      Editar Perfil
                    </button>
                  ) : (
                    <div className="flex space-x-4">
                      <button
                        onClick={() => {
                          setFormData({
                            name: user?.name || '',
                            email: user?.email || '',
                            avatar: user?.avatar || ''
                          })
                          setIsEditing(false)
                        }}
                        className="bg-white/10 border border-white/20 text-white px-6 py-3 rounded-xl hover:bg-white/20 transition-all flex items-center font-medium"
                      >
                        <X className="mr-2 h-4 w-4" />
                        Cancelar
                      </button>
                      
                      <button
                        onClick={handleSaveProfile}
                        disabled={isLoading}
                        className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-black px-6 py-3 rounded-xl hover:from-yellow-500 hover:to-yellow-700 transition-all flex items-center font-medium disabled:opacity-50"
                      >
                        {isLoading ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black border-r-transparent border-t-transparent mr-2"></div>
                            Salvando...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Salvar Alterações
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
