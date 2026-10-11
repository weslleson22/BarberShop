import DeveloperSubscriptionsView from '@/components/developer/DeveloperSubscriptionsView'

export const metadata = {
  title: 'Assinaturas Ativas | Painel Developer SaaS',
  description: 'Controle de barbearias e planos com assinaturas ativas na plataforma.',
}

export default function SubscriptionsAtivasPage() {
  return (
    <DeveloperSubscriptionsView
      presetStatus="ACTIVE"
      pageTitle="Assinaturas Ativas"
      pageSubtitle="Barbearias com contratos regulares, pagamentos em dia e faturamento recorrente garantido."
    />
  )
}
