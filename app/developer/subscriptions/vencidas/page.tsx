import DeveloperSubscriptionsView from '@/components/developer/DeveloperSubscriptionsView'

export const metadata = {
  title: 'Assinaturas Vencidas & Inadimplentes | Painel Developer SaaS',
  description: 'Controle de barbearias com assinaturas vencidas, past due ou expiradas.',
}

export default function SubscriptionsVencidasPage() {
  return (
    <DeveloperSubscriptionsView
      presetStatus="PAST_DUE"
      pageTitle="Assinaturas Vencidas & Inadimplentes"
      pageSubtitle="Barbearias com faturas pendentes, período de tolerância ultrapassado ou assinaturas expiradas."
    />
  )
}
