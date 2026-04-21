'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Eye, EyeOff, Lock, Mail, Building, Phone, User } from 'lucide-react'

const registerSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres'),
  phone: z.string().min(10, 'Telefone inválido').optional(),
  barbershopName: z.string().min(2, 'Nome da barbearia é obrigatório'),
  barbershopEmail: z.string().email('Email da barbearia inválido'),
  barbershopPhone: z.string().min(10, 'Telefone da barbearia inválido'),
  barbershopAddress: z.string().min(5, 'Endereço da barbearia é obrigatório'),
})

type RegisterForm = z.infer<typeof registerSchema>

export default function NewRegisterPage() {
  const router = useRouter()
  const { register: registerUser } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      phone: '',
      barbershopName: '',
      barbershopEmail: '',
      barbershopPhone: '',
      barbershopAddress: '',
    },
  })

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true)
    try {
      const success = await registerUser({
        name: data.name,
        email: data.email,
        password: data.password,
        role: 'ADMIN',
        phone: data.phone,
        barbershopName: data.barbershopName,
        barbershopEmail: data.barbershopEmail,
        barbershopPhone: data.barbershopPhone,
        barbershopAddress: data.barbershopAddress,
      })

      if (success) {
        router.push('/dashboard')
      } else {
        setError('root', {
          message: 'Erro ao criar conta. Tente novamente.',
        })
      }
    } catch (error) {
      setError('root', {
        message: 'Erro ao criar conta. Verifique os dados.',
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Card className="w-full">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Cadastrar Barbearia</CardTitle>
            <p className="text-gray-600">
              Crie sua barbearia e comece a gerenciar seus agendamentos
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* User Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Informações do Administrador</h3>
                
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-medium">
                    Nome Completo
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="name"
                      placeholder="Seu nome completo"
                      className="pl-10"
                      {...register('name')}
                      disabled={isLoading}
                    />
                  </div>
                  {errors.name && (
                    <p className="text-sm text-red-600">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      className="pl-10"
                      {...register('email')}
                      disabled={isLoading}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-sm text-red-600">{errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium">
                    Senha
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="•••••••"
                      className="pl-10 pr-10"
                      {...register('password')}
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                      disabled={isLoading}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-red-600">{errors.password.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="phone" className="text-sm font-medium">
                    Telefone (Opcional)
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="(11) 99999-9999"
                      className="pl-10"
                      {...register('phone')}
                      disabled={isLoading}
                    />
                  </div>
                  {errors.phone && (
                    <p className="text-sm text-red-600">{errors.phone.message}</p>
                  )}
                </div>
              </div>

              {/* Barbershop Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold border-b pb-2">Informações da Barbearia</h3>
                
                <div className="space-y-2">
                  <label htmlFor="barbershopName" className="text-sm font-medium">
                    Nome da Barbearia
                  </label>
                  <div className="relative">
                    <Building className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="barbershopName"
                      placeholder="Nome da sua barbearia"
                      className="pl-10"
                      {...register('barbershopName')}
                      disabled={isLoading}
                    />
                  </div>
                  {errors.barbershopName && (
                    <p className="text-sm text-red-600">{errors.barbershopName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="barbershopEmail" className="text-sm font-medium">
                    Email da Barbearia
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="barbershopEmail"
                      type="email"
                      placeholder="contato@barbearia.com"
                      className="pl-10"
                      {...register('barbershopEmail')}
                      disabled={isLoading}
                    />
                  </div>
                  {errors.barbershopEmail && (
                    <p className="text-sm text-red-600">{errors.barbershopEmail.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="barbershopPhone" className="text-sm font-medium">
                    Telefone da Barbearia
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="barbershopPhone"
                      type="tel"
                      placeholder="(11) 99999-9999"
                      className="pl-10"
                      {...register('barbershopPhone')}
                      disabled={isLoading}
                    />
                  </div>
                  {errors.barbershopPhone && (
                    <p className="text-sm text-red-600">{errors.barbershopPhone.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label htmlFor="barbershopAddress" className="text-sm font-medium">
                    Endereço da Barbearia
                  </label>
                  <Input
                    id="barbershopAddress"
                    placeholder="Rua, número, bairro, cidade - UF"
                    {...register('barbershopAddress')}
                    disabled={isLoading}
                  />
                  {errors.barbershopAddress && (
                    <p className="text-sm text-red-600">{errors.barbershopAddress.message}</p>
                  )}
                </div>
              </div>

              {/* Root Error */}
              {errors.root && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3">
                  <p className="text-sm text-red-600">{errors.root.message}</p>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white border-r-transparent border-t-transparent mr-2"></div>
                    Criando conta...
                  </>
                ) : (
                  <>
                    <Building className="mr-2 h-4 w-4" />
                    Criar Barbearia
                  </>
                )}
              </Button>
            </form>

            {/* Links */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Já tem uma conta?{' '}
                <button
                  onClick={() => router.push('/login')}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Faça login
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
