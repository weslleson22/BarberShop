# Política de Retenção e Descarte Seguro de Dados (Data Retention Policy)

**Projeto:** BarberShop SaaS  
**Classificação:** Diretriz de Governança de Dados  
**Referência Legal:** Art. 15 e 16 da LGPD, Art. 15 do Marco Civil da Internet, Art. 174 do Código Tributário Nacional  
**Status:** Aprovado para Implementação Técnica  

---

## 1. Tabela de Prazos de Retenção

> **Regra Fundamental de Governança:** Dados pessoais não devem ser mantidos indefinidamente. No entanto, dados não podem ser simplesmente destruídos de forma indiscriminada quando houver dever legal ou probatório de guarda (Art. 16, I da LGPD).

| Categoria de Dado | Entidades no Banco | Prazo de Retenção | Fundamentação Legal | Ação ao Fim do Prazo |
|---|---|---|---|---|
| **Contas de Usuários Ativos** | `users`, `clients` | Duração do vínculo com o estabelecimento | Execução de Contrato (Art. 7º, V LGPD) | Manutenção ativa no banco |
| **Contas Encerradas / Excluídas** | `users`, `clients` | Anonimização imediata dos dados cadastrais + retenção de chaves opacas por 5 anos | Art. 16, I e IV LGPD; Defesa em juízo (Art. 206 Código Civil) | Anonimização irreversível via `anonymizeUserAccount` |
| **Agendamentos Concluídos** | `appointments` | 5 anos a contar da data da realização | Prazo prescricional do Código de Defesa do Consumidor (Art. 27 CDC) | Arquivamento / Purga |
| **Registros Financeiros & Faturas** | `payments`, `invoices`, `subscriptions` | 5 anos fiscais | Art. 174 do Código Tributário Nacional (CTN) | Purga segura após 5 anos |
| **Notificações Operacionais** | `notifications` | 90 dias após emissão | Minimização de dados (Art. 6º, III LGPD) | Exclusão automatizada |
| **Eventos de Webhook & Idempotência** | `processed_webhooks` | 180 dias | Prevenção a fraudes e replay attacks | Exclusão automática de registros antigos |
| **Logs de Acesso à Aplicação** | Vercel Serverless Logs | 6 meses (180 dias) | Artigo 15 da Lei nº 12.965/2014 (Marco Civil da Internet) | Descarte automatizado pelo provedor de logs |
| **Backups Criptografados Offsite** | Snapshots `.enc` | Conforme política GFS (7d diário, 4sem semanal, 12m mensal, 5a anual) | Plano de Continuidade e Disaster Recovery | Expiração automática por Lifecycle Rule no bucket S3/R2 |

---

## 2. Procedimento Técnico de Anonimização

Quando um titular solicita exclusão ou quando uma conta é encerrada sem pendências legais, a plataforma executa a função [anonymizeUserAccount](file:///c:/Users/wesll/Documents/Dev/Projeto_app/frontend/lib/privacy/lgpd-service.ts#L225-L290):

1. **Validação de Impedimentos:**
   - O sistema verifica se existem agendamentos pendentes ou confirmados para datas futuras (`startTime >= NOW()`). Em caso afirmativo, a operação é rejeitada até que os agendamentos sejam cancelados.
2. **Descaracterização Cadastral Unilateral:**
   - O campo `name` é substituído por `"Usuário Anonimizado [LGPD-{id}]"`.
   - O campo `email` é substituído por endereço sintético inválido (`"anonymized_{id}@lgpd.invalid"`).
   - O campo `password` é substituído por hash aleatório descartável de 256 bits, impossibilitando qualquer autenticação futura.
   - `phone`, `address`, `birthDate`, `avatar`, `bio` e `specialties` são truncados para `NULL` ou `[]`.
   - `isActive` é comutado para `false`.
3. **Preservação de Registros Vinculados (Integridade Referencial):**
   - Agendamentos e faturas históricas continuam no banco para conciliação contábil, porém desvinculados de qualquer identidade pessoal real do indivíduo (dados anonimizados não são considerados dados pessoais pela LGPD, conforme Art. 12).
4. **Registro de Auditoria:**
   - A solicitação na tabela `privacy_requests` é atualizada para `COMPLETED` com registro do timestamp e agente executor.
