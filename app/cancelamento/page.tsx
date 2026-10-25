import Link from 'next/link'
import {
  RotateCcw,
  ArrowLeft,
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  Mail,
  MessageCircle,
  HelpCircle,
  Scissors,
  CreditCard,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'

export const metadata = {
  title: 'Política de Cancelamento e Reembolso | BarberShop Cloud',
  description:
    'Diretrizes de cancelamento de planos SaaS, desistência em até 7 dias (CDC), regras de reagendamento e estorno de valores processados via AbacatePay.',
}

export default function CancellationPolicyPage() {
  return (
    <div className="min-h-svh bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
      {/* Top Header unificado com padrão shadcn */}
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
            <span className="text-base font-bold">
              BarberShop<span className="text-primary">.</span>
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm" className="gap-1.5 text-xs text-muted-foreground hover:text-foreground">
              <Link href="/">
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Voltar ao Início</span>
              </Link>
            </Button>
            <ThemeToggle variant="ghost" size="sm" />
          </div>
        </div>
      </header>

      {/* Conteúdo Principal em Cards shadcn com tokens responsivos */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        
        {/* Banner do Título */}
        <div className="space-y-3">
          <Badge variant="outline" className="px-3 py-1 text-xs font-semibold bg-primary/10 text-primary border-primary/20 gap-2">
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Transparência e Defesa do Consumidor</span>
          </Badge>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Política de Cancelamento e Reembolso
          </h1>
          <p className="text-sm text-muted-foreground">
            S W Systems LTDA (S W Development) • CNPJ: 39.825.909/0001-14 • São Luís - MA
          </p>
          <p className="text-xs text-muted-foreground">
            Última atualização: Outubro de 2026 • Versão 2.0 (Conformidade com o CDC e Gateway AbacatePay)
          </p>
        </div>

        {/* Resumo de Compromisso */}
        <Card className="border-border bg-primary/5 shadow-xs">
          <CardContent className="p-5 flex items-start gap-3.5 text-sm text-muted-foreground leading-relaxed">
            <ShieldCheck className="w-5 h-5 shrink-0 text-primary mt-0.5" />
            <div>
              <strong className="text-foreground">Compromisso de Transparência Financeira:</strong> Prezamos pelo respeito irrestrito aos direitos do consumidor (Lei Federal nº 8.078/1990 - CDC) e pela clareza em todas as transações financeiras. Todos os pagamentos e estornos da nossa plataforma são processados de forma segura e auditada através do gateway <strong>AbacatePay</strong>.
            </div>
          </CardContent>
        </Card>

        {/* Seção 1: Direito de Arrependimento (CDC) */}
        <Card className="border-border bg-card text-card-foreground shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              1. Direito de Arrependimento em até 7 Dias (Art. 49 do CDC)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              Ao contratar qualquer plano pago de assinatura da nossa plataforma de software (SaaS), o cliente tem o direito de desistir da contratação no prazo de até <strong className="text-foreground">7 (sete) dias corridos</strong> a contar da data de confirmação do pagamento, conforme assegura o Artigo 49 do Código de Defesa do Consumidor.
            </p>
            <ul className="list-disc list-inside space-y-1.5 pl-1">
              <li>
                <strong className="text-foreground">Reembolso integral (100%):</strong> O valor pago será restituído integralmente, sem incidência de multas, taxas de cancelamento ou ônus administrativo.
              </li>
              <li>
                <strong className="text-foreground">Solicitação simplificada:</strong> A solicitação pode ser feita diretamente pelos nossos canais de suporte (WhatsApp ou e-mail institucional) informando o e-mail cadastrado ou comprovante da transação.
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Seção 2: Cancelamento de Assinaturas SaaS (Barbearias e Lojistas) */}
        <Card className="border-border bg-card text-card-foreground shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              2. Cancelamento de Planos e Assinaturas Recorrentes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              Nosso modelo de assinatura opera sem fidelidade obrigatória nos planos mensais:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              <div className="p-4 rounded-xl bg-muted/40 border border-border">
                <span className="font-semibold text-foreground block mb-1">Como solicitar o cancelamento:</span>
                <span className="text-xs text-muted-foreground">
                  O cancelamento pode ser efetuado a qualquer momento diretamente no painel do administrador em <em>/dashboard/assinatura</em> ou mediante contato com o suporte.
                </span>
              </div>
              <div className="p-4 rounded-xl bg-muted/40 border border-border">
                <span className="font-semibold text-foreground block mb-1">Vigência até o fim do ciclo:</span>
                <span className="text-xs text-muted-foreground">
                  Ao solicitar o cancelamento, você continua com acesso total às ferramentas até o último dia do período mensal/anual já pago. Nenhuma cobrança futura será realizada.
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground pt-1">
              * Para planos com ciclo anual, eventuais solicitações de encerramento antecipado após os 7 dias serão analisadas proporcionalmente pelo time de suporte.
            </p>
          </CardContent>
        </Card>

        {/* Seção 3: Cancelamento e Reagendamento de Serviços (Clientes Finais) */}
        <Card className="border-border bg-card text-card-foreground shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-amber-500" />
              3. Regras para Cancelamento de Agendamentos de Serviços
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              Para agendamentos presenciais realizados por clientes finais através da página pública do estabelecimento:
            </p>
            <ul className="list-disc list-inside space-y-2 pl-1">
              <li>
                <strong className="text-foreground">Aviso prévio:</strong> O cliente pode cancelar ou remarcar o horário gratuitamente com antecedência mínima de <strong className="text-foreground">2 (duas) horas</strong> do horário marcado, liberando a vaga para outros clientes.
              </li>
              <li>
                <strong className="text-foreground">Serviços com pré-pagamento (sinal ou valor total):</strong> Em casos onde o estabelecimento habilitou pagamento antecipado via PIX/Cartão na plataforma, o cancelamento com aviso prévio garante o reembolso ou crédito para novo agendamento.
              </li>
              <li>
                <strong className="text-foreground">Não comparecimento (No-show):</strong> O não comparecimento sem aviso prévio enseja a perda de eventual sinal pago, visando cobrir o tempo reservado do profissional.
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Seção 4: Prazos e Meios de Processamento de Estorno via AbacatePay */}
        <Card className="border-border bg-card text-card-foreground shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              4. Prazos e Meios de Reembolso (Via Gateway AbacatePay)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              Todos os estornos são acionados diretamente na infraestrutura do gateway financeiro <strong>AbacatePay</strong>:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm block mb-1">Pagamentos via PIX</span>
                <p className="text-xs text-muted-foreground">
                  O estorno é processado de forma <strong className="text-foreground">instantânea</strong> (ou em até 2 horas úteis) diretamente na mesma conta bancária e chave PIX utilizada na compra.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-primary/10 border border-primary/20">
                <span className="font-bold text-primary text-sm block mb-1">Cartão de Crédito</span>
                <p className="text-xs text-muted-foreground">
                  A solicitação de estorno é comunicada à adquirente em até <strong className="text-foreground">1 dia útil</strong>. O crédito na fatura é efetivado pela emissora do cartão em 1 a 2 faturas subsequentes.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Seção 5: Prevenção de Fraudes e Chargeback */}
        <Card className="border-border bg-card text-card-foreground shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-primary" />
              5. Resolução Amigável e Prevenção de Chargebacks
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              Solicitamos que, antes de abrir qualquer contestação ou disputa junto à sua operadora de cartão de crédito (chargeback), você entre em contato diretamente com o nosso time de suporte. Estamos disponíveis para resolver qualquer divergência de cobrança de forma rápida, amigável e desburocratizada.
            </p>
          </CardContent>
        </Card>

        {/* Seção 6: Canais de Atendimento para Reembolso */}
        <Card className="border-border bg-card text-card-foreground shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary" />
              Canais Oficiais de Suporte e Solicitação de Reembolso
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Para solicitar cancelamento, estorno ou tirar dúvidas, acione nosso time pelos canais abaixo:
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <a
                href="https://wa.me/5598984971547"
                target="_blank"
                rel="noopener noreferrer"
                className="p-3.5 rounded-xl bg-muted/40 border border-border hover:border-emerald-500/40 flex items-center gap-3 transition group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground block">WhatsApp Suporte</span>
                  <strong className="text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition font-semibold">
                    (98) 98497-1547
                  </strong>
                </div>
              </a>

              <a
                href="mailto:swdevelopmentsuporte@gmail.com"
                className="p-3.5 rounded-xl bg-muted/40 border border-border hover:border-primary/40 flex items-center gap-3 transition group cursor-pointer"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="overflow-hidden">
                  <span className="text-[11px] text-muted-foreground block">E-mail de Atendimento</span>
                  <strong className="text-foreground group-hover:text-primary transition font-semibold text-[11px] truncate block">
                    swdevelopmentsuporte@gmail.com
                  </strong>
                </div>
              </a>
            </div>

            <div className="text-[11px] text-muted-foreground border-t border-border pt-3">
              <strong>Razão Social:</strong> S W Systems LTDA &bull; <strong>Nome Fantasia:</strong> S W Development &bull; <strong>CNPJ:</strong> 39.825.909/0001-14 &bull; <strong>Endereço:</strong> São Luís - MA
            </div>
          </CardContent>
        </Card>

        {/* Footer Links */}
        <footer className="pt-8 border-t border-border text-center text-xs text-muted-foreground space-y-2">
          <div className="flex flex-wrap justify-center gap-4 text-muted-foreground">
            <Link href="/termos" className="hover:text-primary transition">Termos de Uso</Link>
            <span>•</span>
            <Link href="/privacidade" className="hover:text-primary transition">Política de Privacidade</Link>
            <span>•</span>
            <Link href="/cancelamento" className="text-primary font-semibold hover:underline">Política de Cancelamento</Link>
            <span>•</span>
            <Link href="/login" className="hover:text-primary transition">Acessar Conta</Link>
          </div>
          <p>© {new Date().getFullYear()} S W Systems LTDA. Todos os direitos reservados.</p>
        </footer>

      </main>
    </div>
  )
}
