'use client'

import { useEffect } from 'react'
import Header from '@/components/landing/Header'
import Hero from '@/components/landing/Hero'
import Benefits from '@/components/landing/Benefits'
import Features from '@/components/landing/Features'
import Pricing from '@/components/landing/Pricing'
import CTA from '@/components/landing/CTA'
import Footer from '@/components/landing/Footer'

export default function HomePage() {
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'BarberShop Cloud | Plataforma de Gestão e Agendamento para Barbearias'
    }
  }, [])

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      <Header />
      <Hero />
      <Benefits />
      <Features />
      <Pricing />
      <CTA />
      <Footer />
    </div>
  )
}
