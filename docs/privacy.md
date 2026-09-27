# Arquitetura de Privacidade e Proteção de Dados (Privacy by Design)

**Projeto:** BarberShop SaaS Multi-Tenant  
**Classificação:** Diretriz Arquitetural e Operacional  
**Referência Legal:** Lei Federal nº 13.709/2018 (LGPD - Brasil)  
**Status:** Implementado (Aguardando homologação jurídica final)

---

## 1. Princípios de Privacy by Design Aplicados

A plataforma foi projetada seguindo os 7 princípios fundamentais de *Privacy by Design* de Ann Cavoukian:

1. **Proativo e não Reativo:** A privacidade e a segregação de tenants são implementadas nativamente no modelo de dados, não adicionadas como remendos posteriores.
2. **Privacidade como Padrão (Privacy by Default):**
   - Senhas são criptografadas com `bcrypt` (12 rounds) antes de tocar no banco.
   - Rotas públicas NUNCA expõem e-mails internos, hashes de senhas, métricas de faturamento ou dados de outros tenants.
   - O identificador público do tenant é exclusivamente o `slug` sanitizado; o ID primário interno do banco (`cuid`) é preservado internamente.
3. **Privacidade Incorporada ao Design:**
   - Isolamento multi-tenant estrito em todas as consultas SQL/Prisma via filtro obrigatório `where: { barbershopId }`.
   - Remoção de qualquer busca ampla do tipo `findFirst({ isActive: true })` em endpoints abertos.
4. **Funcionalidade Total (Soma Positiva):** A conformidade não prejudica a usabilidade da agenda e agendamentos rápidos por WhatsApp/telefone.
5. **Segurança de Ponta a Ponta:**
   - Trânsito: TLS 1.3 / HTTPS forçado.
   - Repouso: Bancos relacionais com criptografia de volume e backups cifrados com AES-256-GCM.
6. **Visibilidade e Transparência:** Código auditável, registros formais de solicitações de privacidade e políticas públicas acessíveis em `/privacidade` e `/termos`.
7. **Respeito pelo Titular:** Mecanismos de autoatendimento para exportação de dados (`/api/privacy/export`) e anonimização/exclusão de conta (`/api/privacy/anonymize`).

---

## 2. Divisão de Responsabilidades (Controlador vs. Operador)

Sob os Artigos 5º, VI e VII da LGPD:

### 2.1 A Plataforma BarberShop como Operadora
- A BarberShop atua predominantemente como **Operadora** ao processar dados de clientes finais dos estabelecimentos contratantes (nome, telefone e agendamentos).
- A barbearia (cliente do SaaS) é a **Controladora** que detém o relacionamento comercial direto com o consumidor final.
- O SaaS processa os dados exclusivamente segundo as instruções do Controlador e os termos do contrato de prestação de serviços.

### 2.2 A Plataforma BarberShop como Controladora
- A BarberShop atua como **Controladora** exclusivamente dos dados cadastrais dos administradores, sócios e desenvolvedores que contratam a plataforma (nome, e-mail comercial, telefone e dados de pagamento da assinatura SaaS).

---

## 3. Matriz de Tratamento e Segurança da Informação

| Ativo de Dados | Nível de Sensibilidade | Mecanismo de Proteção |
|---|---|---|
| **Senhas de Acesso** | Crítico | Hash unilateral bcrypt (12 salt rounds), nunca descriptografável |
| **Tokens de Autenticação** | Alto | JWT assinado HMAC-SHA256, armazenado em cookies `httpOnly`, `secure`, `sameSite=lax` |
| **Dados Cadastrais de Clientes** | Pessoal Geral | Armazenamento relacional isolado por tenant, restrito a administradores e barbeiros vinculados |
| **Dados Financeiros / Faturas** | Alto | Processados via Hosted Checkout PCI-DSS Level 1; zero armazenamento de números de cartão no banco local |
| **Backups** | Crítico | Criptografia AES-256-GCM e hash de integridade SHA-256 em storage offsite |

---

## 4. Auditoria de Logs e Anti-Vazamento

- **Proibição Absoluta de Log Sensível:** O sistema não registra em stdout/stderr senhas em texto puro, segredos de webhook (`whsec_...`), tokens JWT completos ou dados de cartão de crédito.
- **Mascaramento:** Funções de formatação utilizam máscara para exibição de telefones e e-mails (`maskPhone`, `maskEmail`).
