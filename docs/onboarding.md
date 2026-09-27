# Playbook de Onboarding & Validação com Clientes Reais — BarberShop SaaS

> **Classificação**: Manual Operacional de Produto & Customer Success (CS)  
> **Objetivo**: Conduzir o processo operacional para colocar os primeiros **5–10 clientes reais** em operação na plataforma BarberShop, garantindo o "AHA Moment", coleta contínua de feedback e validação de tração antes de desenvolver novas funcionalidades complexas.  
> **Público-alvo**: Product Managers, Customer Success Managers (CSM), Fundadores e Desenvolvedores da plataforma.

---

## 1. Visão Geral & Filosofia de Validação

Em estágios iniciais de SaaS B2B, **o sucesso do produto depende de suporte próximo (concierge onboarding) e feedback real de uso diário**, não de centenas de novas features.

```
       LEAD
        ↓
     CADASTRO
        ↓
   TRIAL 30 DIAS
        ↓
ONBOARDING ASSISTIDO (15–30 min)
        ↓
  CONFIGURAÇÃO
        ↓
PRIMEIRO AGENDAMENTO (AHA Moment)
        ↓
     USO DIÁRIO
        ↓
     FEEDBACK
        ↓
    CONVERSÃO
```

### Princípios Inegociáveis
1. **Zero Bloat**: Não desenvolver funcionalidades avançadas ou novos módulos nesta fase.
2. **Onboarding Assistido**: Os primeiros 10 clientes nunca devem configurar a barbearia sozinhos. Uma sessão assistida de 15 a 30 minutos garante 100% de ativação.
3. **Regra dos Três Clientes**: Nenhuma nova funcionalidade entra no roadmap sem ser solicitada de forma independente por pelo menos 3 das barbearias piloto.
4. **Time to Value Imediato**: A barbearia deve receber seu primeiro agendamento teste em até 30 minutos após o início do onboarding.

---

## 2. Checklist dos Dados da Barbearia

Antes ou durante a sessão de onboarding, colete e preencha os 16 pontos de dados essenciais:

| # | Dado | Descrição | Onde Configurar | Obrigatório? |
|---|---|---|---|:---:|
| 1 | **Nome da Barbearia** | Nome fantasia comercial do estabelecimento | Cadastro / Perfil | Sim |
| 2 | **Slug da URL Pública** | Identificador URL-safe único (ex: `/b/barbearia-vintage`) | Painel Dev / Perfil | Sim |
| 3 | **Logo / Imagem de Capa** | Identidade visual do estabelecimento | Perfil | Recomendado |
| 4 | **Telefone Principal** | Telefone fixo ou comercial | Perfil | Sim |
| 5 | **WhatsApp de Atendimento** | Número com DDD para contato direto com clientes | Perfil | Sim |
| 6 | **Endereço Completo** | Rua, número, bairro, cidade, CEP | Perfil | Sim |
| 7 | **Horário de Funcionamento** | Horário de abertura e fechamento (ex: 09:00 às 20:00) | Configurações / Agenda | Sim |
| 8 | **Dias de Atendimento** | Ex: Terça a Sábado ou Segunda a Domingo | Configurações / Agenda | Sim |
| 9 | **Serviços Oferecidos** | Catálogo (Corte, Barba, Combo, Sobrancelha, etc.) | Serviços | Sim |
| 10 | **Preços dos Serviços** | Valor unitário em Reais (R$) | Serviços | Sim |
| 11 | **Duração dos Serviços** | Tempo de slot na agenda (ex: 30 min, 45 min, 60 min) | Serviços | Sim |
| 12 | **Barbeiros da Equipe** | Nome e especialidades dos profissionais | Usuários / Equipe | Sim |
| 13 | **Usuários do Sistema** | Contas para recepcionista, barbeiros ou sócios | Usuários | Sim |
| 14 | **Permissões de Acesso** | Papéis definidos: `ADMIN`, `BARBER`, `RECEPTIONIST` | Usuários | Sim |
| 15 | **Política de Cancelamento** | Regras de antecedência mínima para cancelamentos | Configurações | Sim |
| 16 | **Página Pública Ativa** | URL `/b/{slug}` validada e testada no mobile | Validação Externa | Sim |

