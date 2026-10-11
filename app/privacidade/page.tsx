import Link from 'next/link'
import { Shield, Lock, FileText, UserCheck, ArrowLeft, Mail, AlertCircle, Eye, Download, Trash2, CheckCircle2, CreditCard, MessageCircle, HelpCircle } from 'lucide-react'

export const metadata = {
  title: 'Política de Privacidade e Proteção de Dados (LGPD) | S W Development',
  description: 'Transparência sobre a coleta, finalidades, bases legais e direitos do titular de dados na plataforma BarberShop / AgendaSaaS, com pagamentos processados via AbacatePay.',
}

export default function PrivacyPolicyPage() {
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
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider text-blue-400 font-semibold">
                Transparência e Conformidade LGPD (Lei Federal nº 13.709/2018)
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                Política de Privacidade da Plataforma
              </h1>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            S W Systems LTDA (S W Development) • CNPJ: 39.825.909/0001-14 • São Luís - MA
          </p>
          <p className="mt-1 text-[11px] text-slate-500">
            Última atualização: Outubro de 2026 • Versão 2.0 (Conformidade com Processamento Financeiro e LGPD)
          </p>
        </div>

        {/* Declaração Institucional */}
        <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 text-xs text-slate-300 space-y-2 leading-relaxed">
          <p>
            A <strong>S W SYSTEMS LTDA</strong>, operando sob o nome fantasia <strong>S W DEVELOPMENT</strong>, pessoa jurídica de direito privado inscrita no CNPJ sob o nº <strong>39.825.909/0001-14</strong>, com sede em <strong>São Luís - MA</strong>, está comprometida com a preservação da privacidade, intimidade e segurança dos dados pessoais de todos os usuários da sua plataforma de agendamento e gestão SaaS.
          </p>
          <p>
            Esta Política de Privacidade descreve com absoluta transparência como coletamos, tratamos, protegemos e compartilhamos dados pessoais, bem como a forma como você pode exercer os direitos previstos na Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).
          </p>
        </div>

        {/* DESTAQUE OBRIGATÓRIO: PROCESSAMENTO DE PAGAMENTOS VIA ABACATEPAY */}
        <section className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-200 space-y-2.5 leading-relaxed">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <CreditCard className="w-5 h-5 shrink-0" />
            <span>Processamento Seguro de Pagamentos via AbacatePay (Sem Retenção de Dados Sensíveis)</span>
          </div>
          <p>
            Todas as transações de pagamento realizadas na plataforma — incluindo contratações de assinaturas SaaS e agendamentos com pagamento prévio — são intermediadas de forma 100% segura pelo gateway homologado <strong>AbacatePay</strong> (<a href="https://abacatepay.com" target="_blank" rel="noopener noreferrer" className="underline font-semibold hover:text-white">abacatepay.com</a>).
          </p>
          <ul className="list-disc list-inside space-y-1 text-slate-300 pl-1">
            <li>
              <strong>Não retenção de dados sensíveis de pagamento:</strong> A S W Systems <strong>NÃO</strong> armazena em seus servidores o número completo do cartão de crédito, código de segurança (CVV) ou senhas bancárias.
            </li>
            <li>
              <strong>Criptografia e Tokenização:</strong> Os dados de cartão e chaves PIX são trafegados via criptografia ponta a ponta (TLS 1.3 / SSL) diretamente para a infraestrutura da <strong>AbacatePay</strong>, em conformidade com as normas do Banco Central do Brasil e padrões internacionais de segurança.
            </li>
            <li>
              <strong>Registros fiscais e contábeis:</strong> Apenas os metadados da transação (identificador da fatura, status de pagamento, data, valor e últimos 4 dígitos do cartão para conferência do titular) são mantidos para cumprimento de obrigações fiscais e emissão de recibos.
            </li>
          </ul>
        </section>

        {/* Seção 1: Papéis no Tratamento (Controlador e Operador) */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-blue-400" />
            1. Papéis no Tratamento de Dados (Controlador e Operador)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2">
              <h3 className="font-bold text-white text-sm">O Estabelecimento Comercial (Controlador)</h3>
              <p className="text-slate-400 leading-relaxed">
                A barbearia ou salão assinante atua como <strong>Controlador</strong> dos dados de seus próprios clientes finais e colaboradores, sendo responsável por definir a base legal de contato e o agendamento presencial.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2">
              <h3 className="font-bold text-white text-sm">A S W Development (Operadora / Provedora SaaS)</h3>
              <p className="text-slate-400 leading-relaxed">
                A <strong>S W Systems LTDA</strong> atua como <strong>Operadora</strong> da infraestrutura tecnológica em nuvem onde os dados são processados, e como <strong>Controladora</strong> exclusivamente dos dados cadastrais dos administradores contratantes da plataforma.
              </p>
            </div>
          </div>
        </section>

        {/* Seção 2: Dados Coletados e Finalidades */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            2. Quais Dados Pessoais Coletamos e Para Qual Finalidade
          </h2>
          <div className="space-y-3 text-xs text-slate-300">
            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
              <strong className="text-white block mb-1">Dados de Clientes Finais (Agendamentos):</strong>
              <p className="text-slate-400">
                Nome completo, telefone celular com WhatsApp e e-mail. <em>Finalidade:</em> Confirmação do horário agendado, envio de avisos de pontualidade e histórico de atendimento no estabelecimento contratado. Base Legal: <strong>Execução de Contrato (Art. 7º, V da LGPD)</strong>.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
              <strong className="text-white block mb-1">Dados de Administradores e Barbeiros (Lojistas):</strong>
              <p className="text-slate-400">
                Nome, razão social/nome fantasia, CNPJ/CPF, e-mail comercial, telefone, senha com hash criptográfico irreversível (bcrypt) e foto de perfil opcional. <em>Finalidade:</em> Autenticação segura na plataforma, gestão de permissões e exibição no catálogo público.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
              <strong className="text-white block mb-1">Dados de Faturamento e Cobrança da Assinatura:</strong>
              <p className="text-slate-400">
                Razão social, CNPJ, endereço de faturamento, histórico de faturas e comprovantes emitidos pelo gateway AbacatePay. <em>Finalidade:</em> Emissão de notas fiscais, cobrança do serviço e cumprimento de <strong>Obrigação Legal Tributária (Art. 7º, II da LGPD)</strong>.
              </p>
            </div>
          </div>
        </section>

        {/* Seção 3: Direitos do Titular (Art. 18 LGPD) */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Eye className="w-5 h-5 text-amber-400" />
            3. Seus Direitos como Titular de Dados
          </h2>
          <p className="text-xs text-slate-300">
            Você pode exercer a qualquer momento os direitos previstos no Artigo 18 da LGPD:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <Download className="w-4 h-4 text-blue-400 mb-2" />
              <strong className="text-white block mb-1">Confirmação e Acesso</strong>
              <span className="text-slate-400">Saber se realizamos tratamento de seus dados e obter cópia das suas informações.</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mb-2" />
              <strong className="text-white block mb-1">Correção de Dados</strong>
              <span className="text-slate-400">Solicitar a retificação de dados incorretos, inexatos ou desatualizados.</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
              <Trash2 className="w-4 h-4 text-rose-400 mb-2" />
              <strong className="text-white block mb-1">Eliminação e Anonimização</strong>
              <span className="text-slate-400">Requerer a exclusão dos dados pessoais desnecessários ou tratados com consentimento.</span>
            </div>
          </div>
        </section>

        {/* Seção 4: Segurança da Informação */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Lock className="w-5 h-5 text-indigo-400" />
            4. Padrões de Segurança da Informação
          </h2>
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 space-y-2 text-xs text-slate-300 leading-relaxed">
            <p>Implementamos rigorosas medidas técnicas para mitigar riscos de incidentes:</p>
            <ul className="list-disc list-inside text-slate-400 space-y-1 pl-1">
              <li>Criptografia ponta a ponta via <strong>HTTPS / TLS 1.3</strong> em todas as comunicações.</li>
              <li>Hashes irreversíveis de credenciais com <strong>bcrypt (12 rounds)</strong> e salting individual.</li>
              <li>Sessões blindadas com cookies <strong>HTTPOnly, Secure e SameSite</strong>.</li>
              <li>Backups periódicos criptografados e armazenados em infraestrutura de nuvem segura.</li>
              <li>Isolamento rigoroso multi-tenant por ID de estabelecimento (Tenant Scoped Isolation).</li>
            </ul>
          </div>
        </section>

        {/* Seção 5: Canal do Encarregado (DPO) e Contato */}
        <section className="p-6 rounded-2xl bg-gray-900 border border-gray-800 space-y-4">
          <div>
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-blue-400" />
              5. Canal de Atendimento ao Titular e Encarregado de Dados (DPO)
            </h3>
            <p className="text-xs text-slate-300 mt-1">
              Para requisições relativas à LGPD, dúvidas sobre esta política ou solicitação de exclusão cadastral:
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <a
              href="mailto:swdevelopmentsuporte@gmail.com"
              className="p-3.5 rounded-xl bg-slate-950/80 border border-blue-500/30 hover:border-blue-500 flex items-center gap-3 transition group cursor-pointer"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                <Mail className="w-4 h-4" />
              </div>
              <div className="overflow-hidden">
                <span className="text-[11px] text-slate-400 block">E-mail do Encarregado (DPO)</span>
                <strong className="text-white group-hover:text-blue-400 transition truncate block">swdevelopmentsuporte@gmail.com</strong>
              </div>
            </a>

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
                <span className="text-[11px] text-slate-400 block">WhatsApp de Privacidade & Suporte</span>
                <strong className="text-white group-hover:text-emerald-400 transition">(98) 98497-1547</strong>
              </div>
            </a>
          </div>

          <div className="text-[11px] text-slate-400 border-t border-white/5 pt-3 leading-relaxed">
            <strong>Controladora:</strong> S W Systems LTDA (S W Development) &bull; <strong>CNPJ:</strong> 39.825.909/0001-14 &bull; <strong>Endereço:</strong> São Luís - MA
          </div>
        </section>

        {/* Footer Links */}
        <footer className="pt-8 border-t border-slate-900 text-center text-xs text-slate-500 space-y-2">
          <div className="flex flex-wrap justify-center gap-4 text-slate-400">
            <Link href="/termos" className="hover:text-blue-400 transition">Termos de Uso</Link>
            <span>•</span>
            <Link href="/privacidade" className="text-blue-400 font-semibold hover:underline">Política de Privacidade</Link>
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
