# Deploy na Vercel - Guia de Produção SaaS

## Pré-requisitos

- Conta na Vercel
- Banco PostgreSQL (Neon, Supabase ou Railway)
- Repositório no GitHub

## 1. Configuração do Banco de Dados

### PostgreSQL Cloud (Recomendado: Neon)

```bash
# 1. Criar conta no Neon
# 2. Criar novo projeto
# 3. Copiar connection string com SSL
```

**DATABASE_URL Format:**
```
postgresql://user:password@host:5432/db?sslmode=require
```

## 2. Variáveis de Ambiente na Vercel

Configure no painel da Vercel > Settings > Environment Variables:

### Obrigatórias:
```
DATABASE_URL=postgresql://user:password@host:5432/db?sslmode=require
JWT_SECRET=sua-chave-secreta-32-caracteres-minimo
NODE_ENV=production
```

### Opcionais:
```
NEXTAUTH_URL=https://seu-app.vercel.app
NEXTAUTH_SECRET=sua-chave-nextauth-32-caracteres
```

## 3. Build e Deploy

### Build Command:
```bash
npm run build
```

### Deploy Automático:
1. Conectar repositório GitHub à Vercel
2. Configurar variáveis de ambiente
3. Push para GitHub
4. Deploy automático iniciará

## 4. Migrações do Banco

### Antes do Deploy:
```bash
# Gerar Prisma Client
npx prisma generate

# Deploy migrations
npx prisma migrate deploy
```

### Após Deploy:
1. Acesse: `https://seu-app.vercel.app/api/seed`
2. Isso criará dados iniciais (barbearia, admin, serviços)

## 5. Testes Obrigatórios Pós-Deploy

### 5.1 Criar Usuário Admin
```bash
# Via API ou interface
POST /api/users
{
  "name": "Admin",
  "email": "admin@barber.com",
  "password": "senha123",
  "role": "ADMIN"
}
```

### 5.2 Testar Autenticação
- Login com usuário admin
- Verificar middleware funcionando
- Testar acesso por role

### 5.3 Testar Funcionalidades
- Criar serviços
- Criar agendamentos
- Testar fluxo público (sem login)

## 6. Monitoramento e Logs

### Vercel Dashboard:
- **Functions**: Verificar logs de API
- **Build**: Verificar erros de build
- **Analytics**: Monitorar performance

### Logs Importantes:
- Prisma connection errors
- JWT validation errors
- Foreign key constraint errors

## 7. Otimizações Produção

### 7.1 Prisma Accelerate (Opcional)
```bash
# Adicionar ao .env
PRISMA_ACCELERATE_URL=seu-accelerate-url
```

### 7.2 Connection Pooling
```json
// vercel.json
{
  "functions": {
    "app/api/**/*.ts": {
      "maxDuration": 30
    }
  }
}
```

## 8. Segurança

### 8.1 Variáveis Sensíveis
- Nunca commitar .env
- Usar secrets da Vercel
- Rotacionar chaves regularmente

### 8.2 Database Security
- SSL obrigatório
- Connection string segura
- Backup automático

## 9. Troubleshooting Comum

### 9.1 Prisma Client Error
```bash
# Verificar se prisma generate está no build
"build": "prisma generate && next build"
```

### 9.2 Foreign Key Constraint
```bash
# Verificar se barbershopId está sendo enviado
# Usar API /api/seed para criar dados base
```

### 9.3 Database Connection
```bash
# Testar connection string
# Verificar SSL mode
# Confirmar database existe
```

## 10. Escalabilidade

### 10.1 Regiões Vercel
```json
// vercel.json
{
  "regions": ["iad1"]
}
```

### 10.2 Performance
- Singleton Prisma client
- Connection pooling
- Cache estratégico

## 11. Checklist Final Deploy

- [ ] Banco PostgreSQL configurado
- [ ] Variáveis de ambiente setadas
- [ ] Build funciona localmente
- [ ] Prisma generate funciona
- [ ] Migrações aplicadas
- [ ] Seed executado
- [ ] Testes funcionando
- [ ] Logs sem erros
- [ ] Performance OK

## 12. Suporte e Manutenção

### Monitoramento:
- Vercel Analytics
- Database metrics
- Error tracking

### Backups:
- Database automático
- Código no GitHub
- Configuração versionada

---

**Status: Ready for Production SaaS Deploy**