### Script de Pré-Coleta via WhatsApp (Para Enviar ao Proprietário)

```text
Olá, [Nome do Barbeiro]! 👋
Estamos finalizando a ativação do seu acesso exclusivo ao BarberShop para seus 30 dias de teste gratuito.

Para agilizar nossa sessão de configuração rápida (15 minutinhos), me envie por aqui:
1. Nome da sua barbearia
2. Endereço completo e WhatsApp de atendimento
3. Seus 3 a 5 principais serviços (com preço e tempo de cada um)
4. Nome dos barbeiros que atendem na sua equipe
5. Dias e horários que vocês abrem

Logo em seguida te envio seu link exclusivo de agendamento online pronto para seus clientes! 💈✂️
```

---

## 3. Roteiro da Sessão de Onboarding Assistido (15–30 Minutos)

A sessão pode ser realizada via Google Meet, Zoom ou chamada de vídeo/voz no WhatsApp com compartilhamento de tela.

```
+-----------------------------------------------------------------------------------+
| SESSÃO DE ONBOARDING ASSISTIDO (15-30 MINUTOS)                                   |
+-------------------+---------------------------------------------------------------+
| 00:00 - 05:00 min | Boas-vindas, Alinhamento de Objetivos e Primeiro Acesso        |
| 05:00 - 12:00 min | Configuração de Serviços, Preços, Duração e Equipe             |
| 12:00 - 18:00 min | Validação da Página Pública (/b/{slug}) e Agendamento Teste   |
| 18:00 - 24:00 min | Teste de Fluxo: Confirmação, Notificação e Cancelamento        |
| 24:00 - 30:00 min | Instalação do PWA no Celular + Link na Bio do Instagram        |
+-------------------+---------------------------------------------------------------+
```

### Os 12 Passos Operacionais da Sessão

1. **Passo 1: Criar Barbearia**  
   - Registrar o tenant no sistema através do cadastro ou pelo painel do desenvolvedor (`/developer`).
2. **Passo 2: Criar ADMIN**  
   - Cadastrar o proprietário com role `ADMIN`, validando que ele possui acesso a todas as telas do sistema.
3. **Passo 3: Configurar Perfil**  
   - Preencher nome, telefone, WhatsApp, endereço e upload da logo da barbearia.
4. **Passo 4: Configurar Serviços**  
   - Cadastrar os serviços principais com tempo de execução e valor em reais.
5. **Passo 5: Cadastrar Barbeiros**  
   - Adicionar os profissionais da equipe, vinculando especialidades e comissões se aplicável.
6. **Passo 6: Configurar Horários**  
   - Definir os dias da semana de atendimento e a grade de horários de início e fim.
7. **Passo 7: Verificar URL Pública**  
   - Acessar `https://DOMINIO/b/{slug}` no navegador e validar que serviços e barbeiros aparecem corretamente.
8. **Passo 8: Criar Primeiro Cliente**  
   - Cadastrar um cliente teste com nome e telefone (ou o próprio número do CSM/barbeiro).
9. **Passo 9: Criar Primeiro Agendamento (AHA Moment)**  
   - Agendar um serviço pela página pública e verificar a reserva em tempo real na agenda interna do painel.
10. **Passo 10: Testar Cancelamento**  
    - Cancelar o agendamento teste pelo painel e verificar a liberação imediata do horário na agenda.
11. **Passo 11: Testar Login**  
    - Pedir para o barbeiro deslogar e logar novamente no próprio smartphone, confirmando memorização da senha.
12. **Passo 12: Instalar PWA**  
    - No navegador do celular (Chrome/Safari), clicar em "Adicionar à tela inicial" para criar o ícone do aplicativo.

---

## 4. Painel Developer & Cockpit de Onboarding

O gerenciamento da operação e acompanhamento dos clientes piloto é centralizado em:
- **Cockpit de Onboarding**: `/developer/onboarding`
- **Painel Geral de Tenants**: `/developer`

### Máquina de Estados do Ciclo de Vida do Tenant

