import './globals.css'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/lib/auth-context'
import { DatabaseProvider } from '@/components/database-validation/DatabaseValidator'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  metadataBase: new URL('http://localhost:3000'),
  title: 'BarberShop - Sistema Completo para Barbearias',
  description: 'Sistema de agendamento online, gestão de clientes, controle financeiro e muito mais',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'BarberShop',
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: 'website',
    siteName: 'BarberShop',
    title: 'BarberShop - Sistema Completo para Barbearias',
    description: 'Sistema de agendamento online, gestão de clientes, controle financeiro e muito mais',
  },
  twitter: {
    card: 'summary',
    title: 'BarberShop - Sistema Completo para Barbearias',
    description: 'Sistema de agendamento online, gestão de clientes, controle financeiro e muito mais',
  },
}

export const viewport = {
  themeColor: '#0ea5e9',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
        <meta name="theme-color" content="#0ea5e9" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="BarberShop" />
        <link rel="apple-touch-startup-image" href="/icons/icon-512x512.png" />
      </head>
      <body className={inter.className}>
        <DatabaseProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </DatabaseProvider>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('SW registered: ', registration);
                    })
                    .catch(function(registrationError) {
                      console.log('SW registration failed: ', registrationError);
                    });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  )
}
