# Mapeamento de Conformidade e Inventário de Dados (ROPA / LGPD)

**Projeto:** BarberShop SaaS  
**Referência:** Lei Geral de Proteção de Dados (Lei nº 13.709/2018)  
**Natureza do Documento:** Mapeamento Técnico e Inventário de Tratamento de Dados (Art. 37 LGPD)  
**Aviso Importante:** Este documento reflete a arquitetura técnica e os controles operacionais implementados. Não substitui parecer jurídico formal emitido por advogado especialista em Direito Digital.

---

## 1. Inventário de Dados Pessoais (ROPA - Record of Processing Activities)

| Entidade / Tabela | Dados Coletados | Finalidade Primária | Quem Fornece | Quem Acessa | Local de Armazenamento | Prazo de Retenção | Obrigatoriedade | Possibilidade de Exclusão |
|---|---|---|---|---|---|---|---|---|
| **User** | Nome, e-mail, senha (hash), telefone, endereço, data nascimento, bio, avatar | Autenticação, controle de acesso (RBAC), perfil do barbeiro na agenda | O próprio usuário no cadastro | O próprio usuário, Admin da barbearia, Developer | PostgreSQL (`users`) | Duração do vínculo + 5 anos | Obrigatório para acesso | Anonimização sob demanda ou após término contratual |
| **Client** | Nome, telefone (WhatsApp), e-mail, status VIP | Agendamento de atendimentos, confirmação e histórico | O cliente no agendamento ou barbeiro | Barbeiros e Admin da barbearia | PostgreSQL (`clients`) | Duração do vínculo + 5 anos | Nome e telefone obrigatórios | Anonimização sob demanda (se não houver agendamento futuro) |
| **Appointment** | Data/hora de início/fim, status, notas, serviço, barbeiro, cliente | Gestão da agenda, controle de conflitos de horário | Cliente ou Barbeiro | Barbeiro agendado, Admin da unidade | PostgreSQL (`appointments`) | 5 anos (atendimento fiscal e CDC) | Obrigatório para reserva | Não imediato (retenção probatória), permite anonimizar vínculo |
| **Payment** | Valor, método de pagamento, status, data | Conciliação financeira do atendimento presencial | Barbeiro / Recepção | Admin e Developer | PostgreSQL (`payments`) | 5 anos (Código Tributário Nacional) | Obrigatório na cobrança | Retenção obrigatória por lei (Art. 16, I) |
| **Notification** | Título, mensagem, data, status de leitura | Alertas de novos agendamentos e alterações | Sistema automático | Usuário destinatário | PostgreSQL (`notifications`) | 90 dias | Automático do sistema | Exclusão automática periódica |
| **Barbershop** | Nome comercial, e-mail, telefone, endereço, logo, slug público | Identificação do tenant comercial, página pública | Administrador da barbearia | Público (dados cadastrais), Developer | PostgreSQL (`barbershops`) | Duração da conta comercial | Obrigatório para operar | Exclusão no encerramento da conta |
| **Subscription** | ID gateway, status da assinatura, datas de vigência | Cobrança recorrente da assinatura SaaS da barbearia | Gateway de pagamento (Stripe) | Admin da unidade, Developer | PostgreSQL (`subscriptions`) | 5 anos após cancelamento | Obrigatório para SaaS | Retenção fiscal obrigatória |
| **Invoice** | Número da fatura, valor, moeda, status, link do boleto/recibo | Registro fiscal e contábil de pagamento SaaS | Gateway de pagamento | Admin da unidade, Developer | PostgreSQL (`invoices`) | 5 anos (Legislação Tributária) | Obrigatório para emissão | Retenção fiscal obrigatória |

---

## 2. Bases Legais Aplicadas (Art. 7º da LGPD)

A plataforma **NÃO utiliza "consentimento" como panaceia genérica**. Cada operação de tratamento possui base legal técnica adequada:

1. **Execução de Contrato (Art. 7º, V):**
   - Agendamento de horários entre cliente e barbearia.
   - Envio de lembretes e confirmações essenciais via WhatsApp/E-mail.
   - Fornecimento da licença de uso do software para os lojistas.
2. **Cumprimento de Obrigação Legal ou Regulatória (Art. 7º, II):**
   - Guarda de registros contábeis, notas e faturas por 5 anos (Código Tributário Nacional e Código Civil).
   - Guarda de registros de aplicação da internet (logs de acesso) por 6 meses conforme Art. 15 do Marco Civil da Internet (Lei nº 12.965/2014).
3. **Legítimo Interesse (Art. 7º, IX):**
   - Prevenção a fraudes e bloqueio de abuso em concorrência de agendamentos simultâneos.
   - Métricas agregadas de desempenho e faturamento sem cruzamento discriminatório.
4. **Consentimento (Art. 7º, I):**
   - Restrito a comunicações de marketing, campanhas promocionais e novidades não essenciais.
   - Deve ser livre, informado, inequívoco e passível de revogação simples a qualquer momento.

---

## 3. Direitos do Titular Implementados no Sistema

A plataforma disponibiliza rotas e serviços para atendimento aos direitos previstos no Art. 18 da LGPD:

| Direito (Art. 18 LGPD) | Implementação Técnica | Endpoint / Mecanismo |
|---|---|---|
| **I - Confirmação da existência de tratamento** | Informações claras na Política de Privacidade e rota de consulta de perfil | `GET /api/users/profile` |
| **II - Acesso aos dados** | Tela de perfil com visualização completa dos dados pessoais | `app/perfil/page.tsx` |
| **III - Correção de dados incompletos/inexatos** | Edição em tempo real de dados cadastrais no painel do usuário | `PATCH /api/users/profile` |
| **IV - Anonimização ou eliminação de dados desnecessários** | Anonimização irreversível dos dados cadastrais preservando histórico fiscal | `POST /api/privacy/anonymize` |
| **V - Portabilidade dos dados** | Download completo de arquivo JSON interoperável com todo histórico | `GET /api/privacy/export` |
| **VI - Eliminação dos dados pessoais** | Fluxo de solicitação com validação de obrigações legais pendentes | `POST /api/privacy/requests` |
| **IX - Revogação do consentimento** | Opção para desabilitar notificações de marketing no perfil | `PATCH /api/users/profile` |

---

## 4. Pendências de Homologação Jurídica (Backlog Legal)

Antes de iniciar as vendas ativas em escala comercial, os seguintes itens devem ser validados por assessoria jurídica:

- [ ] **Revisão dos Termos de Uso:** Validação formal das cláusulas de limitação de responsabilidade civil e SLA.
- [ ] **Data Processing Agreement (DPA):** Elaboração de anexo contratual específico de operador de dados para assinatura com as barbearias contratantes.
- [ ] **Contratos com Suboperadores:** Mapeamento formal dos termos de privacidade da Vercel, Supabase/Prisma Cloud e Stripe.
- [ ] **Nomeação do Encarregado (DPO):** Definição formal do responsável pela comunicação com a ANPD e publicação do nome/contato na página pública de privacidade.
- [ ] **Relatório de Impacto à Proteção de Dados (RIPD):** Avaliação de risco se a plataforma expandir para coleta de dados de localização precisa ou biometria.