| Status | Significado Operacional | Ação do CSM / Dev |
|---|---|---|
| `LEAD` | Barbeiro demonstrou interesse, em contato inicial | Convidar para sessão de demonstração |
| `PENDING` | Cadastro realizado, aguardando aprovação ou agendamento de onboarding | Agendar call de 15–30 min |
| `TRIAL` | Trial gratuito de 30 dias ativo com sistema 100% liberado | Monitorar TTFA e volume semanal |
| `ACTIVE` | Cliente converteu em assinatura paga recorrente | Manter acompanhamento de satisfação |
| `PAST_DUE` | Falha no pagamento da fatura recorrente (período de tolerância de 3 dias) | Enviar lembrete amigável via WhatsApp |
| `SUSPENDED` | Bloqueado por inadimplência ou decisão comercial | Contatar para renegociação |
| `CANCELED` | Trial expirado sem conversão ou cancelamento solicitado | Aplicar pesquisa de desativação (churn) |

### Métricas e Informações Apresentadas no Cockpit
- **Data de criação**: Momento exato em que o tenant ingressou na base.
- **Início e fim do trial**: Contador regressivo dos 30 dias com alertas visuais para &le; 7 dias.
- **Plano**: Identificação do pacote e limites.
- **Último acesso & Última atividade**: Diferenciação entre login passivo e ações reais (agendamentos criados, clientes adicionados).
- **Contadores em tempo real**: Quantidade de usuários, barbeiros, clientes cadastrados e agendamentos totais.
- **Botões de 1 clique**: Copiar link público `/b/{slug}`, abrir página pública, checklist interativo dos 12 passos e formulário de feedback.

---

## 5. Critérios Claros para Considerar um Cliente Ativado

Um cliente **NÃO** está ativado apenas porque fez o cadastro ou terminou a call de onboarding.

### Critério de Ativação do BarberShop SaaS
Uma barbearia é considerada **ATIVADA** quando atinge os seguintes marcos:

1. **Marco 1 (AHA Moment Técnico)**: Recebeu pelo menos **1 agendamento real de cliente** dentro das primeiras **48 horas** após o onboarding.
2. **Marco 2 (Adoção Operacional)**: Realizou **&ge; 5 agendamentos** na primeira semana de operação.
3. **Marco 3 (Engajamento do Dono)**: O administrador acessou o painel em pelo menos **3 dias distintos** da semana.
4. **Marco 4 (Página Pública Divulgada)**: O link `/b/{slug}` foi colocado na Bio do Instagram ou no WhatsApp Business da barbearia.

Se uma barbearia passar de 48 horas após a call sem registrar agendamento, o CSM deve enviar mensagem de suporte proativa.

---

## 6. Métricas & KPIs de Acompanhamento Diário

| Métrica | Definição | Fórmula | Meta no Piloto |
|---|---|---|:---:|
| **Time to First Appointment (TTFA)** | Tempo decorrido entre o cadastro e a primeira reserva | `Data 1º Agendamento - Data Criação` | **< 24 horas** |
| **Taxa de Ativação** | Proporção de tenants que atingiram o Marco 1 | `(Ativados / Total em Trial) * 100` | **&ge; 80%** |
| **Weekly Active Tenants (WAU)** | Barbearias com agendamentos nos últimos 7 dias | `Contagem de tenants com atividade em 7d` | **&ge; 90%** |
| **Volume de Agendamentos** | Total bruto de atendimentos marcados na plataforma | `Soma de todos os appointments` | Crescimento semanal |
| **Retenção no Trial** | Barbearias que continuam ativas ao longo dos 30 dias | `(Ativas no Dia 21 / Ativas no Dia 1) * 100` | **&ge; 70%** |
| **Conversão Trial &rarr; Pago** | Barbearias que assinam o plano ao fim do período | `(Convertidos em Pagos / Total de Trials) * 100` | **&ge; 30% a 50%** |
| **Cancelamentos (Churn)** | Barbearias que desistem durante ou ao fim do trial | `Cancelados / Total` | **&le; 20%** |
| **Bugs Críticos Reportados** | Falhas que impedem agendamento ou login | `Contagem de bugs bloqueantes` | **0 tolerado** |

---

