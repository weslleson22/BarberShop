import NotificationsSettingsView from '@/components/developer/NotificationsSettingsView'

export const metadata = {
  title: 'Notificações & Alertas | Painel Developer',
  description: 'Configuração de canais Telegram e E-mail para novos cadastros, falhas de senha e status',
}

export default function NotificationsSettingsPage() {
  return <NotificationsSettingsView initialTab="all" />
}
