import './globals.css'
import { Suspense } from 'react'
import { Roboto, Roboto_Mono } from 'next/font/google'
import { AuthProvider } from '@/lib/auth-context'
import { DatabaseProvider } from '@/components/database-validation/DatabaseValidator'
import { ServiceWorkerUpdater } from '@/components/ServiceWorkerUpdater'
import { NavigationTracker } from '@/components/shared/NavigationTracker'

const roboto = Roboto({
  weight: ['300', '400', '500', '700', '900'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-roboto',
})

const robotoMono = Roboto_Mono({
  weight: ['400', '500', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-roboto-mono',
})

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

import { ThemeProvider } from '@/components/theme-provider'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning className={`${roboto.variable} ${robotoMono.variable}`}>
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="theme-color" content="#0ea5e9" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="AgendaSaaS" />
        <link rel="apple-touch-startup-image" href="/icons/icon-512x512.png" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');var d=window.matchMedia('(prefers-color-scheme: dark)').matches;var dark=t==='dark'||(!t&&d)||(t==='system'&&d);var r=document.documentElement;if(dark){r.classList.add('dark');r.classList.remove('light');}else{r.classList.remove('dark');r.classList.add('light');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className={`${roboto.className} font-sans`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          <DatabaseProvider>
            <AuthProvider>
              <Suspense fallback={null}>
                <NavigationTracker />
              </Suspense>
              {children}
            </AuthProvider>
          </DatabaseProvider>
          <ServiceWorkerUpdater />
        </ThemeProvider>
      </body>
    </html>
  )
}
