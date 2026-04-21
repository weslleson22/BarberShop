# Importação para Vercel - Guia Rápido

## Arquivo Pronto para Copiar e Colar

Use o arquivo `.env.vercel-final` para importação direta no Vercel.

## Passo a Passo

### 1. Acessar Vercel Dashboard
```
https://vercel.com/dashboard/weslleson22s-projects/barbeariaapp/settings/environment-variables
```

### 2. Copiar Variáveis do `.env.vercel-final`

#### DATABASE_URL (Escolher uma opção):
- **Opção 1**: `prisma+postgres://accelerate.prisma-data.net/?api_key=SUA_API_KEY_AQUI`
- **Opção 2**: `postgresql://user:password@host:5432/database?sslmode=require`

#### Secrets (Gerar novos):
```bash
JWT_SECRET=prod-secret-key-32-chars-minimum-unique-CHANGE-THIS
NEXTAUTH_SECRET=prod-nextauth-secret-32-chars-minimum-unique-CHANGE-THIS
```

#### Configuração:
```bash
NEXTAUTH_URL=https://barbeariaapp.vercel.app
NODE_ENV=production
```

### 3. Colar no Vercel
- Adicionar cada variável como Environment Variable
- Setar ambientes: Production, Preview, Development
- Clicar Save

### 4. Deploy
```bash
vercel --prod
```

### 5. Validar
```bash
curl https://barbeariaapp.vercel.app/api/diagnostic
```

## Respostas Esperadas

### Sucesso:
```json
{
  "database": {
    "hasUrl": true,
    "isPrismaProtocol": true,
    "hasApiKey": true
  },
  "connection": {
    "status": "connected",
    "latency": "45ms"
  }
}
```

### Erro:
```json
{
  "database": {
    "hasUrl": false
  },
  "recommendations": [
    {
      "priority": "critical",
      "issue": "DATABASE_URL não encontrada"
    }
  ]
}
```

## Dicas

- Use secrets únicos (32+ caracteres)
- Teste com `/api/diagnostic` antes de usar app
- Use Prisma Data Proxy para melhor performance
- Configure SSL para PostgreSQL direto