## 7. Roteiro e Perguntas para Coleta de Feedback

Não utilizar formulários longos ou ferramentas externas de CRM com automações pesadas. O formulário integrado no sistema (`/api/feedback` e componente `TenantFeedbackModal`) cobre as 7 dimensões essenciais:

### Formulário de 7 Perguntas

1. **Facilidade de Uso (Score 1 a 5)**  
   *Quão fácil foi para você e sua equipe aprenderem a mexer no sistema?*
2. **Satisfação Geral / CSAT (Score 1 a 5)**  
   *De maneira geral, qual sua satisfação com o BarberShop até agora?*
3. **Funcionalidade Mais Utilizada**  
   *Qual recurso você e seus barbeiros mais usam no dia a dia?*  
   *(Ex: Agenda diária, link público na bio do Instagram, histórico de clientes)*
4. **Funcionalidade Ausente / Que Faz Falta**  
   *Se você pudesse adicionar uma única coisa ao sistema hoje, qual seria?*
5. **Problemas e Atritos Operacionais**  
   *Em algum momento você teve dúvidas, travou ou achou algum processo confuso?*
6. **Bugs ou Comportamentos Estranhos**  
   *Ocorreu algum erro na tela ou botão que não funcionou como esperado?*
7. **Intenção de Continuar Pós-Trial**  
   *Quando os 30 dias de teste gratuito terminarem, você pretende continuar usando o sistema?*  
   - [ ] Sim, com certeza  
   - [ ] Talvez / Ainda avaliando  
   - [ ] Não pretendo  

### Cadência de Coleta
- **Dia 7 do Trial**: Check-in rápido de atrito via WhatsApp (identificar bugs ou bloqueios).
- **Dia 21 do Trial**: Aplicação do formulário de feedback completo (medir intenção de conversão).
- **Dia 28 do Trial**: Apresentação da proposta comercial / ativação do plano recorrente.

---

## 8. Matriz de Priorização de Melhorias Pós-Feedback

Ao coletar feedbacks dos 5 a 10 primeiros clientes, utilize a matriz abaixo para decidir o que entra na próxima sprint:

```
                  ALTO IMPACTO
                       ▲
         (2)           │          (1)
    QUICK WINS         │    MANDATÓRIOS
  (Fazer rápido)       │    (Prioridade Máxima)
                       │
◄──────────────────────┼──────────────────────►
BAIXO ESFORÇO          │          ALTO ESFORÇO
                       │
         (4)           │          (3)
     DESCARTAR         │    ARMADILHAS
  (Não fazer agora)    │    (Evitar nesta fase)
                       │
                  BAIXO IMPACTO
```

### Critérios de Decisão:
1. **Mandatórios (Alto Impacto / Alto Esforço)**: Apenas se for solicitado por &ge; 3 clientes e for requisito direto para pagarem a assinatura (ex: lembrete automatizado de WhatsApp).
2. **Quick Wins (Alto Impacto / Baixo Esforço)**: Ajustes de interface, textos mais claros, botão em posição melhor. Fazer imediatamente.
3. **Armadilhas (Baixo Impacto / Alto Esforço)**: Funcionalidades complexas pedidas por um único cliente (ex: emissão de nota fiscal municipal automática, controle avançado de estoque de cosméticos). **Dizer não educadamente nesta fase.**
4. **Descartar**: Ideias genéricas sem validação prática.

---

## 9. Resumo das Rotas e Ferramentas Disponíveis

| Recurso | Rota | Descrição |
|---|---|---|
| **Cockpit de Onboarding** | `/developer/onboarding` | Dashboard operacional com funil, checklist e métricas |
| **API de Onboarding** | `/api/developer/onboarding` | Endpoint com agregação de métricas de ativação e tenants |
| **API de Feedback** | `/api/feedback` | Endpoint POST/GET para submissão e listagem de avaliações |
| **Modal de Feedback** | `TenantFeedbackModal.tsx` | Componente reutilizável para coleta de CSAT e intenção |
| **Página Pública** | `/b/{slug}` | Página de agendamento online do cliente final da barbearia |
| **Developer Hub** | `/developer` | Gestão técnica de tenants, isolamento e aprovação |
