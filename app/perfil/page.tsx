'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import DropdownHeader from '@/components/shared/DropdownHeader'
import {
  User as UserIcon,
  Camera,
  Mail,
  Phone,
  MapPin,
  Save,
  X,
  Settings,
  Upload,
  Edit,
  Shield,
  Crown,
  Briefcase,
  UserCheck,
  Building2,
  Calendar,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'

export default function PerfilPage() {
  const { user, loading, updateUser } = useAuth()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    avatar: user?.avatar || '',
    phone: user?.phone || '',
  })

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        avatar: user.avatar || '',
        phone: user.phone || '',
      })
    }
  }, [user])

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login')
    }
  }, [user, loading, router])

  const handleSaveProfile = async () => {
    setIsLoading(true)
    try {
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const updatedUser = await response.json()
        localStorage.setItem('user_data', JSON.stringify(updatedUser))
        updateUser(updatedUser)
        setIsEditing(false)
      } else {
        const err = await response.json().catch(() => ({}))
        alert(err.error || 'Erro ao atualizar perfil')
      }
    } catch (error) {
      console.error('Erro ao salvar perfil:', error)
      alert('Erro de conexão ao salvar perfil')
    } finally {
      setIsLoading(false)
    }
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('A foto deve ter no máximo 5MB.')
        return
      }
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result
        if (typeof result === 'string') {
          setFormData((prev) => ({ ...prev, avatar: result }))
        }
      }
      reader.readAsDataURL(file)
    }
  }

  if (loading || !user) {
    return null
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'DEVELOPER':
        return (
          <Badge variant="outline" className="gap-1 border-amber-500/30 text-amber-500 dark:text-amber-400 bg-amber-500/10">
            <Crown className="w-3.5 h-3.5" />
            Desenvolvedor Global
          </Badge>
        )
      case 'ADMIN':
        return (
          <Badge variant="outline" className="gap-1 border-primary/30 text-primary bg-primary/10">
            <Shield className="w-3.5 h-3.5" />
            Administrador da Unidade
          </Badge>
        )
      case 'BARBER':
        return (
          <Badge variant="secondary" className="gap-1 font-semibold">
            <Briefcase className="w-3.5 h-3.5 text-primary" />
            Barbeiro / Profissional
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="gap-1 text-muted-foreground">
            <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
            Cliente
          </Badge>
        )
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 pt-20">
      {/* Header Fixo no Topo */}
      <DropdownHeader />

      {/* Conteúdo principal */}
      <main className="w-full px-4 md:px-8 max-w-5xl mx-auto space-y-6">
        <Card className="border-border shadow-sm">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/80 pb-6">
            <div>
              <div className="flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-wider mb-1">
                <UserIcon className="w-4 h-4" />
                <span>Identidade & Conta</span>
              </div>
              <CardTitle className="text-2xl sm:text-3xl font-bold text-foreground">
                Meu Perfil
              </CardTitle>
              <CardDescription className="mt-1">
                Gerencie seus dados pessoais, informações de contato e vínculo com o estabelecimento.
              </CardDescription>
            </div>

            {!isEditing && (
              <Button
                type="button"
                onClick={() => setIsEditing(true)}
                className="gap-2 self-start sm:self-auto shrink-0"
              >
                <Edit className="w-4 h-4" />
                <span>Editar Perfil</span>
              </Button>
            )}
          </CardHeader>

          <CardContent className="space-y-8 pt-6">
            {/* Foto e Visão Geral */}
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 pb-6 border-b border-border">
              <div className="relative group">
                <Avatar className="w-24 h-24 sm:w-28 sm:h-28 border-2 border-border shadow-sm">
                  {formData.avatar ? (
                    <AvatarImage src={formData.avatar} alt={formData.name || 'Avatar'} className="object-cover" />
                  ) : null}
                  <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                    {(formData.name || user.name || 'U').charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                {isEditing && (
                  <label
                    htmlFor="avatar-file-input"
                    className="absolute bottom-0 right-0 p-2 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-md cursor-pointer transition-transform hover:scale-105"
                    title="Alterar foto"
                  >
                    <Camera className="w-4 h-4" />
                    <input
                      id="avatar-file-input"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              <div className="flex-1 text-center sm:text-left space-y-2">
                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                  <h3 className="text-xl sm:text-2xl font-bold text-foreground">
                    {formData.name || 'Nome do Usuário'}
                  </h3>
                  {getRoleBadge(user.role)}
                </div>

                <p className="text-sm text-muted-foreground flex items-center justify-center sm:justify-start gap-1.5">
                  <Mail className="w-3.5 h-3.5" />
                  <span>{user.email}</span>
                </p>

                {user.barbershop && (
                  <p className="text-xs text-muted-foreground flex items-center justify-center sm:justify-start gap-1.5 pt-1">
                    <Building2 className="w-3.5 h-3.5 text-primary" />
                    <span>Unidade vinculada: <strong className="text-foreground">{user.barbershop.name}</strong></span>
                  </p>
                )}
              </div>
            </div>

            {/* Informações Pessoais */}
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-foreground uppercase tracking-wider">
                Dados Pessoais & Contato
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-foreground mb-1.5">
                    Nome Completo
                  </label>
                  {isEditing ? (
                    <Input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Seu nome completo"
                      required
                      className="h-10"
                    />
                  ) : (
                    <div className="h-10 px-3 rounded-md bg-muted/30 border border-border flex items-center text-sm text-foreground">
                      {formData.name || '-'}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-foreground mb-1.5">
                    Email de Acesso
                  </label>
                  <Input
                    type="email"
                    value={formData.email}
                    disabled
                    className="h-10 opacity-70 cursor-not-allowed bg-muted/40"
                    title="O email não pode ser alterado diretamente"
                  />
                  <p className="text-[11px] text-muted-foreground mt-1">
                    O email é utilizado para autenticação no sistema.
                  </p>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-foreground mb-1.5">
                    Telefone / WhatsApp
                  </label>
                  {isEditing ? (
                    <Input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="(00) 00000-0000"
                      className="h-10"
                    />
                  ) : (
                    <div className="h-10 px-3 rounded-md bg-muted/30 border border-border flex items-center text-sm text-foreground">
                      {formData.phone || 'Não informado'}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-medium text-foreground mb-1.5">
                    Permissões da Conta
                  </label>
                  <div className="h-10 px-3 rounded-md bg-muted/30 border border-border flex items-center justify-between text-xs sm:text-sm text-muted-foreground">
                    <span>
                      {user.role === 'DEVELOPER' && 'Acesso irrestrito a todas as barbearias'}
                      {user.role === 'ADMIN' && 'Administração completa da barbearia'}
                      {user.role === 'BARBER' && 'Gestão de agenda e atendimentos'}
                      {user.role === 'CLIENT' && 'Histórico e novos agendamentos'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>

          {isEditing && (
            <CardFooter className="flex justify-end gap-3 pt-6 border-t border-border">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setFormData({
                    name: user?.name || '',
                    email: user?.email || '',
                    avatar: user?.avatar || '',
                    phone: user?.phone || '',
                  })
                  setIsEditing(false)
                }}
                disabled={isLoading}
              >
                <X className="w-4 h-4 mr-1.5" />
                Cancelar
              </Button>

              <Button
                type="button"
                onClick={handleSaveProfile}
                disabled={isLoading}
                className="gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-r-transparent" />
                    <span>Salvando...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Salvar Alterações</span>
                  </>
                )}
              </Button>
            </CardFooter>
          )}
        </Card>
      </main>
    </div>
  )
}
