# Deploy Setup - BarberShop Scheduler

## Problemas Comuns de Deploy e Soluções

### 1. Erro ao Salvar Dados (500 Internal Server Error)

#### Causas Prováveis:
- **DATABASE_URL não configurada** no ambiente de deploy
- **Prisma Client não gerado** para produção
- **Permissões no banco de dados**
- **Variáveis de ambiente ausentes**

#### Soluções:

##### A. Verificar Variáveis de Ambiente
```bash
# No ambiente de deploy, verificar se existe .env
cat .env

# Deve conter:
DATABASE_URL="postgresql://usuario:senha@host:5432/database"
JWT_SECRET="sua-chave-secreta-jwt"
NODE_ENV="production"
```

##### B. Gerar Prisma Client
```bash
# No ambiente de deploy
npx prisma generate
npx prisma db push
```

##### C. Executar Seed em Produção
```bash
# Usar script de deploy
DEPLOY_URL=https://seu-domínio.com node scripts/deploy-seed.js

# Ou diretamente
curl -X POST https://seu-domínio.com/api/seed
```

### 2. Configuração de Ambiente

#### Variáveis Obrigatórias:
```env
# .env
DATABASE_URL="postgresql://usuario:senha@host:5432/database"
JWT_SECRET="chave-secreta-forte-32-caracteres"
NODE_ENV="production"
```

#### Para Vercel:
```bash
# Configurar no dashboard do Vercel
# Settings > Environment Variables
DATABASE_URL=postgresql://...
JWT_SECRET=sua-chave-secreta
NODE_ENV=production
```

#### Para Railway/Render:
```bash
# Adicionar no painel de controle
# Environment Variables
```

### 3. Diagnóstico de Erros

#### Script de Verificação:
```bash
# Verificar configurações
node scripts/deploy-seed.js check

# Verificar dados existentes
node scripts/deploy-seed.js check
```

#### Logs de Erro Comuns:
- **PrismaClientUnknownRequestError**: Conexão com banco falhou
- **P2024**: Database não existe
- **P1001**: Não foi possível conectar ao banco

### 4. Passos para Deploy Funcional

#### Passo 1: Preparar Ambiente
```bash
# 1. Configurar variáveis de ambiente
# 2. Verificar DATABASE_URL
# 3. Gerar Prisma Client
npx prisma generate
```

#### Passo 2: Deploy
```bash
# Fazer deploy da aplicação
npm run build
npm run start
```

#### Passo 3: Popular Banco
```bash
# Executar seed após deploy
DEPLOY_URL=https://seu-domínio.com node scripts/deploy-seed.js
```

#### Passo 4: Testar
```bash
# Testar login com usuários criados
# Admin: admin@barberiacentral.com / admin123
# Barber: joao@barberiacentral.com / barber123
# Client: cliente@barberiacentral.com / client123
```

### 5. Troubleshooting Avançado

#### Verificar Conexão com Banco:
```javascript
// Criar script de teste: scripts/test-db.js
const { PrismaClient } = require('@prisma/client');

async function testDB() {
  const prisma = new PrismaClient();
  try {
    await prisma.$connect();
    console.log('Conexão OK');
    const count = await prisma.user.count();
    console.log('Usuários:', count);
  } catch (error) {
    console.error('Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}
```

#### Verificar Build:
```bash
# Limpar e rebuildar
rm -rf .next
npm run build
```

### 6. Boas Práticas

#### Antes do Deploy:
1. **Testar localmente** com `npm run build && npm run start`
2. **Verificar variáveis** de ambiente
3. **Backup do banco** atual
4. **Documentar versão** do schema

#### Pós-Deploy:
1. **Verificar logs** de erro
2. **Testar funcionalidades** críticas
3. **Popular dados** iniciais
4. **Monitorar performance**

### 7. Exemplo Completo

#### Para Vercel:
```bash
# 1. Configurar env vars no Vercel
# 2. Deploy
vercel --prod

# 3. Popular banco
DEPLOY_URL=https://seu-app.vercel.app node scripts/deploy-seed.js

# 4. Testar
curl https://seu-app.vercel.app/api/seed
```

#### Para Docker:
```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npx prisma generate
EXPOSE 3000
CMD ["npm", "start"]
```

```bash
# Comandos
docker build -t barbershop .
docker run -p 3000:3000 -e DATABASE_URL=... -e JWT_SECRET=... barbershop
```
