# 🚀 Vercel Deploy Checklist - Barber Shop SaaS

## 📋 Pré-Deploy Checklist

### ✅ 1. Repositório GitHub
- [ ] Código atualizado no branch main
- [ ] `.gitignore` configurado corretamente
- [ ] Sem dados sensíveis no repositório

### ✅ 2. Configuração Vercel
- [ ] `vercel.json` corrigido (framework: "nextjs")
- [ ] Build script validado: `prisma generate && next build`
- [ ] Functions com timeout de 30s

### ✅ 3. Variáveis de Ambiente
- [ ] Copiar variáveis do arquivo `.env.vercel`
- [ ] Configurar no Dashboard Vercel > Settings > Environment Variables
- [ ] DATABASE_URL com PostgreSQL cloud + SSL
- [ ] JWT_SECRET com 32+ caracteres
- [ ] NEXTAUTH_SECRET com 32+ caracteres
- [ ] NEXTAUTH_URL com domínio Vercel

## 🔧 Configuração no Vercel Dashboard

### 1. Environment Variables
```bash
# Acessar: https://vercel.com/dashboard > Projeto > Settings > Environment Variables

DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters
NEXTAUTH_SECRET=your-super-secret-nextauth-key-minimum-32-characters
NEXTAUTH_URL=https://your-app.vercel.app
NODE_ENV=production
```

### 2. Deploy Commands
```bash
# Deploy para produção
vercel --prod

# Verificar deploy
vercel logs
```

## 🗄️ Pós-Deploy

### 1. Migrações do Banco
```bash
# Executar após primeiro deploy
npx prisma migrate deploy
```

### 2. Seed de Dados Iniciais
```bash
# Popular banco com dados base
curl -X POST https://your-app.vercel.app/api/seed
```

### 3. Testes Obrigatórios
- [ ] Login de usuário ADMIN
- [ ] Registro de novo usuário
- [ ] Criação de serviços
- [ ] Agendamentos
- [ ] Dashboard funcional
- [ ] Role-based access working

## 🏗️ Build Configuration

### vercel.json (Atualizado)
```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install && npx prisma generate",
  "framework": "nextjs",
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  },
  "env": {
    "PRISMA_GENERATE_DATAPROXY": "true"
  },
  "build": {
    "env": {
      "PRISMA_GENERATE_DATAPROXY": "true"
    }
  },
  "regions": ["iad1"]
}
```

## 🌐 PostgreSQL Cloud Options

### Neon (Recomendado)
1. Criar conta: https://neon.tech
2. Criar projeto PostgreSQL
3. Copiar connection string com SSL
4. Configurar em DATABASE_URL

### Supabase
1. Criar projeto: https://supabase.com
2. Settings > Database > Connection string
3. Adicionar ?sslmode=require ao final

### Railway
1. Criar projeto: https://railway.app
2. PostgreSQL > Connection string
3. Copiar URL completa

## 🎯 URLs Importantes

- **Dashboard Vercel**: https://vercel.com/dashboard
- **Projeto Settings**: https://vercel.com/dashboard/weslleson22s-projects/barbeariaapp/settings
- **Environment Variables**: https://vercel.com/dashboard/weslleson22s-projects/barbeariaapp/settings/environment-variables
- **Deploy Logs**: https://vercel.com/dashboard/weslleson22s-projects/barbeariaapp/logs

## 🚨 Troubleshooting

### Build Errors
- Verificar `vercel.json` framework: "nextjs"
- Validar build script em package.json
- Checar variáveis de ambiente

### Database Connection
- Confirmar SSL em DATABASE_URL
- Testar connection string localmente
- Verificar IP whitelist no provedor

### Authentication Issues
- Validar NEXTAUTH_URL
- Checar JWT_SECRET e NEXTAUTH_SECRET
- Confirmar cookies configuration

## 📊 Status Final

**🟢 READY FOR VERCEL DEPLOY**

✅ Build local funcionando  
✅ TypeScript limpo  
✅ Vercel.json corrigido  
✅ Environment variables preparadas  
✅ Checklist completo  

**Próximo passo:** `vercel --prod` 🚀
