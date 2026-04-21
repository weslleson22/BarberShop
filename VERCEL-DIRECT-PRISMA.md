# Conexão Direta Prisma - Vercel Production

## Problema Atual

A variável DATABASE_URL está causando erro no Vercel mesmo com a URL do Prisma Data Proxy.

## Solução: Conexão Direta via Prisma Cloud

### Opção 1: Usar Prisma Cloud Data Platform

#### 1. Criar Projeto no Prisma Cloud
1. Acessar: https://cloud.prisma.io
2. Criar novo projeto
3. Conectar ao banco PostgreSQL existente
4. Obter URL do Data Proxy

#### 2. Configurar no Vercel
```bash
# URL do Prisma Cloud (formato correto)
DATABASE_URL=prisma://your-project-name.prisma-data.net/?api_key=your-api-key

# Exemplo real (substituir com seu projeto)
DATABASE_URL=prisma://barber-shop-prod.prisma-data.net/?api_key=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Opção 2: Usar Neon Database (Recomendado)

#### 1. Criar Projeto Neon
1. Acessar: https://neon.tech
2. Criar novo projeto PostgreSQL
3. Copiar connection string
4. Configurar no Vercel

#### 2. URL Neon para Vercel
```bash
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech:5432/dbname?sslmode=require
```

### Opção 3: Usar Supabase

#### 1. Criar Projeto Supabase
1. Acessar: https://supabase.com
2. Criar novo projeto
3. Settings > Database > Connection string
4. Copiar URL com SSL

#### 2. URL Supabase para Vercel
```bash
DATABASE_URL=postgresql://postgres.abc.supabase.co:5432/postgres?sslmode=require&pgbouncer=true
```

## Passo a Passo - Solução Recomendada (Neon)

### 1. Criar Conta Neon
```bash
# Acessar: https://neon.tech
# Criar conta gratuita
# Criar projeto "barber-shop-prod"
```

### 2. Obter Connection String
```bash
# Dashboard Neon > Project > Connection Details
# Copiar: Connection string
# Formato: postgresql://user:password@host:5432/dbname?sslmode=require
```

### 3. Configurar no Vercel
```
https://vercel.com/dashboard/weslleson22s-projects/barbeariaapp/settings/environment-variables
```

### 4. Variáveis para Vercel
```bash
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech:5432/barber_shop?sslmode=require
JWT_SECRET=barber-shop-super-secret-jwt-key-32-chars-minimum-for-production
NEXTAUTH_SECRET=barber-shop-super-secret-nextauth-key-32-chars-minimum-for-production
NEXTAUTH_URL=https://barbeariaapp.vercel.app
NODE_ENV=production
```

### 5. Deploy e Testar
```bash
vercel --prod
```

### 6. Validar Conexão
```bash
curl https://barbeariaapp.vercel.app/api/health
```

## Vantagens do Neon

### 1. Fácil Configuração
- URL PostgreSQL padrão
- SSL automático
- Serverless-ready

### 2. Gratuito para Começar
- 500MB storage
- 1 bilhão de rows
- 3 projetos

### 3. Performance
- Baixa latência
- Auto-scaling
- Backup automático

### 4. Compatibilidade Total
- Funciona com Prisma
- Compatível Vercel
- Sem Data Proxy necessário

## Troubleshooting

### Erro: Connection Refused
- Verificar URL completa
- Confirmar SSL mode
- Testar localmente primeiro

### Erro: Authentication Failed
- User/password corretos
- Database existe
- Permissões ok

### Erro: SSL Required
- Adicionar `?sslmode=require`
- Usar PostgreSQL client com SSL

## Teste Local com Neon

```bash
# Adicionar ao .env.local
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech:5432/barber_shop?sslmode=require

# Testar
npm run dev
curl http://localhost:3000/api/health
```

## Migração de Dados

### 1. Exportar Dados Atuais
```bash
# Se tiver dados no banco atual
pg_dump old_database > backup.sql
```

### 2. Importar para Neon
```bash
# Usar Neon console ou CLI
psql postgresql://user:password@host:5432/dbname < backup.sql
```

### 3. Rodar Migrations
```bash
npx prisma migrate deploy
```

## Recomendação Final

**Use Neon Database** para conexão direta e simples:
1. URL PostgreSQL padrão (sem Data Proxy)
2. Configuração trivial
3. Performance excelente
4. Gratuito para começar
5. Totalmente compatível com Vercel

Isso elimina todos os problemas com Prisma Data Proxy e variáveis de ambiente.
