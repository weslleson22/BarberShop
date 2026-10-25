import Link from 'next/link'
import {
  FileText,
  ArrowLeft,
  CheckCircle2,
  ShieldAlert,
  Scale,
  HelpCircle,
  Mail,
  MessageCircle,
  CreditCard,
  RotateCcw,
  Scissors
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ThemeToggle } from '@/components/theme-toggle'

export const metadata = {
  title: 'Termos de Uso e Condições de Serviço | BarberShop Cloud',
  description: 'Condições gerais de contratação, licença de software SaaS, pagamentos e responsabilidades na utilização da plataforma BarberShop Cloud.',
}

export default function TermsOfUsePage() {
  return (
    <div className="min-h-svh bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      {/* Top Header unificado com /login e /register */}
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
            <Scale className="h-3.5 w-3.5" />
            <span>Contrato de Licenciamento de Software SaaS</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Termos de Uso da Plataforma
          </h1>
          <p className="text-sm text-muted-foreground">
            S W Systems LTDA (S W Development) • CNPJ: 39.825.909/0001-14 • São Luís - MA
          </p>
          <p className="text-xs text-muted-foreground">
            Última atualização: Outubro de 2026 • Versão 2.0 (Conformidade com Gateways e LGPD)
          </p>
        </div>

        {/* Identificação das Partes */}
        <Card className="border-border bg-card text-card-foreground shadow-sm">
          <CardContent className="p-5 text-sm text-muted-foreground leading-relaxed space-y-2">
            <p>
              Estes Termos de Uso regem a contratação e a utilização dos serviços de software disponibilizados pela <strong className="text-foreground">S W SYSTEMS LTDA</strong>, pessoa jurídica de direito privado sob o nome fantasia <strong className="text-foreground">S W DEVELOPMENT</strong>, inscrita no CNPJ sob o nº <strong className="text-foreground">39.825.909/0001-14</strong>, com sede e foro na cidade de <strong className="text-foreground">São Luís - MA</strong>, doravante denominada simplesmente <strong className="text-foreground">&quot;LICENCIANTE&quot;</strong> ou <strong className="text-foreground">&quot;PLATAFORMA&quot;</strong>.
            </p>
            <p>
              Ao se cadastrar, criar uma conta ou utilizar a plataforma, você (pessoa física ou jurídica, proprietário de barbearia ou cliente final) declara expressamente ter lido, compreendido e aceito integralmente todas as cláusulas deste contrato.
            </p>
          </CardContent>
        </Card>

        {/* Seção 1: Objeto do Serviço */}
        <Card className="border-border bg-card text-card-foreground shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Scale className="h-5 w-5 text-primary" />
              1. Objeto e Licença de Uso do Software
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              A <strong className="text-foreground">S W Development</strong> disponibiliza, sob o modelo de Software como Serviço (SaaS - Software as a Service), uma solução tecnológica em nuvem voltada para a gestão comercial e agendamento online de barbearias, salões e prestadores de serviços correlatos.
            </p>
            <p>
              O serviço inclui: painel de controle operacional, catálogo de serviços, gestão de agenda em tempo real, cadastro de equipe/profissionais, relatórios gerenciais e disponibilização de página pública exclusiva para que clientes finais realizem agendamentos.
            </p>
            <p className="text-xs">
              A presente licença é concedida em caráter temporário, revogável, não exclusivo e intransferível, condicionada à vigência do plano contratado ou período de avaliação gratuita.
            </p>
          </CardContent>
        </Card>

        {/* Seção 2: Contratação e Pagamentos via AbacatePay */}
        <Card className="border-border bg-card text-card-foreground shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-emerald-500" />
              2. Planos Comerciais, Faturamento e Pagamentos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              A contratação de planos pagos permite a continuidade do uso da plataforma após o período de teste:
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-1">
              <li>
                <strong className="text-foreground">Período Gratuito de Avaliação (Trial):</strong> Novos estabelecimentos têm direito a 7 (sete) dias de avaliação gratuita com acesso integral às funcionalidades.
              </li>
              <li>
                <strong className="text-foreground">Planos Recorrentes:</strong> Disponibilizados nas modalidades mensal e anual, com preços descritos claramente no catálogo público e no painel do assinante.
              </li>
              <li>
                <strong className="text-foreground">Processamento Seguro via AbacatePay:</strong> Todas as cobranças, liquidações via PIX instantâneo e transações de Cartão de Crédito são intermediadas de forma segura e auditada pela instituição homologada AbacatePay, com criptografia TLS de ponta a ponta.
              </li>
              <li>
                <strong className="text-foreground">Não armazenamento de dados sensíveis de pagamento:</strong> Os números e CVV de cartões de crédito não são armazenados nos servidores da S W Systems, sendo tokenizados diretamente pelo gateway de pagamentos.
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Seção 3: Cancelamento e Reembolso */}
        <Card className="border-border bg-card text-card-foreground shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-amber-500" />
              3. Cancelamento, Renovação e Direito de Arrependimento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              O cliente pode solicitar o cancelamento a qualquer momento através do próprio painel administrativo ou pelo e-mail de suporte.
            </p>
            <p>
              Conforme o <strong className="text-foreground">Art. 49 do Código de Defesa do Consumidor</strong>, o contratante tem o prazo de até <strong className="text-foreground">7 (sete) dias corridos</strong> após a contratação de qualquer plano pago para solicitar a desistência e obter o reembolso integral (100%) dos valores pagos.
            </p>
            <p>
              Para maiores detalhes sobre prazos de estorno e regras de cancelamento, consulte nossa <Link href="/cancelamento" className="text-primary hover:underline font-semibold">Política de Cancelamento e Reembolso</Link>.
            </p>
          </CardContent>
        </Card>

        {/* Seção 4: Obrigações do Estabelecimento */}
        <Card className="border-border bg-card text-card-foreground shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-cyan-500" />
              4. Obrigações e Responsabilidades do Estabelecimento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground leading-relaxed">
            <p>São obrigações do estabelecimento assinante:</p>
            <ul className="list-disc list-inside space-y-1 pl-1">
              <li>Fornecer informações cadastrais fidedignas (razão social/nome, CNPJ/CPF, e-mail e telefone verídicos).</li>
              <li>Manter o sigilo estrito de senhas e acessos de seus colaboradores e barbeiros.</li>
              <li>Honrar os serviços, horários e valores acordados com os clientes finais agendados via plataforma.</li>
              <li>Atuar em conformidade com a LGPD (Lei 13.709/2018) na qualidade de Controlador dos dados de seus clientes.</li>
            </ul>
          </CardContent>
        </Card>

        {/* Seção 5: SLA e Disponibilidade */}
        <Card className="border-border bg-card text-card-foreground shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-indigo-500" />
              5. Disponibilidade, Manutenção e Limitação de Responsabilidade
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground leading-relaxed">
            <p>
              A <strong className="text-foreground">S W Systems LTDA</strong> emprega esforços contínuos e infraestrutura moderna para assegurar disponibilidade média mensal de 99,5% (SLA).
            </p>
            <p>
              A plataforma não se responsabiliza por interrupções oriundas de falhas em conexões locais de internet do usuário, indisponibilidades generalizadas de operadoras de telecomunicação ou casos de força maior.
            </p>
          </CardContent>
        </Card>

        {/* Seção 6: Canais de Contato e Foro */}
        <Card className="border-border bg-card text-card-foreground shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              6. Canais de Atendimento e Foro de Eleição
            </CardTitle>
            <CardDescription className="text-xs">
              Para esclarecer dúvidas referentes a estes Termos, reportar problemas ou solicitar suporte:
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                  <span className="text-[11px] text-muted-foreground block">WhatsApp Comercial / Suporte</span>
                  <strong className="text-xs text-foreground group-hover:text-primary transition">(98) 98497-1547</strong>
                </div>
              </a>

              <a
                href="mailto:swdevelopmentsuporte@gmail.com"
                className="p-3.5 rounded-lg border border-border bg-muted/40 hover:bg-muted hover:border-primary/50 flex items-center gap-3 transition group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="overflow-hidden">
                  <span className="text-[11px] text-muted-foreground block">E-mail de Contato</span>
                  <strong className="text-xs text-foreground group-hover:text-primary transition truncate block">swdevelopmentsuporte@gmail.com</strong>
                </div>
              </a>
            </div>

            <p className="text-xs text-muted-foreground border-t border-border pt-3 leading-relaxed">
              Fica eleito o Foro da Comarca de <strong className="text-foreground">São Luís, Estado do Maranhão</strong>, para dirimir quaisquer controvérsias oriundas destes Termos de Uso, com renúncia expressa a qualquer outro.
            </p>
          </CardContent>
        </Card>

        {/* Rodapé */}
        <footer className="pt-8 border-t border-border text-center text-xs text-muted-foreground space-y-3">
          <div className="flex flex-wrap justify-center gap-4 text-xs">
            <Link href="/termos" className="text-primary font-semibold hover:underline">Termos de Serviço</Link>
            <span>•</span>
            <Link href="/privacidade" className="hover:text-foreground transition">Política de Privacidade</Link>
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
