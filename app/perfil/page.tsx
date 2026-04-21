'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  User, 
  Camera, 
  Mail, 
  Phone, 
  MapPin, 
  Save,
  X,
  Settings
} from 'lucide-react'

export default function PerfilPage() {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
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
        window.location.reload()
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
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push('/dashboard')}
            className="mb-4"
          >
            <Settings className="mr-2 h-4 w-4" />
            Voltar para Dashboard
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Meu Perfil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Avatar Section */}
            <div className="flex items-center space-x-6">
              <div className="flex flex-col items-center space-y-2">
                <Avatar className="h-24 w-24">
                  {formData.avatar ? (
                    <AvatarImage src={formData.avatar} alt={formData.name} />
                  ) : (
                    <AvatarFallback className="text-2xl">
                      {formData.name?.charAt(0)?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  )}
                </Avatar>
                {isEditing && (
                  <div className="mt-4">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="max-w-xs"
                    />
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-4">Informações Pessoais</h3>
                
                {isEditing ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Nome</label>
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Seu nome"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Email</label>
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="Seu email"
                        disabled // Email não pode ser alterado
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Telefone</label>
                      <Input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="Seu telefone"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{formData.name}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span>{formData.email}</span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span>{formData.phone || 'Não informado'}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Role Badge */}
            <div className="flex items-center space-x-4 p-4 bg-muted/50 rounded-lg">
              <div className="text-center">
                <p className="text-sm text-muted-foreground">Tipo de Conta</p>
                <div className="text-2xl font-bold text-primary mt-1">
                  {user?.role === 'ADMIN' && 'Administrador'}
                  {user?.role === 'BARBER' && 'Barbeiro'}
                  {user?.role === 'CLIENT' && 'Cliente'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {user?.role === 'ADMIN' && 'Acesso total ao sistema'}
                  {user?.role === 'BARBER' && 'Gerencia agendamentos e serviços'}
                  {user?.role === 'CLIENT' && 'Realiza agendamentos'}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 pt-6 border-t">
              {!isEditing ? (
                <Button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Editar Perfil
                </Button>
              ) : (
                <div className="flex space-x-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setFormData({
                        name: user?.name || '',
                        email: user?.email || '',
                        phone: user?.phone || '',
                        avatar: user?.avatar || ''
                      })
                      setIsEditing(false)
                    }}
                  >
                    <X className="mr-2 h-4 w-4" />
                    Cancelar
                  </Button>
                  
                  <Button
                    onClick={handleSaveProfile}
                    disabled={isLoading}
                    className="flex items-center"
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary border-r-transparent border-t-transparent mr-2"></div>
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Salvar Alterações
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
