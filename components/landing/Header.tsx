'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Menu, X, Scissors, ArrowRight, User, Building2, LogIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { user } = useAuth()
  const router = useRouter()

  const getUserDestination = () => {
    if (!user) return '/login'
    if (user.role === 'DEVELOPER') return '/developer'
    if (user.role === 'CLIENT') return '/meus-agendamentos'
    return '/dashboard'
  }

  const getUserLabel = () => {
    if (!user) return 'Minha Conta'
    if (user.role === 'CLIENT') return 'Meus Agendamentos'
    if (user.role === 'DEVELOPER') return 'Painel Developer'
    return 'Painel de Gestão'
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Logo da Plataforma shadcn/ui */}
          <Link href="/" className="flex items-center gap-2.5 font-bold tracking-tight text-foreground hover:opacity-90 transition-opacity">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <Scissors className="h-5 w-5" />
            </div>
            <div>
              <span className="text-lg font-extrabold tracking-tight">BarberShop<span className="text-primary">.</span></span>
            </div>
          </Link>

          {/* Menu Desktop */}
          <nav className="hidden md:flex items-center space-x-8 text-sm font-medium text-muted-foreground">
            <a href="#home" className="hover:text-foreground transition-colors">Início</a>
            <a href="#recursos" className="hover:text-foreground transition-colors">Recursos</a>
            <a href="#como-funciona" className="hover:text-foreground transition-colors">Como Funciona</a>
            <a href="#planos" className="hover:text-foreground transition-colors">Planos & Preços</a>
          </nav>

          {/* Ações Desktop */}
          <div className="hidden md:flex items-center space-x-3">
            <ThemeToggle 
              variant="outline" 
              className="h-9 w-9 rounded-xl border border-border bg-card/80 text-foreground hover:bg-accent shadow-xs flex items-center justify-center cursor-pointer"
            />

            {user ? (
              <Button asChild size="sm" className="gap-2 font-semibold shadow-sm">
                <Link href={getUserDestination()}>
                  <User className="w-4 h-4" />
                  <span>{getUserLabel()}</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="outline" size="sm" className="gap-1.5 font-medium">
                  <Link href="/register">
                    <Building2 className="w-4 h-4" />
                    <span>Cadastrar Barbearia</span>
                  </Link>
                </Button>

                <Button asChild size="sm" className="gap-2 font-semibold shadow-sm">
                  <Link href="/login">
                    <LogIn className="w-4 h-4" />
                    <span>Entrar na Conta</span>
                  </Link>
                </Button>
              </>
            )}
          </div>

          {/* Botão Menu Mobile & ThemeToggle */}
          <div className="md:hidden flex items-center gap-2">
            <ThemeToggle 
              variant="outline" 
              className="h-9 w-9 rounded-xl border border-border bg-card/80 text-foreground hover:bg-accent shadow-xs flex items-center justify-center cursor-pointer"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="h-9 w-9 text-muted-foreground hover:text-foreground"
              aria-label="Abrir menu"
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Menu Mobile */}
        {isMenuOpen && (
          <div className="md:hidden bg-card border-b border-border py-6 px-4 space-y-4 rounded-b-2xl shadow-xl animate-in slide-in-from-top-2 duration-200">
            <nav className="flex flex-col space-y-3 text-base font-medium text-muted-foreground">
              <a
                href="#home"
                onClick={() => setIsMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-muted hover:text-foreground transition-colors"
              >
                Início
              </a>
              <a
                href="#recursos"
                onClick={() => setIsMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-muted hover:text-foreground transition-colors"
              >
                Recursos
              </a>
              <a
                href="#como-funciona"
                onClick={() => setIsMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-muted hover:text-foreground transition-colors"
              >
                Como Funciona
              </a>
              <a
                href="#planos"
                onClick={() => setIsMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-muted hover:text-foreground transition-colors"
              >
                Planos & Preços
              </a>
            </nav>

            <div className="pt-4 border-t border-border space-y-2.5">
              {user ? (
                <Button asChild className="w-full gap-2 font-semibold">
                  <Link href={getUserDestination()} onClick={() => setIsMenuOpen(false)}>
                    <User className="w-4 h-4" />
                    <span>{getUserLabel()}</span>
                  </Link>
                </Button>
              ) : (
                <>
                  <Button asChild className="w-full gap-2 font-semibold">
                    <Link href="/login" onClick={() => setIsMenuOpen(false)}>
                      <LogIn className="w-4 h-4" />
                      <span>Entrar na Conta</span>
                    </Link>
                  </Button>

                  <Button asChild variant="outline" className="w-full gap-2 font-medium">
                    <Link href="/register" onClick={() => setIsMenuOpen(false)}>
                      <Building2 className="w-4 h-4" />
                      <span>Cadastrar Barbearia</span>
                    </Link>
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
