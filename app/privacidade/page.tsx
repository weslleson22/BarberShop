import Link from 'next/link'
import {
  Shield,
  Lock,
  FileText,
  UserCheck,
  ArrowLeft,
  Mail,
  Eye,
  Download,
  Trash2,
  CheckCircle2,
  CreditCard,
  MessageCircle,
  HelpCircle,
  Scissors
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ThemeToggle } from '@/components/theme-toggle'

export const metadata = {
  title: 'Política de Privacidade e Proteção de Dados (LGPD) | BarberShop Cloud',
  description: 'Transparência sobre a coleta, finalidades, bases legais e direitos do titular de dados na plataforma BarberShop Cloud, com pagamentos processados via AbacatePay.',
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-svh bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      {/* Top Header unificado com /login, /register e /termos */}
      <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 font-semibold text-foreground tracking-tight hover:opacity-90 transition-opacity"
            title="BarberShop Cloud - Página Inicial"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <Scissors className="h-4 w-4" />
            </div>
            <span className="text-base font-bold">BarberShop<span className="text-primary">.</span></span>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2.5 py-1.5 rounded-md hover:bg-muted"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Voltar ao Início</span>
            </Link>
            <ThemeToggle variant="ghost" size="sm" />
          </div>
        </div>
      </header>

      {/* Conteúdo Principal em Card shadcn com tokens e design responsivo */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        
        {/* Banner do Título */}
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
            <Shield className="h-3.5 w-3.5" />
            <span>Transparência e Conformidade LGPD (Lei Federal nº 13.709/2018)</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Política de Privacidade da Plataforma
          </h1>
          <p className="text-sm text-muted-foreground">
            S W Systems LTDA (S W Development) • CNPJ: 39.825.909/0001-14 • São Luís - MA
          </p>
          <p className="text-xs text-muted-foreground">
            Última atualização: Outubro de 2026 • Versão 2.0 (Conformidade com Processamento Financeiro e LGPD)
          </p>
        </div>

        {/* Declaração Institucional */}
        <Card className="border-border bg-card text-card-foreground shadow-sm">
          <CardContent className="p-5 text-sm text-muted-foreground leading-relaxed space-y-2">
            <p>
              A <strong className="text-foreground">S W SYSTEMS LTDA</strong>, operando sob o nome fantasia <strong className="text-foreground">S W DEVELOPMENT</strong>, inscrita no CNPJ sob o nº <strong className="text-foreground">39.825.909/0001-14</strong>, com sede em <strong className="text-foreground">São Luís - MA</strong>, está comprometida com a preservação da privacidade, intimidade e segurança dos dados pessoais de todos os usuários da sua plataforma de agendamento e gestão SaaS.
            </p>
            <p>
              Esta Política de Privacidade descreve com transparência como tratamos, protegemos e compartilhamos dados pessoais, bem como a forma como você pode exercer os direitos previstos na Lei Geral de Proteção de Dados (LGPD).
            </p>
          </CardContent>
        </Card>

        {/* Destaque Obrigatório: Processamento de Pagamentos via AbacatePay */}
        <Card className="border-emerald-500/30 bg-emerald-500/10 text-card-foreground shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <CreditCard className="h-5 w-5 shrink-0" />
              Processamento Seguro de Pagamentos via AbacatePay (Sem Retenção de Dados Sensíveis)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              Todas as transações de pagamento realizadas na plataforma — incluindo contratações de assinaturas SaaS e agendamentos com pagamento prévio — são intermediadas de forma 100% segura pelo gateway homologado <strong className="text-foreground">AbacatePay</strong>.
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-1">
              <li>
                <strong className="text-foreground">Não retenção de dados sensíveis de pagamento:</strong> A S W Systems <strong className="text-foreground">NÃO</strong> armazena em seus servidores o número completo do cartão de crédito, código de segurança (CVV) ou senhas bancárias.
              </li>
              <li>
                <strong className="text-foreground">Criptografia e Tokenização:</strong> Os dados de cartão e chaves PIX são trafegados via criptografia ponta a ponta (TLS 1.3 / SSL) diretamente para a infraestrutura da AbacatePay, em conformidade com as normas do Banco Central do Brasil.
              </li>
              <li>
                <strong className="text-foreground">Registros fiscais e contábeis:</strong> Apenas os metadados da transação (identificador da fatura, status de pagamento, data, valor e últimos 4 dígitos do cartão para conferência do titular) são mantidos para cumprimento de obrigações fiscais.
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Seção 1: Papéis no Tratamento */}
        <Card className="border-border bg-card text-card-foreground shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" />
              1. Papéis no Tratamento de Dados (Controlador e Operador)
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-muted-foreground leading-relaxed">
            <div className="p-4 rounded-lg bg-muted/40 border border-border space-y-2">
              <h3 className="font-semibold text-foreground text-sm">O Estabelecimento Comercial (Controlador)</h3>
              <p className="text-xs">
                A barbearia assinante atua como <strong className="text-foreground">Controladora</strong> dos dados de seus próprios clientes finais e colaboradores, sendo responsável por definir a base legal de contato e o agendamento.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-muted/40 border border-border space-y-2">
              <h3 className="font-semibold text-foreground text-sm">A S W Development (Operadora SaaS)</h3>
              <p className="text-xs">
                A <strong className="text-foreground">S W Systems LTDA</strong> atua como <strong className="text-foreground">Operadora</strong> da infraestrutura tecnológica em nuvem onde os dados são processados, e como Controladora exclusivamente dos dados cadastrais dos administradores contratantes.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Seção 2: Dados Coletados */}
        <Card className="border-border bg-card text-card-foreground shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <FileText className="h-5 w-5 text-cyan-500" />
              2. Quais Dados Pessoais Coletamos e Para Qual Finalidade
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <div className="p-3.5 rounded-lg bg-muted/30 border border-border">
              <strong className="text-foreground block mb-1">Dados de Clientes Finais (Agendamentos):</strong>
              <p className="text-xs">
                Nome completo, telefone celular e e-mail. Finalidade: Confirmação do horário agendado, lembretes de atendimento e histórico no estabelecimento contratado. Base Legal: <strong className="text-foreground">Execução de Contrato (Art. 7º, V da LGPD)</strong>.
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-muted/30 border border-border">
              <strong className="text-foreground block mb-1">Dados de Administradores e Barbeiros:</strong>
              <p className="text-xs">
                Nome, razão social/nome fantasia, CNPJ/CPF, e-mail comercial, telefone, senha com hash criptográfico irreversível (bcrypt) e foto de perfil opcional. Finalidade: Autenticação segura na plataforma e gestão operacional.
              </p>
            </div>

            <div className="p-3.5 rounded-lg bg-muted/30 border border-border">
              <strong className="text-foreground block mb-1">Dados de Faturamento da Assinatura:</strong>
              <p className="text-xs">
                Razão social, CNPJ, endereço de faturamento e comprovantes emitidos pelo gateway AbacatePay para cumprimento de <strong className="text-foreground">Obrigação Legal Tributária (Art. 7º, II da LGPD)</strong>.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Seção 3: Direitos do Titular */}
        <Card className="border-border bg-card text-card-foreground shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Eye className="h-5 w-5 text-amber-500" />
              3. Seus Direitos como Titular de Dados
            </CardTitle>
            <CardDescription className="text-xs">
              Você pode exercer a qualquer momento os direitos previstos no Artigo 18 da LGPD:
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-lg bg-muted/40 border border-border space-y-1">
              <Download className="h-4 w-4 text-primary mb-1.5" />
              <strong className="text-foreground text-xs block">Confirmação e Acesso</strong>
              <span className="text-[11px] text-muted-foreground block">Saber se realizamos tratamento e obter cópia das suas informações.</span>
            </div>
            <div className="p-3.5 rounded-lg bg-muted/40 border border-border space-y-1">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 mb-1.5" />
              <strong className="text-foreground text-xs block">Correção de Dados</strong>
              <span className="text-[11px] text-muted-foreground block">Solicitar a retificação de dados incorretos, inexatos ou desatualizados.</span>
            </div>
            <div className="p-3.5 rounded-lg bg-muted/40 border border-border space-y-1">
              <Trash2 className="h-4 w-4 text-rose-500 mb-1.5" />
              <strong className="text-foreground text-xs block">Eliminação e Anonimização</strong>
              <span className="text-[11px] text-muted-foreground block">Requerer a exclusão dos dados tratados com consentimento.</span>
            </div>
          </CardContent>
        </Card>

        {/* Seção 4: Segurança da Informação */}
        <Card className="border-border bg-card text-card-foreground shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Lock className="h-5 w-5 text-indigo-500" />
              4. Padrões de Segurança da Informação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground leading-relaxed">
            <p>Implementamos rigorosas medidas técnicas para mitigar riscos de incidentes:</p>
            <ul className="list-disc list-inside space-y-1 pl-1 text-xs">
              <li>Criptografia ponta a ponta via <strong className="text-foreground">HTTPS / TLS 1.3</strong> em todas as comunicações.</li>
              <li>Hashes irreversíveis de senhas com <strong className="text-foreground">bcrypt (12 rounds)</strong>.</li>
              <li>Sessões blindadas com cookies <strong className="text-foreground">HTTPOnly, Secure e SameSite</strong>.</li>
              <li>Backups periódicos criptografados e armazenados em infraestrutura de nuvem segura.</li>
              <li>Isolamento rigoroso multi-tenant por ID de estabelecimento.</li>
            </ul>
          </CardContent>
        </Card>

        {/* Seção 5: Canal do DPO */}
        <Card className="border-border bg-card text-card-foreground shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              5. Canal de Atendimento ao Titular e Encarregado de Dados (DPO)
            </CardTitle>
            <CardDescription className="text-xs">
              Para requisições relativas à LGPD, dúvidas sobre esta política ou solicitação de exclusão cadastral:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <a
                href="mailto:swdevelopmentsuporte@gmail.com"
                className="p-3.5 rounded-lg border border-border bg-muted/40 hover:bg-muted hover:border-primary/50 flex items-center gap-3 transition group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="overflow-hidden">
                  <span className="text-[11px] text-muted-foreground block">E-mail do Encarregado (DPO)</span>
                  <strong className="text-xs text-foreground group-hover:text-primary transition truncate block">swdevelopmentsuporte@gmail.com</strong>
                </div>
              </a>

              <a
                href="https://wa.me/5598984971547"
                target="_blank"
                rel="noopener noreferrer"
                className="p-3.5 rounded-lg border border-border bg-muted/40 hover:bg-muted hover:border-primary/50 flex items-center gap-3 transition group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block">WhatsApp de Privacidade & Suporte</span>
                  <strong className="text-xs text-foreground group-hover:text-primary transition">(98) 98497-1547</strong>
                </div>
              </a>
            </div>

            <p className="text-xs text-muted-foreground border-t border-border pt-3 leading-relaxed">
              <strong className="text-foreground">Controladora:</strong> S W Systems LTDA (S W Development) &bull; <strong className="text-foreground">CNPJ:</strong> 39.825.909/0001-14 &bull; <strong className="text-foreground">Endereço:</strong> São Luís - MA
            </p>
          </CardContent>
        </Card>

        {/* Rodapé */}
        <footer className="pt-8 border-t border-border text-center text-xs text-muted-foreground space-y-3">
          <div className="flex flex-wrap justify-center gap-4 text-xs">
            <Link href="/termos" className="hover:text-foreground transition">Termos de Serviço</Link>
            <span>•</span>
            <Link href="/privacidade" className="text-primary font-semibold hover:underline">Política de Privacidade</Link>
            <span>•</span>
            <Link href="/cancelamento" className="hover:text-foreground transition">Política de Cancelamento</Link>
            <span>•</span>
            <Link href="/login" className="hover:text-foreground transition">Entrar na Conta</Link>
          </div>
          <p>© {new Date().getFullYear()} S W Systems LTDA. Todos os direitos reservados.</p>
        </footer>

      </main>
    </div>
  )
}
