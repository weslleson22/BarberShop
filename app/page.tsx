'use client'

import Header from '@/components/landing/Header'
import Hero from '@/components/landing/Hero'
import Benefits from '@/components/landing/Benefits'
import Features from '@/components/landing/Features'
import CTA from '@/components/landing/CTA'
import Footer from '@/components/landing/Footer'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <Header />
      <Hero />
      <Benefits />
      <Features />
      <CTA />
      <Footer />
    </div>
  )
}
