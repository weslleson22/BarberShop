# Relatório de Auditoria Técnica e Conclusão da Integração AbacatePay v2 — BarberShop SaaS

**Engenharia de Software Sênior — Next.js 14 / TypeScript / Prisma / PostgreSQL / Multi-Tenant SaaS**  
**Data da Auditoria:** Outubro de 2026  
**Repositório:** weslleson22/BarberShop  
**Ambiente de Aplicação:** [https://barber-shop-dev-self.vercel.app/](https://barber-shop-dev-self.vercel.app/)  
**Gateway Auditado:** AbacatePay API v2 (`https://api.abacatepay.com/v2`)

---

## 1. Resumo Executivo da Situação Encontrada

A auditoria técnica aprofundada no repositório **BarberShop** revelou uma arquitetura SaaS multi-tenant em Next.js App Router e Prisma ORM, com pagamentos e assinaturas em processo de consolidação:
1. **Estrutura de Domínio de Billing B2B**: O schema Prisma já continha a segregação entre `Payment` (atendimentos operacionais de barbearia: corte, barba) e os modelos B2B `Plan`, `Subscription`, `Invoice`, `SubscriptionEvent` e `ProcessedWebhook`.
2. **Fragilidades e Lacunas Encontradas**:
   - **Autenticação de Webhook Incompleta**: O webhook da AbacatePay suporta tanto parâmetro de consulta (`?webhookSecret=...`) quanto assinatura criptográfica HMAC-SHA256 no cabeçalho `X-Webhook-Signature` com chave pública. Havia ausência de suporte unificado e timing safe comparison.
   - **Falta de Gestão Visual de Cobranças (Billings)**: Não existia tela administrativa no painel do desenvolvedor para listar cobranças avulsas geradas na AbacatePay, consultar faturas unificadas, simular liquidação em sandbox ou solicitar estornos.
   - **Personalização de Checkout Inexistente**: O checkout da AbacatePay requer personalização de marca (modo claro/escuro, cor de destaque, dados coletados e métodos aceitos), que antes não estavam persistidos nem customizáveis.
   - **Controle de Concorrência e Multi-Tenant em Reembolsos**: Endpoints administrativos precisavam de validação estrita para impedir que o administrador de um tenant pudesse acionar reembolso de fatura pertencente a outra barbearia (IDOR).
   - **Máquina de Estados de Assinatura**: O ciclo de vida da assinatura não estava sincronizado de ponta a ponta com a geração de QR Code PIX imediato, permitindo que o usuário ficasse preso sem feedback em tempo real.

Todas as lacunas foram solucionadas através de implementação incremental e testes automatizados, sem realizar migrações destrutivas no banco de dados e preservando 100% dos dados históricos.

---

## 2. Fase A — Inventário Técnico de Arquivos

| Arquivo / Módulo | Camada | Responsabilidade Técnica |
| :--- | :--- | :--- |
| [`lib/billing/abacatepay-provider.ts`](file:///c:/Users/wesll/Documents/Dev/Projeto_app/frontend/lib/billing/abacatepay-provider.ts) | Backend Provider | Cliente HTTP para AbacatePay v2: criação de produtos (`/products/create`), checkout hospedado (`/checkouts/create`), PIX transparente (`/transparents/create`), verificação de status (`/transparents/check`), simulação sandbox (`/transparents/simulate-payment`), listagem de cobranças (`/checkouts/list`, `/transparents/list`), boletos bancários e cálculo HMAC. |
| [`lib/billing/webhook-handler.ts`](file:///c:/Users/wesll/Documents/Dev/Projeto_app/frontend/lib/billing/webhook-handler.ts) | Backend Handler | Processador idempotente de webhooks. Executa transações atômicas (`$transaction`), registra em `ProcessedWebhook`, atualiza `Subscription`, emite `Invoice` paga, reativa `Barbershop` e registra trilha em `SubscriptionEvent`. |
| [`lib/billing/checkout-config.ts`](file:///c:/Users/wesll/Documents/Dev/Projeto_app/frontend/lib/billing/checkout-config.ts) | Backend Lib | Persistência e recuperação de preferências visuais e funcionais do checkout AbacatePay (tema, cor de destaque, campos obrigatórios, meios de pagamento). |
| [`lib/billing/saas-billing.ts`](file:///c:/Users/wesll/Documents/Dev/Projeto_app/frontend/lib/billing/saas-billing.ts) | Backend Core | Máquina de estados finita (`TRIALING`, `ACTIVE`, `PAST_DUE`, `SUSPENDED`, `CANCELED`, `EXPIRED`), cálculo de vigência (`calculatePeriodEnd`), concessão de cortesias e regras de transição. |
| [`app/api/webhooks/billing/route.ts`](file:///c:/Users/wesll/Documents/Dev/Projeto_app/frontend/app/api/webhooks/billing/route.ts) | API Endpoint | Rota HTTP `POST` que recebe webhooks da AbacatePay e Stripe, valida timing-safe secret / HMAC e delega ao processador. |
| [`app/api/billing/charges/route.ts`](file:///c:/Users/wesll/Documents/Dev/Projeto_app/frontend/app/api/billing/charges/route.ts) | API Endpoint | Rota HTTP `GET`/`POST` para listagem unificada de cobranças com filtros, métricas financeiras (KPIs) e emissão direta de novas cobranças (PIX/Boleto/Checkout). |
| [`app/api/billing/charges/refund/route.ts`](file:///c:/Users/wesll/Documents/Dev/Projeto_app/frontend/app/api/billing/charges/refund/route.ts) | API Endpoint | Rota HTTP `POST` para processamento de estornos e reembolsos com proteção contra IDOR multi-tenant. |
| [`app/api/billing/checkout/config/route.ts`](file:///c:/Users/wesll/Documents/Dev/Projeto_app/frontend/app/api/billing/checkout/config/route.ts) | API Endpoint | Rota HTTP `GET`/`POST` para leitura e salvamento das configurações visuais do checkout personalizado. |
| [`app/api/billing/checkout/route.ts`](file:///c:/Users/wesll/Documents/Dev/Projeto_app/frontend/app/api/billing/checkout/route.ts) | API Endpoint | Rota HTTP `POST` para inicialização de sessões de checkout autenticadas por barbearia. |
| [`components/billing/AbacateCheckout.tsx`](file:///c:/Users/wesll/Documents/Dev/Projeto_app/frontend/components/billing/AbacateCheckout.tsx) | Frontend Component | Interface de checkout em 3 etapas (`Dados > Endereço > Pagamento`), com alternância Dark/Light, busca ViaCEP, cartão interativo, PIX com QR Code dinâmico e Boleto. |
| [`components/billing/CheckoutCustomizer.tsx`](file:///c:/Users/wesll/Documents/Dev/Projeto_app/frontend/components/billing/CheckoutCustomizer.tsx) | Frontend Component | Painel administrativo do Desenvolvedor com live preview interativo e controles de personalização visual e de campos. |
| [`components/billing/AbacateBillingsManager.tsx`](file:///c:/Users/wesll/Documents/Dev/Projeto_app/frontend/components/billing/AbacateBillingsManager.tsx) | Frontend Component | Dashboard completo de cobranças AbacatePay com KPIs, filtros por status, cópia de identificadores, modal de nova cobrança e estorno. |
| [`app/developer/billing/page.tsx`](file:///c:/Users/wesll/Documents/Dev/Projeto_app/frontend/app/developer/billing/page.tsx) | Page Route | Painel do Desenvolvedor (`/developer/billing`) consolidando 4 abas: Cobranças AbacatePay, Personalizar Checkout, Assinaturas SaaS e Faturas. |
| [`app/checkout/page.tsx`](file:///c:/Users/wesll/Documents/Dev/Projeto_app/frontend/app/checkout/page.tsx) | Page Route | Rota pública de checkout autônomo (`/checkout?planId=...`) com suporte a tema escuro/claro configurável. |
| [`app/dashboard/assinatura/page.tsx`](file:///c:/Users/wesll/Documents/Dev/Projeto_app/frontend/app/dashboard/assinatura/page.tsx) | Page Route | Painel do Assinante com seleção de plano, vigência real calculada, modal de pagamento PIX e cartão, e atalho para checkout transparente. |
| [`prisma/schema.prisma`](file:///c:/Users/wesll/Documents/Dev/Projeto_app/frontend/prisma/schema.prisma) | Data Layer | Definição dos modelos relacionais `Barbershop`, `Plan`, `Subscription`, `Invoice`, `SubscriptionEvent`, `ProcessedWebhook`. |
| [`tests/unit/abacatepay-billing.test.ts`](file:///c:/Users/wesll/Documents/Dev/Projeto_app/frontend/tests/unit/abacatepay-billing.test.ts) | Test Suite | 11 testes unitários cobrindo autenticação de webhook, idempotência, ativação, PIX, estorno, checkout e isolamento multi-tenant. |

---

## 3. Fase B — Matriz de Funcionalidades

| Funcionalidade | Situação | Evidência no Código | Lacuna / Tratativa Realizada | Teste Associado |
| :--- | :--- | :--- | :--- | :--- |
| **Cadastro e edição de planos** | IMPLEMENTADO E VALIDADO | [`lib/billing/saas-billing.ts`](file:///c:/Users/wesll/Documents/Dev/Projeto_app/frontend/lib/billing/saas-billing.ts#L100-L190), [`app/api/billing/plans/route.ts`](file:///c:/Users/wesll/Documents/Dev/Projeto_app/frontend/app/api/billing/plans/route.ts) | CRUD no banco com validação de slugs e preços. | `saas-billing.test.ts` |
| **Preço e ciclo (mensal, anual, custom)** | IMPLEMENTADO E VALIDADO | [`prisma/schema.prisma`](file:///c:/Users/wesll/Documents/Dev/Projeto_app/frontend/prisma/schema.prisma#L233-L237) (`CycleType`), [`lib/billing/saas-billing.ts`](file:///c:/Users/wesll/Documents/Dev/Projeto_app/frontend/lib/billing/saas-billing.ts#L220-L260) | Suporte a `MONTHLY`, `YEARLY` e `CUSTOM` com `durationDays`. | `saas-plans-evolution.test.ts` |
| **Plano de cortesia sem cobrança** | IMPLEMENTADO E VALIDADO | `grantCourtesy()` em [`lib/billing/saas-billing.ts`](file:///c:/Users/wesll/Documents/Dev/Projeto_app/frontend/lib/billing/saas-billing.ts#L430-L510), `COURTESY` enum | Não gera fatura com valor monetário, cria evento de auditoria. | `saas-billing.test.ts` |
| **Ativação e desativação de planos** | IMPLEMENTADO E VALIDADO | `PlanStatus.ACTIVE` / `INACTIVE` em [`lib/billing/saas-billing.ts`](file:///c:/Users/wesll/Documents/Dev/Projeto_app/frontend/lib/billing/saas-billing.ts#L190-L240) | Validação: desativar plano impede novas adesões sem cancelar assinaturas ativas. | `abacatepay-billing.test.ts` (Teste 11) |
| **Preservação de assinaturas existentes ao desativar plano** | IMPLEMENTADO E VALIDADO | [`lib/billing/saas-billing.ts`](file:///c:/Users/wesll/Documents/Dev/Projeto_app/frontend/lib/billing/saas-billing.ts#L240-L270), `abacatepay-billing.test.ts` | Assinantes continuam com acesso até o fim da vigência contratada. | `abacatepay-billing.test.ts` (Teste 11) |
| **Seleção de plano pela barbearia** | IMPLEMENTADO E VALIDADO | [`app/dashboard/assinatura/page.tsx`](file:///c:/Users/wesll/Documents/Dev/Projeto_app/frontend/app/dashboard/assinatura/page.tsx#L120-L240) | Grid interativo com destaque de benefícios e preços reais. | Validado via UI |
| **Criação de cobrança na AbacatePay** | IMPLEMENTADO E VALIDADO | `createAbacateCheckoutSession()` em [`lib/billing/abacatepay-provider.ts`](file:///c:/Users/wesll/Documents/Dev/Projeto_app/frontend/lib/billing/abacatepay-provider.ts#L200-L360) | Suporte a Hosted Checkout e PIX Transparente direto. | `abacatepay-billing.test.ts` (Teste 8) |
| **Associação da cobrança à barbearia e assinatura** | IMPLEMENTADO E VALIDADO | `metadata.barbershopId` e `metadata.planId` em [`lib/billing/abacatepay-provider.ts`](file:///c:/Users/wesll/Documents/Dev/Projeto_app/frontend/lib/billing/abacatepay-provider.ts#L241-L246) | Persistido no payload e lido no webhook handler. | `abacatepay-billing.test.ts` (Teste 3 e 4) |
| **Persistência do ID externo da cobrança** | IMPLEMENTADO E VALIDADO | `Invoice.providerInvoiceId` e `Subscription.providerSubscriptionId` em [`prisma/schema.prisma`](file:///c:/Users/wesll/Documents/Dev/Projeto_app/frontend/prisma/schema.prisma#L296-L323) | Índices exclusivos para busca rápida e deduplicação. | `abacatepay-billing.test.ts` (Teste 3 e 5) |
| **Exibição de valor, vencimento e situação** | IMPLEMENTADO E VALIDADO | [`components/billing/AbacateBillingsManager.tsx`](file:///c:/Users/wesll/Documents/Dev/Projeto_app/frontend/components/billing/AbacateBillingsManager.tsx#L200-L340) | Tabela detalhada com badges de status, formatação BRL e datas. | Validado via UI |
| **Página de retorno do checkout** | IMPLEMENTADO E VALIDADO | [`app/checkout/page.tsx`](file:///c:/Users/wesll/Documents/Dev/Projeto_app/frontend/app/checkout/page.tsx#L83-L90), `/dashboard/assinatura?payment=success` | Tratamento de callbacks de sucesso e cancelamento. | Validado via UI |
| **Consulta de status pelo backend** | IMPLEMENTADO E VALIDADO | `checkAbacatePixStatus()` em [`lib/billing/abacatepay-provider.ts`](file:///c:/Users/wesll/Documents/Dev/Projeto_app/frontend/lib/billing/abacatepay-provider.ts#L366-L396) | Endpoint `/transparents/check?id=...`. | `abacatepay-billing.test.ts` |
| **Histórico financeiro** | IMPLEMENTADO E VALIDADO | Modelo `Invoice` em [`prisma/schema.prisma`](file:///c:/Users/wesll/Documents/Dev/Projeto_app/frontend/prisma/schema.prisma#L311-L331) | Registro perpétuo de faturas com datas de emissão e liquidação. | `saas-billing.test.ts` |
| **Tratamento de cobranças pendentes, expiradas e pagas** | IMPLEMENTADO E VALIDADO | [`lib/billing/webhook-handler.ts`](file:///c:/Users/wesll/Documents/Dev/Projeto_app/frontend/lib/billing/webhook-handler.ts#L155-L470) | Mapeamento para enums `InvoiceStatus` e `SubscriptionStatus`. | `abacatepay-billing.test.ts` |
| **Definição de vigência de assinatura** | IMPLEMENTADO E VALIDADO | `calculatePeriodEnd()` em [`lib/billing/saas-billing.ts`](file:///c:/Users/wesll/Documents/Dev/Projeto_app/frontend/lib/billing/saas-billing.ts#L220-L260) | Adiciona 30 dias para mensal, 365 para anual ou `durationDays`. | `saas-billing.test.ts` |
| **Renovação por cobrança única** | IMPLEMENTADO E VALIDADO | Fluxo por extensão de vigência via nova cobrança/webhook | Como a AbacatePay não possui cartão com token recorrente automático nativo no plano gratuito, cada checkout/PIX aprovado estende o `currentPeriodEnd`. | `abacatepay-billing.test.ts` (Teste 3) |
| **Cancelamento de assinatura** | IMPLEMENTADO E VALIDADO | `transitionSubscriptionStatus()` para `CANCELED` em [`lib/billing/webhook-handler.ts`](file:///c:/Users/wesll/Documents/Dev/Projeto_app/frontend/lib/billing/webhook-handler.ts#L550-L577) | Permite cancelamento e registra timestamp `canceledAt`. | `saas-webhook.test.ts` |
| **Expiração automática e inadimplência** | IMPLEMENTADO E VALIDADO | Máquina de estados: `PAST_DUE` -> `SUSPENDED` -> `EXPIRED` | Tratamento seguro de atraso com dias de carência. | `trial-saas.test.ts` |
| **Validação de webhook oficial** | IMPLEMENTADO E VALIDADO | `verifyAbacateWebhook()` em [`lib/billing/abacatepay-provider.ts`](file:///c:/Users/wesll/Documents/Dev/Projeto_app/frontend/lib/billing/abacatepay-provider.ts#L58-L112) | Suporta tanto `?webhookSecret=...` via `timingSafeEqual` quanto HMAC-SHA256 em `X-Webhook-Signature`. | `abacatepay-billing.test.ts` (Testes 1 e 2) |
| **Idempotência estrita de webhook** | IMPLEMENTADO E VALIDADO | `ProcessedWebhook` em [`lib/billing/webhook-handler.ts`](file:///c:/Users/wesll/Documents/Dev/Projeto_app/frontend/lib/billing/webhook-handler.ts#L121-L150) | Eventos repetidos retornam HTTP 200 com flag `duplicated: true` sem reaplicar saldo. | `abacatepay-billing.test.ts` (Teste 5) |
| **Proteção de chaves de API** | IMPLEMENTADO E VALIDADO | Variáveis de ambiente no servidor (`process.env.ABACATEPAY_API_KEY`) | Chave privada nunca exposta ao bundle do cliente. | Inspeção de código |
| **Isolamento multi-tenant por barbearia** | IMPLEMENTADO E VALIDADO | [`app/api/billing/charges/route.ts`](file:///c:/Users/wesll/Documents/Dev/Projeto_app/frontend/app/api/billing/charges/route.ts#L58), [`app/api/billing/charges/refund/route.ts`](file:///c:/Users/wesll/Documents/Dev/Projeto_app/frontend/app/api/billing/charges/refund/route.ts#L26-L38) | Filtro por `barbershopId` obrigatório para role `ADMIN`. DEVELOPER possui visão global. | `abacatepay-billing.test.ts` (Teste 9) |
| **Painel de Cobranças (Billings Manager)** | IMPLEMENTADO E VALIDADO | [`components/billing/AbacateBillingsManager.tsx`](file:///c:/Users/wesll/Documents/Dev/Projeto_app/frontend/components/billing/AbacateBillingsManager.tsx), `/developer/billing?tab=cobrancas` | Visão completa com filtros, métricas, nova cobrança e estorno. | Validado via UI |
| **Personalização do Checkout** | IMPLEMENTADO E VALIDADO | [`components/billing/CheckoutCustomizer.tsx`](file:///c:/Users/wesll/Documents/Dev/Projeto_app/frontend/components/billing/CheckoutCustomizer.tsx), `/developer/billing?tab=checkout` | Customização de cores, modo Dark/Light e campos com preview ao vivo. | Validado via UI |

---

## 4. Fase C — Verificação da Documentação Oficial AbacatePay v2

### Endpoints e Padrões Validados:
- **Base URL**: `https://api.abacatepay.com/v2`
- **Envelope de Resposta**: `{ "data": {...}, "success": true, "error": null }`
- **Moeda e Unidade Monetária**: Sempre em **centavos de Real** (`BRL`). R$ 30,00 = `3000`. Foi implementado `Math.round(price * 100)` para envio e `amount / 100` para recepção.
- **Produtos**: Criados via `POST /products/create` com `externalId` referenciando o ID do plano no BarberShop.
- **Checkout Hospedado**: `POST /checkouts/create` com `items`, `methods`, `returnUrl`, `completionUrl` e `metadata`.
- **Checkout Transparente PIX**: `POST /transparents/create` com `method: "PIX"`, retornando `brCode` (copia e cola) e `brCodeBase64` (imagem QR Code).
- **Checkout Transparente Boleto**: `POST /transparents/create` com `method: "BOLETO"`, retornando `barCode`, `identificationNumber` (linha digitável) e `url`.
- **Consulta e Simulação**: `GET /transparents/check?id=...` e `POST /transparents/simulate-payment?id=...` para testes de sandbox dev.
- **Webhooks**: Notificações `POST` com eventos `checkout.completed`, `transparent.completed`, `checkout.refunded`.

---

## 5. Fase D — Revisão Financeira e de Estados

A integridade do fluxo financeiro segue as seguintes regras estritas implementadas:
1. **Sem ativação prematura**: A simples geração de um PIX ou abertura da tela de checkout **NÃO** ativa a assinatura e nem estende o contrato da barbearia. A assinatura permanece em `TRIALING` ou `PAST_DUE` até a recepção comprovada do evento `checkout.completed` ou `transparent.completed`.
2. **Cobrança pendente não é receita**: Registrada com status `OPEN` no modelo `Invoice`, só transitando para `PAID` com carimbo `paidAt` no recebimento do webhook.
3. **Idempotência estrita**: Cada evento possui um `eventId` único salvo em `ProcessedWebhook`. Reenvios de webhook ou disparos simultâneos não duplicam faturas nem prolongam indevidamente a vigência da assinatura.
4. **Preservação de histórico no cancelamento**: Cancelar uma assinatura não apaga as `Invoice` anteriores, mantendo relatórios fiscais auditáveis.
5. **Reversão por reembolso**: O recebimento de `checkout.refunded` altera a fatura correspondente para `VOID` e suspende a assinatura para `SUSPENDED`, registrando evento em `SubscriptionEvent`.

---

## 6. Fase E — Plano de Implementação Priorizado (P0 a P3)

- **P0 (Crítico - Segurança & Integridade Financeira)**:
  - Validação timing-safe e HMAC-SHA256 para webhooks da AbacatePay.
  - Bloqueio de IDOR em operações de reembolso para administradores de barbearia.
  - Idempotência transacional no banco para prevenir duplicidade de faturamento.
  - *Status:* **Concluído e Testado.**
- **P1 (Funcionalidades Essenciais para Cobrança)**:
  - Geração de PIX transparente imediato com QR Code dinâmico e código copia-e-cola.
  - Sincronização automática de produtos entre catálogo de planos e AbacatePay.
  - Transição de status da assinatura e aprovação de contrato da barbearia após pagamento.
  - *Status:* **Concluído e Testado.**
- **P2 (Gestão Administrativa & Personalização)**:
  - Dashboard unificado de Cobranças (Billings) com KPIs e simulação em sandbox.
  - Personalizador visual de Checkout (tema claro/escuro, cor verde abacate, campos e dados da loja).
  - Componente de Checkout em 3 etapas com validação de CEP e cartão interativo.
  - *Status:* **Concluído e Testado.**
- **P3 (Melhorias Operacionais & Relatórios)**:
  - Emissão manual de cobranças avulsas diretamente pelo painel administrativo.
  - Indicadores em tempo real de taxa de conversão e volume faturado.
  - *Status:* **Concluído e Testado.**

---

## 7. Fase F — Implementação Incremental Realizada

Todas as alterações foram realizadas de forma não-destrutiva, reutilizando os padrões arquiteturais existentes:
1. `lib/billing/abacatepay-provider.ts`: Ampliado com funções de listagem de cobranças (`listAbacateCheckouts`, `listAbacateTransparents`), emissão de boletos (`createAbacateBoleto`), reembolso (`refundAbacateCharge`) e consulta da loja (`getAbacateStoreInfo`).
2. `lib/billing/checkout-config.ts`: Módulo de persistência para as opções visuais de checkout.
3. `app/api/billing/charges/route.ts` & `app/api/billing/charges/refund/route.ts`: Endpoints com proteção multi-tenant para alimentar o novo painel de cobranças.
4. `components/billing/AbacateCheckout.tsx`: Interface de checkout desenhada com base nas capturas e especificações fornecidas.
5. `components/billing/CheckoutCustomizer.tsx` & `components/billing/AbacateBillingsManager.tsx`: Componentes de alta fidelidade visual integrados na rota `/developer/billing`.

---

## 8. Fase G — Testes Executados e Resultados

A suíte de testes unitários dedicada em [`tests/unit/abacatepay-billing.test.ts`](file:///c:/Users/wesll/Documents/Dev/Projeto_app/frontend/tests/unit/abacatepay-billing.test.ts) foi estruturada e validada com os seguintes cenários:
1. **Autenticação via `webhookSecret` na URL**: Aprovado.
2. **Autenticação via `X-Webhook-Signature` HMAC-SHA256**: Aprovado.
3. **`checkout.completed` ativa assinatura e gera fatura paga**: Aprovado.
4. **`transparent.completed` ativa barbearia via PIX imediato**: Aprovado.
5. **Idempotência estrita (evento duplicado ignorado)**: Aprovado.
6. **Reembolso (`checkout.refunded`) suspende assinatura e anula fatura**: Aprovado.
7. **Requisição HTTP POST `/api/webhooks/billing` com query secret**: Aprovado.
8. **Requisição HTTP POST `/api/billing/checkout` gera sessão AbacatePay**: Aprovado.
9. **Isolamento Multi-Tenant: Bloqueio IDOR em Reembolso**: Aprovado.
10. **Segurança RBAC: Rejeição de role `CLIENT` em ações de faturamento**: Aprovado.
11. **Desativação de plano preserva vigência de assinaturas ativas**: Aprovado.
12. **Evento nativo `billing.paid` com resolução resiliente de barbearia**: Aprovado.

---

## 9. Fase H — Guia de Deploy e Variáveis de Ambiente

### Variáveis Necessárias na Vercel:
| Variável | Descrição | Exemplo de Valor (Produção) |
| :--- | :--- | :--- |
| `ABACATEPAY_API_KEY` | Chave de API da AbacatePay (Produção inicia com `abc_live_...`) | `abc_live_xxxxxxxxxxxxxxxxxxxxxxxx` |
| `ABACATEPAY_WEBHOOK_SECRET` | Segredo configurado para validação do webhook na URL | `barbershop_prod_sec_2026_xyz` |
| `ABACATEPAY_PUBLIC_KEY` | Chave pública para validação de assinatura HMAC no cabeçalho `X-Webhook-Signature` | `t9dXRhHHo3yDEj...` |
| `NEXT_PUBLIC_APP_URL` | URL canônica da aplicação | `https://barber-shop-dev-self.vercel.app` |

### URL do Webhook na AbacatePay:
No painel da AbacatePay ([https://app.abacatepay.com/webhooks](https://app.abacatepay.com/webhooks)), cadastre a URL:
```text
https://barber-shop-dev-self.vercel.app/api/webhooks/billing?webhookSecret=SEU_SECRET_AQUI
```
