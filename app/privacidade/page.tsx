import Link from 'next/link'
import { Shield, Lock, FileText, UserCheck, ArrowLeft, Mail, AlertCircle, Eye, Download, Trash2, CheckCircle2 } from 'lucide-react'

export const metadata = {
  title: 'Política de Privacidade e Proteção de Dados | BarberShop',
  description: 'Transparência sobre a coleta, finalidades, bases legais e direitos do titular de dados na plataforma BarberShop, em conformidade com a LGPD.',
}

export default function PrivacyPolicyPage() {
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
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider text-amber-400 font-semibold">
                Transparência e Conformidade LGPD (Lei nº 13.709/2018)
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                Política de Privacidade da Plataforma
              </h1>
            </div>
          </div>
          <p className="mt-4 text-xs text-gray-400">
            Última atualização técnica: Setembro de 2026 • Versão 1.2
          </p>
        </div>

        {/* Disclaimer Operacional / Jurídico */}
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
          <p>
            <strong>Aviso de Transparência Operacional:</strong> Este documento descreve as práticas técnicas e operacionais de tratamento de dados pessoais da plataforma BarberShop. Os termos foram redigidos em linguagem acessível e estão sujeitos a revisão e chancela jurídica final antes do lançamento comercial em larga escala.
          </p>
        </div>

        {/* Seção 1: Papéis no Tratamento */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-amber-400" />
            1. Papéis no Tratamento de Dados (Controlador e Operador)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
            <div className="p-5 rounded-2xl bg-gray-900/70 border border-gray-800">
              <h3 className="font-bold text-white mb-2 text-base">A Barbearia Contratante (Controlador)</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                O estabelecimento comercial cadastrado na plataforma é o <strong>Controlador</strong> dos dados de seus clientes finais e equipe. Ele define os serviços, horários e finalidades comerciais do agendamento.
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-gray-900/70 border border-gray-800">
              <h3 className="font-bold text-white mb-2 text-base">A Plataforma BarberShop (Operador / SaaS)</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                A BarberShop atua como <strong>Operadora</strong> da infraestrutura SaaS tecnológica para os agendamentos e como <strong>Controladora</strong> exclusivamente dos dados cadastrais dos administradores e desenvolvedores da conta contratante.
              </p>
            </div>
          </div>
        </section>

        {/* Seção 2: Dados Coletados e Finalidades */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-400" />
            2. Quais Dados Coletamos e Para Qual Finalidade
          </h2>
          <div className="space-y-3 text-sm text-gray-300">
            <div className="p-4 rounded-xl bg-gray-900/50 border border-gray-800">
              <span className="font-semibold text-white">Dados de Clientes e Agendamento:</span>
              <p className="text-xs text-gray-400 mt-1">
                Nome completo, telefone celular (WhatsApp) e e-mail. <em>Finalidade:</em> Confirmação de horário, envio de lembretes e prevenção de faltas via <strong>Execução de Contrato (Art. 7º, V)</strong>.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-gray-900/50 border border-gray-800">
              <span className="font-semibold text-white">Dados de Barbeiros e Administradores:</span>
              <p className="text-xs text-gray-400 mt-1">
                Nome, e-mail comercial, telefone, senha criptografada (hash bcrypt), foto de perfil e especialidades. <em>Finalidade:</em> Autenticação segura, controle de permissões (RBAC) e exibição da equipe no catálogo público.
              </p>
            </div>
            <div className="p-4 rounded-xl bg-gray-900/50 border border-gray-800">
              <span className="font-semibold text-white">Dados de Cobrança e Faturamento SaaS:</span>
              <p className="text-xs text-gray-400 mt-1">
                Histórico de faturas, identificadores de transação de gateway e planos. <em>Finalidade:</em> Emissão de faturas, cobrança recorrente e cumprimento de <strong>Obrigação Legal Fiscal (Art. 7º, II)</strong>.
              </p>
            </div>
          </div>
        </section>

        {/* Seção 3: Bases Legais */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Lock className="w-5 h-5 text-amber-400" />
            3. Bases Legais Utilizadas
          </h2>
          <p className="text-xs text-gray-300 leading-relaxed">
            Não tratamos dados sem uma hipótese legal prevista na LGPD. Nossas operações fundamentam-se principalmente em:
          </p>
          <ul className="list-disc list-inside text-xs text-gray-400 space-y-2">
            <li><strong>Execução de Contrato (Art. 7º, V):</strong> Para viabilizar a reserva de horários e a prestação do serviço da barbearia.</li>
            <li><strong>Cumprimento de Obrigação Legal ou Regulatória (Art. 7º, II):</strong> Para manutenção de registros fiscais e tributários por 5 anos (Código Tributário Nacional).</li>
            <li><strong>Legítimo Interesse (Art. 7º, IX):</strong> Para métricas operacionais agregadas e prevenção de fraudes, sempre balanceando os direitos fundamentais do titular.</li>
            <li><strong>Consentimento (Art. 7º, I):</strong> Quando aplicável para comunicações promocionais e newsletters de marketing opcionais.</li>
          </ul>
        </section>

        {/* Seção 4: Direitos do Titular */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Eye className="w-5 h-5 text-amber-400" />
            4. Seus Direitos como Titular (Art. 18 da LGPD)
          </h2>
          <p className="text-xs text-gray-300">
            Você possui direitos garantidos por lei, incluindo:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800">
              <Download className="w-4 h-4 text-amber-400 mb-2" />
              <strong className="text-white block mb-1">Acesso e Portabilidade</strong>
              <span className="text-gray-400">Baixe uma cópia estruturada em JSON de todos os seus dados através de nosso endpoint de exportação.</span>
            </div>
            <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 mb-2" />
              <strong className="text-white block mb-1">Correção e Atualização</strong>
              <span className="text-gray-400">Altere seus dados em tempo real no painel de perfil da sua conta.</span>
            </div>
            <div className="p-4 rounded-xl bg-gray-900/60 border border-gray-800">
              <Trash2 className="w-4 h-4 text-red-400 mb-2" />
              <strong className="text-white block mb-1">Anonimização / Exclusão</strong>
              <span className="text-gray-400">Solicite o encerramento e anonimização de seus dados pessoais quando não houver obrigação legal de retenção.</span>
            </div>
          </div>
        </section>

        {/* Seção 5: Segurança da Informação */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Lock className="w-5 h-5 text-amber-400" />
            5. Segurança e Armazenamento
          </h2>
          <p className="text-xs text-gray-300 leading-relaxed">
            Adotamos medidas técnicas de segurança da informação alinhadas ao estado da arte:
          </p>
          <ul className="list-disc list-inside text-xs text-gray-400 space-y-1">
            <li>Criptografia de senhas com salting e algoritmo <strong>bcrypt (12 rounds)</strong>.</li>
            <li>Comunicação segura via <strong>HTTPS / TLS 1.3</strong> em trânsito.</li>
            <li>Sessões autenticadas via cookies HTTPOnly, SameSite Lax e Secure.</li>
            <li>Backups criptografados com <strong>AES-256-GCM</strong> e armazenados offsite.</li>
            <li>Isolamento estrito multi-tenant em nível de banco de dados via chaves relacionais indexadas.</li>
          </ul>
        </section>

        {/* Seção 6: Canal de Contato com Encarregado (DPO) */}
        <section className="p-6 rounded-2xl bg-gradient-to-r from-amber-500/10 via-yellow-500/5 to-transparent border border-amber-500/20 space-y-3">
          <h3 className="font-bold text-white text-base flex items-center gap-2">
            <Mail className="w-5 h-5 text-amber-400" />
            Canal de Atendimento ao Titular e Encarregado (DPO)
          </h3>
          <p className="text-xs text-gray-300 leading-relaxed">
            Para exercer qualquer direito previsto na LGPD ou esclarecer dúvidas sobre o tratamento de seus dados, envie um e-mail para nosso canal exclusivo de privacidade:
          </p>
          <div className="font-mono text-sm text-amber-400 bg-black/40 px-3 py-2 rounded-lg border border-amber-500/30 inline-block">
            privacidade@barbershop.com.br
          </div>
          <p className="text-[11px] text-gray-400">
            Prazo legal de resposta inicial: até 15 (quinze) dias a contar da data do requerimento (Art. 19, II da LGPD).
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
