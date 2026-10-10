import Link from 'next/link'
import { RotateCcw, ArrowLeft, ShieldCheck, Clock, CheckCircle2, AlertCircle, Mail, MessageCircle, HelpCircle } from 'lucide-react'

export const metadata = {
  title: 'Política de Cancelamento e Reembolso | S W Development',
  description: 'Diretrizes de cancelamento de planos SaaS, desistência em até 7 dias (CDC), regras de reagendamento e estorno de valores processados via AbacatePay.',
}

export default function CancellationPolicyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#060911] via-[#090D16] to-[#030509] text-white py-12 px-4 sm:px-6 lg:px-8">
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
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 shadow-xl shadow-blue-500/10">
              <RotateCcw className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider text-blue-400 font-semibold">
                Transparência e Defesa do Consumidor
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                Política de Cancelamento e Reembolso
              </h1>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            S W Systems LTDA (S W Development) • CNPJ: 39.825.909/0001-14 • São Luís - MA
          </p>
        </div>

        {/* Resumo de Compromisso */}
        <div className="p-5 rounded-2xl bg-blue-500/10 border border-blue-500/25 text-xs text-blue-200 flex items-start gap-3.5 leading-relaxed">
          <ShieldCheck className="w-5 h-5 shrink-0 text-blue-400 mt-0.5" />
          <div>
            <strong>Compromisso de Transparência Financeira:</strong> Prezamos pelo respeito irrestrito aos direitos do consumidor (Lei Federal nº 8.078/1990 - CDC) e pela clareza em todas as transações financeiras. Todos os pagamentos e estornos da nossa plataforma são processados de forma segura e auditada através do gateway <strong>AbacatePay</strong>.
          </div>
        </div>

        {/* Seção 1: Direito de Arrependimento (CDC) */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            1. Direito de Arrependimento em até 7 Dias (Art. 49 do CDC)
          </h2>
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3 text-xs text-slate-300 leading-relaxed">
            <p>
              Ao contratar qualquer plano pago de assinatura da nossa plataforma de software (SaaS), o cliente tem o direito de desistir da contratação no prazo de até <strong>7 (sete) dias corridos</strong> a contar da data de confirmação do pagamento, conforme assegura o Artigo 49 do Código de Defesa do Consumidor.
            </p>
            <ul className="list-disc list-inside text-slate-400 space-y-1.5 pl-1">
              <li>
                <strong>Reembolso integral (100%):</strong> O valor pago será restituído integralmente, sem incidência de multas, taxas de cancelamento ou ônus administrativo.
              </li>
              <li>
                <strong>Solicitação simplificada:</strong> A solicitação pode ser feita diretamente pelos nossos canais de suporte (WhatsApp ou e-mail institucional) informando o e-mail cadastrado ou comprovante da transação.
              </li>
            </ul>
          </div>
        </section>

        {/* Seção 2: Cancelamento de Assinaturas SaaS (Barbearias e Lojistas) */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-400" />
            2. Cancelamento de Planos e Assinaturas Recorrentes
          </h2>
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3 text-xs text-slate-300 leading-relaxed">
            <p>
              Nosso modelo de assinatura opera sem fidelidade obrigatória nos planos mensais:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="font-semibold text-white block mb-1">Como solicitar o cancelamento:</span>
                <span className="text-slate-400">
                  O cancelamento pode ser efetuado a qualquer momento diretamente no painel do administrador em <em>/dashboard/assinatura</em> ou mediante contato com o suporte.
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="font-semibold text-white block mb-1">Vigência até o fim do ciclo:</span>
                <span className="text-slate-400">
                  Ao solicitar o cancelamento, você continua com acesso total às ferramentas até o último dia do período mensal/anual já pago. Nenhuma cobrança futura será realizada.
                </span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 pt-1">
              * Para planos com ciclo anual, eventuais solicitações de encerramento antecipado após os 7 dias serão analisadas proporcionalmente pelo time de suporte.
            </p>
          </div>
        </section>

        {/* Seção 3: Cancelamento e Reagendamento de Serviços (Clientes Finais) */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <RotateCcw className="w-5 h-5 text-amber-400" />
            3. Regras para Cancelamento de Agendamentos de Serviços
          </h2>
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3 text-xs text-slate-300 leading-relaxed">
            <p>
              Para agendamentos presenciais realizados por clientes finais através da página pública do estabelecimento:
            </p>
            <ul className="list-disc list-inside text-slate-400 space-y-2 pl-1">
              <li>
                <strong>Aviso prévio:</strong> O cliente pode cancelar ou remarcar o horário gratuitamente com antecedência mínima de <strong>2 (duas) horas</strong> do horário marcado, liberando a vaga para outros clientes.
              </li>
              <li>
                <strong>Serviços com pré-pagamento (sinal ou valor total):</strong> Em casos onde o estabelecimento habilitou pagamento antecipado via PIX/Cartão na plataforma, o cancelamento com aviso prévio garante o reembolso ou crédito para novo agendamento.
              </li>
              <li>
                <strong>Não comparecimento (No-show):</strong> O não comparecimento sem aviso prévio enseja a perda de eventual sinal pago, visando cobrir o tempo reservado do profissional.
              </li>
            </ul>
          </div>
        </section>

        {/* Seção 4: Prazos e Meios de Processamento de Estorno via AbacatePay */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            4. Prazos e Meios de Reembolso (Via Gateway AbacatePay)
          </h2>
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3 text-xs text-slate-300 leading-relaxed">
            <p>
              Todos os estornos são acionados diretamente na infraestrutura do gateway financeiro <strong>AbacatePay</strong>:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="font-bold text-emerald-400 text-sm block mb-1">Pagamentos via PIX</span>
                <p className="text-slate-300 text-xs">
                  O estorno é processado de forma <strong>instantânea</strong> (ou em até 2 horas úteis) diretamente na mesma conta bancária e chave PIX utilizada na compra.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <span className="font-bold text-blue-400 text-sm block mb-1">Cartão de Crédito</span>
                <p className="text-slate-300 text-xs">
                  A solicitação de estorno é comunicada à adquirente em até <strong>1 dia útil</strong>. O crédito na fatura é efetivado pela emissora do cartão em 1 a 2 faturas subsequentes.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Seção 5: Prevenção de Fraudes e Chargeback */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-cyan-400" />
            5. Resolução Amigável e Prevenção de Chargebacks
          </h2>
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-3 text-xs text-slate-300 leading-relaxed">
            <p>
              Solicitamos que, antes de abrir qualquer contestação ou disputa junto à sua operadora de cartão de crédito (chargeback), você entre em contato diretamente com o nosso time de suporte. Estamos disponíveis para resolver qualquer divergência de cobrança de forma rápida, amigável e desburocratizada.
            </p>
          </div>
        </section>

        {/* Seção 6: Canais de Atendimento para Reembolso */}
        <section className="p-6 rounded-2xl bg-gradient-to-r from-blue-600/15 via-cyan-500/10 to-transparent border border-blue-500/30 space-y-4">
          <div>
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-blue-400" />
              Canais Oficiais de Suporte e Solicitação de Reembolso
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              Para solicitar cancelamento, estorno ou tirar dúvidas, acione nosso time pelos canais abaixo:
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
                <span className="text-[11px] text-slate-400 block">WhatsApp Suporte</span>
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
                <span className="text-[11px] text-slate-400 block">E-mail de Atendimento</span>
                <strong className="text-white group-hover:text-blue-400 transition truncate block">swdevelopmentsuporte@gmail.com</strong>
              </div>
            </a>
          </div>

          <div className="text-[11px] text-slate-400 border-t border-white/5 pt-3">
            <strong>Razão Social:</strong> S W Systems LTDA &bull; <strong>Nome Fantasia:</strong> S W Development &bull; <strong>CNPJ:</strong> 39.825.909/0001-14 &bull; <strong>Endereço:</strong> São Luís - MA
          </div>
        </section>

        {/* Footer Links */}
        <footer className="pt-8 border-t border-slate-900 text-center text-xs text-slate-500 space-y-2">
          <div className="flex flex-wrap justify-center gap-4 text-slate-400">
            <Link href="/termos" className="hover:text-blue-400 transition">Termos de Uso</Link>
            <span>•</span>
            <Link href="/privacidade" className="hover:text-blue-400 transition">Política de Privacidade</Link>
            <span>•</span>
            <Link href="/cancelamento" className="hover:text-blue-400 transition text-blue-400 font-semibold">Política de Cancelamento</Link>
            <span>•</span>
            <Link href="/login" className="hover:text-blue-400 transition">Acessar Conta</Link>
          </div>
          <p>© {new Date().getFullYear()} S W Systems LTDA. Todos os direitos reservados.</p>
        </footer>

      </div>
    </div>
  )
}
