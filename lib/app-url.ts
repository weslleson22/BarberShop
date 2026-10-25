/**
 * Utilitário para resolução segura e confiável da URL pública da aplicação.
 * Essencial para entregabilidade de e-mails transacionais (boas-vindas, redefinição de senha).
 * 
 * Anti-Spam: Provedores como Gmail e Outlook analisam todos os links presentes no corpo
 * do e-mail. Links contendo 'localhost' ou '127.0.0.1' recebem penalidade imediata
 * de Phishing / Spam nos filtros de inteligência artificial.
 */

export function getPublicAppUrl(request?: Request | null): string {
  // 1. Variável de ambiente configurada explicitamente (se não for localhost)
  const envUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || '').trim()
  if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
    return envUrl.replace(/\/$/, '')
  }

  // 2. Vercel deployment URLs automáticas
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`.replace(/\/$/, '')
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`.replace(/\/$/, '')
  }

  // 3. Headers da requisição ativa (se disponível e não for localhost)
  if (request) {
    const origin = request.headers.get('origin')
    if (origin && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
      return origin.replace(/\/$/, '')
    }

    const host = request.headers.get('x-forwarded-host') || request.headers.get('host')
    const proto = request.headers.get('x-forwarded-proto') || 'https'
    if (host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
      return `${proto}://${host}`.replace(/\/$/, '')
    }
  }

  // 4. URL canônica de produção do projeto
  return 'https://barber-shop-dev-self.vercel.app'
}
