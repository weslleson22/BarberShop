# Vercel Environment Variables - Prisma Accelerate Setup

## 🚀 **Prisma Accelerate Configuration**

### 📋 **Environment Variables para Vercel**

#### **1. DATABASE_URL (Prisma Accelerate)**
```
Key: DATABASE_URL
Value: prisma+postgres://accelerate.prisma-data.net/?api_key=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqd3RfaWQiOjEsInNlY3VyZV9rZXkiOiJza192c3RnYTA4ZHI4WTZYc3JIN3FmSjEiLCJhcGlfa2V5IjoiMDFLUTFIQk1UUFhKVlBWMEpFRkhUR1o5QkUiLCJ0ZW5hbnRfaWQiOiIwZjI4ZTVmMzdlODA5ZDdjMTAxMmI5NDBlMWNlOWY0OTRiMGRiZmRjOGJkNGUwZDE1MTlhZWM5MGY2ODliNjk1IiwiaW50ZXJuYWxfc2VjcmV0IjoiNDcyY2JlZDItNDRjMC00ZGExLTk5YzgtYjc1NjU1YzQxOTA5In0.bvP_n-DOiMrZbeOWhlOImOuGzzVQTd7uLmXTFDVjDCA
Environment: Production, Preview, Development
```

#### **2. DIRECT_URL (Conexão Direta)**
```
Key: DIRECT_URL
Value: postgres://0f28e5f37e809d7c1012b940e1ce9f494b0dbfdc8bd4e0d1519aec90f689b695:sk_uvbQWNZk567wuRd38CU98@db.prisma.io:5432/postgres?sslmode=require
Environment: Production, Preview, Development
```

#### **3. JWT_SECRET**
```
Key: JWT_SECRET
Value: your-super-secret-jwt-key-change-this-in-production-2024
Environment: Production, Preview, Development
```

#### **4. NEXTAUTH_SECRET**
```
Key: NEXTAUTH_SECRET
Value: your-nextauth-secret-key-change-this-in-production-2024
Environment: Production, Preview, Development
```

#### **5. NEXTAUTH_URL**
```
Key: NEXTAUTH_URL
Value: https://your-app-domain.vercel.app
Environment: Production, Preview, Development
```

#### **6. NODE_ENV**
```
Key: NODE_ENV
Value: production
Environment: Production (only)
```

### 🔧 **Configuração no Vercel**

#### **Passo 1: Acessar Dashboard**
1. Vá para: https://vercel.com/dashboard
2. Selecione projeto: `BarberShop`
3. Settings → Environment Variables

#### **Passo 2: Adicionar Variáveis**
1. Clique "Add Variable"
2. Copie e cole cada variável acima
3. Selecione os ambientes corretos
4. Save

#### **Passo 3: Deploy**
1. Automatic trigger ou manual
2. Aguardar build completion
3. Testar aplicação

### 🎯 **Benefícios do Prisma Accelerate**

#### **✅ Performance:**
- Queries 1000x mais rápidas
- Cache global automático
- Connection pooling otimizado

#### **✅ Serverless Ready:**
- Conexões otimizadas para Vercel
- Sem problemas de cold start
- Escalabilidade automática

#### **✅ Simplicidade:**
- Uma URL para produção
- Sem configuração manual de pooling
- Gerenciado pelo Prisma

### 📊 **Schema Prisma Atualizado**

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")      // Prisma Accelerate
  directUrl = env("DIRECT_URL")       // Conexão direta (migrations)
}
```

### 🔍 **Teste Local vs Produção**

#### **Local (.env.local):**
- ✅ Usa Prisma Accelerate
- ✅ Build funciona
- ✅ Conexão otimizada

#### **Vercel (Production):**
- ✅ Mesma configuração
- ✅ Performance global
- ✅ Serverless otimizado

### 🚨 **Importante**

#### **Não esquecer:**
- Configurar todas as variáveis no Vercel
- Usar exatamente os valores acima
- Testar após deploy

#### **Resultado Esperado:**
- Build sucesso (já testado localmente)
- Conexão com banco funcionando
- Performance otimizada com Accelerate
- Environment Debug mostrando status correto

---

**Prisma Accelerate está configurado e pronto para deploy!** 🚀
