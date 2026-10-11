import Link from 'next/link'
import { FileText, ArrowLeft, CheckCircle2, ShieldAlert, Scale, HelpCircle, Mail, MessageCircle, CreditCard, RotateCcw } from 'lucide-react'

export const metadata = {
  title: 'Termos de Uso e Condições de Serviço | S W Development',
  description: 'Condições gerais de contratação, licença de software SaaS, pagamentos e responsabilidades na utilização da plataforma BarberShop / AgendaSaaS.',
}

export default function TermsOfUsePage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-10">
        
        {/* Navigation & Header */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-blue-400 transition mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Início
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center text-white">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider text-blue-400 font-semibold">
                Contrato de Licenciamento de Software (SaaS)
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                Termos de Uso da Plataforma
              </h1>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            S W Systems LTDA (S W Development) • CNPJ: 39.825.909/0001-14 • São Luís - MA
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Última atualização: Outubro de 2026 • Versão 2.0 (Conformidade com Gateways e LGPD)
          </p>
        </div>

        {/* Identificação das Partes */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 text-xs text-slate-300 space-y-2 leading-relaxed">
          <p>
            Estes Termos de Uso regem a contratação e a utilização dos serviços de software disponibilizados pela <strong>S W SYSTEMS LTDA</strong>, pessoa jurídica de direito privado sob o nome fantasia <strong>S W DEVELOPMENT</strong>, inscrita no CNPJ sob o nº <strong>39.825.909/0001-14</strong>, com sede e foro na cidade de <strong>São Luís - MA</strong>, doravante denominada simplesmente <strong>&quot;LICENCIANTE&quot;</strong> ou <strong>&quot;PLATAFORMA&quot;</strong>.
          </p>
          <p>
            Ao se cadastrar, criar uma conta ou utilizar a plataforma, você (pessoa física ou jurídica, proprietário de barbearia ou cliente final) declara expressamente ter lido, compreendido e aceito integralmente todas as cláusulas deste contrato.
          </p>
        </div>

        {/* Seção 1: Objeto do Serviço */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Scale className="w-5 h-5 text-blue-400" />
            1. Objeto e Licença de Uso do Software
          </h2>
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 text-xs text-slate-300 space-y-2 leading-relaxed">
            <p>
              A <strong>S W Development</strong> disponibiliza, sob o modelo de Software como Serviço (SaaS - Software as a Service), uma solução tecnológica em nuvem voltada para a gestão comercial e agendamento online de barbearias, salões e prestadores de serviços correlatos.
            </p>
            <p>
              O serviço inclui: painel de controle operacional, catálogo de serviços, gestão de agenda em tempo real, cadastro de equipe/profissionais, relatórios gerenciais e disponibilização de página pública exclusiva para que clientes finais realizem agendamentos.
            </p>
            <p className="text-slate-400">
              A presente licença é concedida em caráter temporário, revogável, não exclusivo e intransferível, condicionada à vigência do plano contratado ou período de avaliação gratuita.
            </p>
          </div>
        </section>

        {/* Seção 2: Contratação, Planos e Pagamentos via AbacatePay */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-400" />
            2. Planos Comerciais, Faturamento e Pagamentos
          </h2>
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 text-xs text-slate-300 space-y-3 leading-relaxed">
            <p>
              A contratação de planos pagos permite a continuidade do uso da plataforma após o período de teste:
            </p>
            <ul className="list-disc list-inside text-slate-400 space-y-1.5 pl-1">
              <li>
                <strong>Período Gratuito de Avaliação (Trial):</strong> Novos estabelecimentos têm direito a 30 (trinta) dias de avaliação gratuita sem necessidade de inserção de cartão de crédito.
              </li>
              <li>
                <strong>Planos Recorrentes:</strong> Disponibilizados nas modalidades mensal e anual, com preços descritos claramente no catálogo público e no painel do assinante.
              </li>
              <li>
                <strong>Processamento Seguro via AbacatePay:</strong> Todas as cobranças, liquidações via <strong>PIX instantâneo</strong> e transações de <strong>Cartão de Crédito</strong> são intermediadas e processadas de forma segura e auditada pela instituição de pagamentos homologada <strong>AbacatePay</strong>, com criptografia TLS de ponta a ponta e total conformidade com padrões de segurança bancária.
              </li>
              <li>
                <strong>Não armazenamento de dados sensíveis de pagamento:</strong> Os números e CVV de cartões de crédito não são armazenados nos servidores da S W Systems, sendo tokenizados diretamente pelo gateway de pagamentos.
              </li>
            </ul>
          </div>
        </section>

        {/* Seção 3: Cancelamento e Reembolso */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-amber-400" />
            3. Cancelamento, Renovação e Direito de Arrependimento
          </h2>
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 text-xs text-slate-300 space-y-2 leading-relaxed">
            <p>
              O cliente pode solicitar o cancelamento a qualquer momento através do próprio painel administrativo ou pelo e-mail de suporte.
            </p>
            <p>
              Conforme o <strong>Art. 49 do Código de Defesa do Consumidor</strong>, o contratante tem o prazo de até <strong>7 (sete) dias corridos</strong> após a contratação de qualquer plano pago para solicitar a desistência e obter o reembolso integral (100%) dos valores pagos.
            </p>
            <p>
              Para maiores detalhes sobre prazos de estorno, regras de no-show em agendamentos e cancelamento de serviços, consulte nossa <Link href="/cancelamento" className="text-blue-400 hover:underline font-semibold">Política de Cancelamento e Reembolso</Link>.
            </p>
          </div>
        </section>

        {/* Seção 4: Responsabilidades do Estabelecimento Contratante */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-cyan-400" />
            4. Obrigações e Responsabilidades do Estabelecimento
          </h2>
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 text-xs text-slate-300 space-y-2 leading-relaxed">
            <p>São obrigações do estabelecimento assinante:</p>
            <ul className="list-disc list-inside text-slate-400 space-y-1.5 pl-1">
              <li>Fornecer informações cadastrais fidedignas (razão social/nome, CNPJ/CPF, e-mail e telefone verídicos).</li>
              <li>Manter o sigilo estrito de senhas e acessos de seus colaboradores e barbeiros.</li>
              <li>Honrar os serviços, horários e valores acordados com os clientes finais agendados via plataforma.</li>
              <li>Atuar em conformidade com a LGPD (Lei Geral de Proteção de Dados - Lei 13.709/2018) na qualidade de Controlador dos dados pessoais de seus clientes.</li>
            </ul>
          </div>
        </section>

        {/* Seção 5: Nível de Serviço e Suporte */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-indigo-400" />
            5. Disponibilidade, Manutenção e Limitação de Responsabilidade
          </h2>
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 text-xs text-slate-300 space-y-2 leading-relaxed">
            <p>
              A <strong>S W Systems LTDA</strong> emprega esforços contínuos e infraestrutura moderna para assegurar disponibilidade média mensal de 99,5% (SLA).
            </p>
            <p>
              A plataforma não se responsabiliza por interrupções oriundas de falhas em conexões locais de internet do usuário, indisponibilidades generalizadas de operadoras de telecomunicação ou casos fortuitos e de força maior.
            </p>
          </div>
        </section>

        {/* Seção 6: Canais de Contato e Foro */}
        <section className="p-6 rounded-2xl bg-gray-900 border border-gray-800 space-y-4">
          <div>
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-blue-400" />
              6. Canais de Atendimento e Foro de Eleição
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              Para esclarecer dúvidas referentes a estes Termos, reportar problemas ou solicitar suporte:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <a
              href="https://wa.me/5598984971547"
              target="_blank"
              rel="noopener noreferrer"
              className="p-3.5 rounded-xl bg-slate-950/80 border border-emerald-500/30 hover:border-emerald-500 flex items-center gap-3 transition group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                <MessageCircle className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] text-slate-400 block">WhatsApp Comercial / Suporte</span>
                <strong className="text-white group-hover:text-emerald-400 transition">(98) 98497-1547</strong>
              </div>
            </a>

            <a
              href="mailto:swdevelopmentsuporte@gmail.com"
              className="p-3.5 rounded-xl bg-slate-950/80 border border-blue-500/30 hover:border-blue-500 flex items-center gap-3 transition group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4" />
              </div>
              <div className="overflow-hidden">
                <span className="text-[11px] text-slate-400 block">E-mail de Contato</span>
                <strong className="text-white group-hover:text-blue-400 transition truncate block">swdevelopmentsuporte@gmail.com</strong>
              </div>
            </a>
          </div>

          <div className="text-[11px] text-slate-400 border-t border-white/5 pt-3 leading-relaxed">
            Fica eleito o Foro da Comarca de <strong>São Luís, Estado do Maranhão</strong>, para dirimir quaisquer controvérsias oriundas destes Termos de Uso, com renúncia expressa a qualquer outro, por mais privilegiado que seja.
          </div>
        </section>

        {/* Footer Links */}
        <footer className="pt-8 border-t border-slate-900 text-center text-xs text-slate-500 space-y-2">
          <div className="flex flex-wrap justify-center gap-4 text-slate-400">
            <Link href="/termos" className="text-blue-400 font-semibold hover:underline">Termos de Uso</Link>
            <span>•</span>
            <Link href="/privacidade" className="hover:text-blue-400 transition">Política de Privacidade</Link>
            <span>•</span>
            <Link href="/cancelamento" className="hover:text-blue-400 transition">Política de Cancelamento</Link>
            <span>•</span>
            <Link href="/login" className="hover:text-blue-400 transition">Acessar Conta</Link>
          </div>
          <p>© {new Date().getFullYear()} S W Systems LTDA. Todos os direitos reservados.</p>
        </footer>

      </div>
    </div>
  )
}
