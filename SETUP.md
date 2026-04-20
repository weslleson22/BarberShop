# 🚀 Setup Rápido - Barbershop Scheduler

## Pré-requisitos

- Node.js 18+ instalado
- PostgreSQL 14+ rodando localmente
- Git

## 1. Instalação do Projeto

```bash
# Clone o repositório
git clone <seu-repositorio>
cd barbershop-scheduler

# Instale as dependências
npm install
```

## 2. Configuração do Banco de Dados

```bash
# Crie o banco de dados PostgreSQL
createdb barbershop_db

# Configure as variáveis de ambiente
cp .env.example .env
```

Edite o arquivo `.env`:
```env
DATABASE_URL="postgresql://seu_usuario:sua_senha@localhost:5432/barbershop_db"
JWT_SECRET="sua-chave-secreta-muito-forte"
```

## 3. Setup do Prisma

```bash
# Gere o cliente Prisma
npx prisma generate

# Crie as tabelas no banco
npx prisma db push
```

## 4. Popular Dados de Exemplo

```bash
# Execute o script de seed
npx tsx prisma/seed.ts
```

Isso criará:
- 1 barbearia exemplo
- 3 usuários (1 admin, 2 barbeiros)
- 5 serviços
- 5 clientes
- Agendamentos de exemplo
- Pagamentos de exemplo

## 5. Iniciar o Servidor

```bash
# Modo desenvolvimento
npm run dev

# Modo produção
npm run build
npm start
```

Acesse: http://localhost:3000

## 🔐 Credenciais de Teste

### Admin
- **Email**: admin@barberiacentral.com
- **Senha**: admin123

### Barbeiros
- **Email**: carlos@barberiacentral.com
- **Senha**: barber123
- **Email**: pedro@barberiacentral.com
- **Senha**: barber123

## 📱 Testando o Sistema

### 1. Acesso Público
- Acesse a página inicial sem login
- Clique em "Agendar Agora"
- Siga o fluxo de 3 passos:
  1. Escolha um serviço
  2. Escolha um barbeiro
  3. Escolha data e horário

### 2. Acesso Admin
- Faça login com as credenciais de admin
- Explore o dashboard
- Crie novos serviços/clientes
- Visualize a agenda

### 3. Acesso Barbeiro
- Faça login com credenciais de barbeiro
- Visualize apenas sua agenda
- Gerencie seus agendamentos

## 🔧 Comandos Úteis

```bash
# Verificar schema do banco
npx prisma studio

# Resetar banco de dados
npx prisma db push --force

# Gerar_types do Prisma
npx prisma generate

# Executar seed novamente
npx tsx prisma/seed.ts

# Verificar logs do servidor
npm run dev
```

## 🐛 Problemas Comuns

### Erro: "Cannot find module '@prisma/client'"
```bash
# Reinstale as dependências
rm -rf node_modules package-lock.json
npm install
npx prisma generate
```

### Erro: "Connection refused"
- Verifique se o PostgreSQL está rodando
- Confirme a string de conexão no .env
- Teste a conexão: `psql postgresql://usuario:senha@localhost:5432/barbershop_db`

### Erro: "JWT_SECRET is required"
- Configure a variável JWT_SECRET no .env
- Use uma string longa e aleatória

## 📊 Verificação do Sistema

### Dashboard Admin
- [ ] Total de agendamentos do dia
- [ ] Faturamento do dia
- [ ] Próximos agendamentos
- [ ] Total de clientes

### Agendamento
- [ ] Fluxo de 3 passos funcionando
- [ ] Validação de conflitos de horário
- [ ] Criação automática de cliente
- [ ] Confirmação de agendamento

### Multi-tenant
- [ ] Isolamento de dados por barbearia
- [ ] Login específico por barbearia
- [ ] RBAC funcionando corretamente

## 🌐 Deploy

### Vercel (Recomendado)
1. Conecte o repositório ao Vercel
2. Configure as variáveis de ambiente no painel
3. Deploy automático

### Railway
1. Crie um novo projeto
2. Configure o PostgreSQL
3. Set DATABASE_URL
4. Deploy

### Docker
```bash
# Build da imagem
docker build -t barbershop-scheduler .

# Execute o container
docker run -p 3000:3000 --env-file .env barbershop-scheduler
```

## 📞 Suporte

- 📧 Email: support@barbershop-scheduler.com
- 📖 Docs: docs.barbershop-scheduler.com
- 🐛 Issues: GitHub Issues

---

**Parabéns! 🎉 Seu sistema de agendamento de barbearia está pronto para uso!**
