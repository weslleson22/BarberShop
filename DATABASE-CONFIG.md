# 🗄️ Database Configuration - Vercel Production

## 🎯 DATABASE_URL Correta para Vercel

### ✅ **Use a URL padrão PostgreSQL com SSL:**

```bash
# FORMATO CORRETO:
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require

# EXEMPLO REAL:
DATABASE_URL=postgresql://0f28e5f37e809d7c1012b940e1ce9f494b0dbfdc8bd4e0d1519aec90f689b695:sk_BDk7Rj-Mh5Hzrufr9uezK@db.prisma.io:5432/postgres?sslmode=require
```

### ❌ **NÃO USE Prisma Accelerate URL:**
```bash
# ❌ ERRADO - Isso é para Prisma Data Proxy, não para Vercel
prisma+postgres://accelerate.prisma-data.net/?api_key=...
```

## 🏗️ Opções de PostgreSQL Cloud para Vercel

### 1. **Neon (Recomendado)**
```bash
# 1. Criar conta: https://neon.tech
# 2. Criar projeto PostgreSQL
# 3. Copiar Connection String
# 4. Formato:
DATABASE_URL=postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech:5432/dbname?sslmode=require
```

### 2. **Supabase**
```bash
# 1. Criar projeto: https://supabase.com
# 2. Settings > Database > Connection string
# 3. Adicionar SSL:
DATABASE_URL=postgresql://postgres.abc.supabase.co:5432/postgres?sslmode=require&pgbouncer=true
```

### 3. **Railway**
```bash
# 1. Criar projeto: https://railway.app
# 2. PostgreSQL > Connection string
DATABASE_URL=postgresql://postgres:password@containers-us-west-xxx.railway.app:5432/railway?sslmode=require
```

## 🔧 Validação de Conexão

### API de Health Check
Criei uma API para testar conexão:
```
GET /api/health
```

### Teste Local
```bash
# Testar antes do deploy
curl http://localhost:3000/api/health
```

### Teste Produção
```bash
# Após deploy
curl https://your-app.vercel.app/api/health
```

## 📋 Configuração no Vercel

### 1. Dashboard > Settings > Environment Variables
```bash
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
NEXTAUTH_SECRET=your-super-secret-nextauth-key-minimum-32-characters
NEXTAUTH_URL=https://your-app.vercel.app
NODE_ENV=production
```

### 2. Importante: Remover Prisma Accelerate
- Não usar `prisma+postgres://` no Vercel
- Usar `postgresql://` padrão
- Prisma Accelerate é para edge functions/serverless específicos

## 🚨 Troubleshooting

### Erro: Connection Refused
```bash
# Verificar:
1. SSL mode: ?sslmode=require
2. Host e porta corretos
3. Credenciais válidas
4. Firewall do provedor
```

### Erro: Timeout
```bash
# Verificar:
1. Região do banco próxima da Vercel (iad1)
2. Connection pooling configurado
3. Timeout no Prisma (30s)
```

### Erro: Authentication Failed
```bash
# Verificar:
1. User/password corretos
2. Permissões do usuário
3. Database existe
```

## 🎯 Resposta Final

**Use esta URL no Vercel:**
```bash
DATABASE_URL=postgresql://0f28e5f37e809d7c1012b940e1ce9f494b0dbfdc8bd4e0d1519aec90f689b695:sk_BDk7Rj-Mh5Hzrufr9uezK@db.prisma.io:5432/postgres?sslmode=require
```

**NÃO use a URL do Prisma Accelerate!** 🚫
