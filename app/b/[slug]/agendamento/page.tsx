import { redirect, notFound } from 'next/navigation'
import { resolvePublicTenant } from '@/lib/tenant'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function AgendamentoRedirectPage({ params }: Props) {
  const { slug } = await params

  // 1. Validar se o slug é um tenant real e ativo
  const tenantResult = await resolvePublicTenant(slug)
  if (!tenantResult.success) {
    notFound()
  }

  // 2. Se o slug mudou, redireciona para a nova URL pública oficial
  if (tenantResult.redirect && tenantResult.targetSlug) {
    redirect(`/b/${encodeURIComponent(tenantResult.targetSlug)}/agendamento`)
  }

  // 3. Redireciona para o fluxo de agendamento com o slug explicitamente vinculado
  const activeSlug = tenantResult.tenant.slug || slug
  redirect(`/agendar?slug=${encodeURIComponent(activeSlug)}`)
}
