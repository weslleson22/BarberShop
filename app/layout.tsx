import './globals.css'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/lib/auth-context'
import { DatabaseProvider } from '@/components/database-validation/DatabaseValidator'
import { ServiceWorkerUpdater } from '@/components/ServiceWorkerUpdater'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  metadataBase: new URL('https://barber-shop-nine-ebon.vercel.app'),
  title: 'AgendaSaaS - Plataforma de Agendamento de Serviços Online',
  description: 'Sistema de agendamento online em tempo real, gestão de horários, confirmações automáticas e controle de disponibilidade',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'AgendaSaaS',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: 'AgendaSaaS',
    title: 'AgendaSaaS - Plataforma de Agendamento de Serviços Online',
    description: 'Sistema de agendamento online em tempo real, gestão de horários, confirmações automáticas e controle de disponibilidade',
  },
  twitter: {
    card: 'summary',
    title: 'AgendaSaaS - Plataforma de Agendamento de Serviços Online',
    description: 'Sistema de agendamento online em tempo real, gestão de horários, confirmações automáticas e controle de disponibilidade',
  },
}

export const viewport = {
  themeColor: '#0ea5e9',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <head>
        <meta httpEquiv="Cache-Control" content="no-cache, no-store, must-revalidate" />
        <meta httpEquiv="Pragma" content="no-cache" />
        <meta httpEquiv="Expires" content="0" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="theme-color" content="#0ea5e9" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="AgendaSaaS" />
        <link rel="apple-touch-startup-image" href="/icons/icon-512x512.png" />
      </head>
      <body className={inter.className}>
        <DatabaseProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </DatabaseProvider>
        <ServiceWorkerUpdater />
      </body>
    </html>
  )
}
