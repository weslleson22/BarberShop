import { redirect, notFound } from 'next/navigation'
import { resolvePublicTenant } from '@/lib/tenant'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function AgendamentoRedirectPage({ params }: Props) {
  const { slug } = await params

  // Validar se o slug é um tenant real e ativo
  const tenantResult = await resolvePublicTenant(slug)
  if (!tenantResult.success) {
    notFound()
  }

  // Redireciona com o slug explicitamente vinculado
  redirect(`/agendar?slug=${encodeURIComponent(tenantResult.tenant.slug || slug)}`)
}
