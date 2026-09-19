'use client'

import { useEffect } from 'react'
import Header from '@/components/landing/Header'
import Hero from '@/components/landing/Hero'
import Benefits from '@/components/landing/Benefits'
import Features from '@/components/landing/Features'
import CTA from '@/components/landing/CTA'
import Footer from '@/components/landing/Footer'

export default function HomePage() {
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'AgendaSaaS | Plataforma de Agendamento de Serviços Online'
    }
  }, [])

  return (
    <div className="min-h-screen bg-[#090D16] text-white selection:bg-blue-500 selection:text-white">
      <Header />
      <Hero />
      <Benefits />
      <Features />
      <CTA />
      <Footer />
    </div>
  )
}
