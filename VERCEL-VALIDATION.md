# Validar Conexão Banco - Vercel Production

## 1. Atualizar Environment Variables no Vercel

### Acessar Dashboard:
```
https://vercel.com/dashboard/weslleson22s-projects/barbeariaapp/settings/environment-variables
```

### Variáveis para Configurar:
```bash
# DATABASE_URL (IMPORTANTE - ATUALIZAR ESTA)
DATABASE_URL=prisma+postgres://accelerate.prisma-data.net/?api_key=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqd3RfaWQiOjEsInNlY3VyZV9rZXkiOiJza19CRGs3UmotTWg1SHpydWZyOXVleksiLCJhcGlfa2V5IjoiMDFLUFMzM0ZEVldUNkQ3Uk1ZTldTRzYxREEiLCJ0ZW5hbnRfaWQiOiIwZjI4ZTVmMzdlODA5ZDdjMTAxMmI5NDBlMWNlOWY0OTRiMGRiZmRjOGJkNGUwZDE1MTlhZWM5MGY2ODliNjk1IiwiaW50ZXJuYWxfc2VjcmV0IjoiNDcyY2JlZDItNDRjMC00ZGExLTk5YzgtYjc1NjU1YzQxOTA5In0.xLXh4cOjOILbAOl1H2hy5U6TgPzX8YRq8MhuFrljBB0

# Outras variáveis (manter como estão)
JWT_SECRET=barber-shop-super-secret-jwt-key-32-chars-minimum-for-production
NEXTAUTH_SECRET=barber-shop-super-secret-nextauth-key-32-chars-minimum-for-production
NEXTAUTH_URL=https://barbeariaapp.vercel.app
NODE_ENV=production
```

## 2. Deploy Automático

Após atualizar as variáveis, o Vercel fará deploy automático ou execute:
```bash
vercel --prod
```

## 3. Testar Conexão

### Teste 1: Health Check API
```bash
curl https://barbeariaapp.vercel.app/api/health
```

**Resposta Esperada:**
```json
{
  "status": "connected",
  "database": "postgres",
  "user": "postgres",
  "timestamp": "2026-04-21T20:10:00.000Z",
  "environment": "production"
}
```

**Resposta de Erro:**
```json
{
  "status": "error",
  "message": "Environment variable not found: DATABASE_URL",
  "timestamp": "2026-04-21T20:10:00.000Z"
}
```

### Teste 2: Teste de Cadastro
Acesse: https://barbeariaapp.vercel.app/register

Tente criar um usuário. Se funcionar, a conexão está OK.

### Teste 3: Verificar Logs no Vercel
```
https://vercel.com/dashboard/weslleson22s-projects/barbeariaapp/logs
```

## 4. Troubleshooting

### Erro: "Environment variable not found: DATABASE_URL"
- Verificar se DATABASE_URL foi configurada no Vercel
- Confirmar spelling exato: `DATABASE_URL`

### Erro: "the URL must start with the protocol 'prisma://'"
- Usar URL com `prisma+postgres://` 
- Não usar `postgresql://`

### Erro: Connection timeout
- Verificar API key do Prisma Data Proxy
- Confirmar que o projeto Prisma está ativo

## 5. Validação Final

### Checklist de Validação:
- [ ] DATABASE_URL configurada no Vercel
- [ ] Deploy concluído sem erros
- [ ] Health check retorna "connected"
- [ ] Cadastro de usuário funciona
- [ ] Login funciona
- [ ] Dashboard carrega dados

### URLs para Testar:
- Health: https://barbeariaapp.vercel.app/api/health
- Registro: https://barbeariaapp.vercel.app/register
- Login: https://barbeariaapp.vercel.app/login
- Dashboard: https://barbeariaapp.vercel.app/dashboard

## 6. Seed de Dados (Opcional)

Se quiser popular o banco:
```bash
curl -X POST https://barbeariaapp.vercel.app/api/seed
```

## 7. Monitoramento

Após tudo funcionando, monitore:
- Logs do Vercel
- Performance da API
- Erros de conexão
