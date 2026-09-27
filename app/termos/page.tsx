import Link from 'next/link'
import { FileText, ArrowLeft, CheckCircle2, ShieldAlert, Scale, HelpCircle } from 'lucide-react'

export const metadata = {
  title: 'Termos de Uso e Condições de Serviço | BarberShop',
  description: 'Condições gerais de contratação, licença de software e responsabilidades na utilização da plataforma BarberShop SaaS.',
}

export default function TermsOfUsePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-900 to-black text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-10">
        {/* Navigation & Header */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-amber-400 transition mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Início
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-xl">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider text-amber-400 font-semibold">
                Contrato de Licenciamento SaaS
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                Termos de Uso da Plataforma
              </h1>
            </div>
          </div>
          <p className="mt-4 text-xs text-gray-400">
            Versão 1.2 • Vigente a partir de Setembro de 2026
          </p>
        </div>

        {/* Seção 1: Objeto do Serviço */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Scale className="w-5 h-5 text-amber-400" />
            1. Objeto e Licença de Uso
          </h2>
          <p className="text-xs text-gray-300 leading-relaxed">
            A BarberShop disponibiliza sob o modelo de Software como Serviço (SaaS) uma plataforma em nuvem para gestão de barbearias, controle de agenda operacional, catálogo de serviços, gestão de equipe e agendamento online para clientes finais. A contratação concede ao estabelecimento uma licença de uso temporária, revogável, não exclusiva e intransferível.
          </p>
        </section>

        {/* Seção 2: Responsabilidades do Estabelecimento */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-amber-400" />
            2. Responsabilidades do Estabelecimento (Lojista)
          </h2>
          <ul className="list-disc list-inside text-xs text-gray-400 space-y-2">
            <li>Garantir a veracidade e atualização de todos os dados cadastrais comerciais e fiscais informados.</li>
            <li>Manter sob sigilo absoluto as credenciais de acesso de administradores e barbeiros.</li>
            <li>Atuar como <strong>Controlador</strong> dos dados pessoais de seus clientes, respondendo perante os titulares e autoridades pela legitimidade da base legal de tratamento.</li>
            <li>Cumprir com os atendimentos e horários agendados pelos clientes através da plataforma.</li>
          </ul>
        </section>

        {/* Seção 3: Assinatura, Cobrança e Cancelamento */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            3. Planos, Recorrência e Cancelamento
          </h2>
          <p className="text-xs text-gray-300 leading-relaxed">
            Novas contas iniciam com um <strong>Período de Testes Gratuitos (Trial de 30 dias)</strong>. Após o término do trial:
          </p>
          <ul className="list-disc list-inside text-xs text-gray-400 space-y-1">
            <li>O acesso pleno às funções operacionais dependerá da ativação de uma assinatura paga recorrente.</li>
            <li>A cobrança é processada de forma automatizada por gateway de pagamento homologado.</li>
            <li>O cancelamento pode ser solicitado a qualquer momento pelo painel, com vigência até o final do período mensal já faturado.</li>
          </ul>
        </section>

        {/* Seção 4: Disponibilidade e Nível de Serviço (SLA) */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-amber-400" />
            4. Disponibilidade do Serviço e Suporte
          </h2>
          <p className="text-xs text-gray-300 leading-relaxed">
            A plataforma empenha seus melhores esforços técnicos para manter a disponibilidade mensal de 99,5%. Janelas de manutenção programada serão comunicadas previamente aos administradores através de notificações no sistema.
          </p>
        </section>

        {/* Footer */}
        <footer className="pt-8 border-t border-gray-900 text-center text-xs text-gray-500 space-y-2">
          <div className="flex justify-center gap-4 text-gray-400">
            <Link href="/termos" className="hover:text-amber-400">Termos de Uso</Link>
            <span>•</span>
            <Link href="/privacidade" className="hover:text-amber-400">Política de Privacidade</Link>
            <span>•</span>
            <Link href="/login" className="hover:text-amber-400">Acessar Conta</Link>
          </div>
          <p>© {new Date().getFullYear()} BarberShop SaaS. Todos os direitos reservados.</p>
        </footer>
      </div>
    </div>
  )
}
