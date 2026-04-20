# Barbershop Scheduler

Sistema completo de agendamento e gestão para barbearias, desenvolvido com Next.js 14, TypeScript, Prisma e PostgreSQL.

## 🚀 Funcionalidades

### Para Clientes
- ✅ Agendamento online em 3 passos simples
- ✅ Visualização de serviços disponíveis
- ✅ Escolha de barbeiro e horário
- ✅ Histórico de agendamentos
- ✅ Reagendamento fácil
- ✅ Não exige login para primeiro agendamento

### Para Barbearias (Admin/Barbeiros)
- ✅ Dashboard com métricas em tempo real
- ✅ Gestão completa de agenda
- ✅ Controle de clientes e histórico
- ✅ CRUD de serviços
- ✅ Controle financeiro
- ✅ Validação automática de conflitos de horário
- ✅ Multi-tenant (suporte a múltiplas barbearias)

### Técnicas
- ✅ Arquitetura multi-tenant
- ✅ Autenticação JWT com RBAC
- ✅ PWA (Progressive Web App)
- ✅ Mobile-first design
- ✅ Offline support
- ✅ TypeScript
- ✅ API Routes + Server Actions

## 🛠️ Tecnologias

- **Frontend**: Next.js 14 (App Router), React 18, TypeScript
- **Styling**: TailwindCSS
- **Backend**: Next.js API Routes, Server Actions
- **Database**: PostgreSQL com Prisma ORM
- **Auth**: JWT com middleware RBAC
- **PWA**: Service Worker + Manifest
- **Icons**: Lucide React

## 📋 Pré-requisitos

- Node.js 18+ 
- PostgreSQL 14+
- npm ou yarn

## 🚀 Instalação

1. **Clone o repositório**
```bash
git clone <repository-url>
cd barbershop-scheduler
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure as variáveis de ambiente**
```bash
cp .env.example .env
```

Edite o arquivo `.env`:
```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/barbershop_db"

# JWT
JWT_SECRET="your-super-secret-jwt-key-here"

# NextAuth (opcional)
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret"
```

4. **Configure o banco de dados**
```bash
# Gere o Prisma Client
npx prisma generate

# Execute as migrações
npx prisma db push

# (Opcional) Abra o Prisma Studio
npx prisma studio
```

5. **Inicie o servidor de desenvolvimento**
```bash
npm run dev
```

Acesse `http://localhost:3000`

## 📁 Estrutura do Projeto

```
├── app/                    # Next.js App Router
│   ├── api/               # API Routes
│   │   ├── auth/         # Autenticação
│   │   ├── appointments/ # Agendamentos
│   │   ├── services/     # Serviços
│   │   └── clients/      # Clientes
│   ├── dashboard/         # Painel admin
│   ├── agendar/          # Agendamento público
│   └── layout.tsx        # Layout principal
├── lib/                   # Utilitários
│   ├── auth.ts           # Funções de autenticação
│   ├── prisma.ts         # Cliente Prisma
│   ├── appointment-scheduler.ts # Lógica de agendamento
│   └── prisma-examples.ts # Exemplos de queries
├── prisma/               # Schema e migrações
│   └── schema.prisma    # Modelo de dados
├── public/               # Arquivos estáticos
│   ├── manifest.json     # PWA manifest
│   └── sw.js           # Service Worker
└── components/          # Componentes React
```

## 🔐 Autenticação e RBAC

O sistema usa JWT para autenticação com controle de acesso baseado em roles (RBAC):

### Roles disponíveis:
- **ADMIN**: Acesso completo à barbearia
- **BARBER**: Acesso à agenda e clientes
- **CLIENT**: Acesso apenas ao agendamento

### Middleware de proteção:
```typescript
// Exemplo de rota protegida
export async function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value
  
  if (!token && isProtectedRoute(request.nextUrl.pathname)) {
    return NextResponse.redirect('/login')
  }
  
  // Verifica role para rotas específicas
  const decoded = verifyToken(token)
  if (!hasRequiredRole(decoded.role, request.nextUrl.pathname)) {
    return NextResponse.redirect('/dashboard')
  }
}
```

## 📅 Lógica de Agendamento

### Validação de Conflitos
O sistema impede agendamentos conflitantes:

```typescript
export async function verificarDisponibilidade(
  barberId: string,
  startTime: Date,
  duration: number
): Promise<{ available: boolean; conflict?: any }> {
  const endTime = new Date(startTime.getTime() + duration * 60000)
  
  // Busca agendamentos existentes no mesmo período
  const existingAppointments = await prisma.appointment.findMany({
    where: {
      barberId,
      status: { in: ['PENDING', 'CONFIRMED'] },
      OR: [
        { startTime: { lt: endTime, gte: startTime } },
        { endTime: { gt: startTime, lte: endTime } }
      ]
    }
  })
  
  return { available: existingAppointments.length === 0 }
}
```

### Fluxo de Agendamento (3 passos):
1. **Escolher serviço** - Lista de serviços com preço e duração
2. **Escolher barbeiro** - Barbeiros disponíveis
3. **Escolher horário** - Horários disponíveis baseados na duração do serviço

## 🏗️ Arquitetura Multi-tenant

Cada barbearia tem dados completamente isolados:

```prisma
model Barbershop {
  id          String @id @default(cuid())
  name        String
  email       String @unique
  
  // Relacionamentos
  users       User[]
  clients     Client[]
  services    Service[]
  appointments Appointment[]
  payments    Payment[]
}

model Appointment {
  id            String @id @default(cuid())
  startTime     DateTime
  endTime       DateTime
  status        AppointmentStatus @default(PENDING)
  
  // Multi-tenant
  barbershopId  String
  barbershop    Barbershop @relation(fields: [barbershopId], references: [id])
  
  // Outros relacionamentos...
}
```

## 📱 PWA Features

### Service Worker
- Cache de recursos estáticos
- Suporte offline
- Sincronização em background

### Manifest
- Instalação como app nativo
- Ícones adaptativos
- Splash screen

### Meta tags
```html
<meta name="theme-color" content="#0ea5e9" />
<meta name="mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-capable" content="yes" />
```

## 🔧 Exemplos de Queries Prisma

### Dashboard Stats
```typescript
export async function getDashboardStats(barbershopId: string) {
  const [todayAppointments, todayRevenue, totalClients] = await Promise.all([
    prisma.appointment.count({
      where: {
        barbershopId,
        startTime: { gte: startOfDay, lte: endOfDay }
      }
    }),
    prisma.payment.aggregate({
      where: {
        barbershopId,
        status: 'PAID',
        paidAt: { gte: startOfDay, lte: endOfDay }
      },
      _sum: { amount: true }
    }),
    prisma.client.count({ where: { barbershopId } })
  ])
  
  return { todayAppointments, todayRevenue, totalClients }
}
```

### Verificar Disponibilidade
```typescript
export async function checkAppointmentConflict(
  barbershopId: string,
  barberId: string,
  startTime: Date,
  endTime: Date
) {
  return prisma.appointment.findMany({
    where: {
      barbershopId,
      barberId,
      status: { in: ['PENDING', 'CONFIRMED'] },
      OR: [
        { startTime: { lt: endTime, gte: startTime } },
        { endTime: { gt: startTime, lte: endTime } }
      ]
    }
  })
}
```

## 🚀 Deploy

### Vercel (Recomendado)
1. Conecte seu repositório ao Vercel
2. Configure as variáveis de ambiente
3. Deploy automático

### Railway/Render
1. Configure o PostgreSQL
2. Set DATABASE_URL
3. Deploy da aplicação

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 🧪 Testes

### Exemplo de teste de agendamento
```typescript
import { verificarDisponibilidade } from '@/lib/appointment-scheduler'

describe('Appointment Scheduler', () => {
  it('should detect time conflicts', async () => {
    // Cria agendamento existente
    await createAppointment({
      startTime: new Date('2024-01-01T10:00:00'),
      duration: 30
    })
    
    // Tenta criar agendamento conflitante
    const result = await verificarDisponibilidade(
      'barber-id',
      new Date('2024-01-01T10:15:00'),
      30
    )
    
    expect(result.available).toBe(false)
  })
})
```

## 📊 Relatórios

### Faturamento Diário
```typescript
const dailyRevenue = await prisma.payment.aggregate({
  where: {
    barbershopId,
    status: 'PAID',
    paidAt: { gte: startOfDay, lt: endOfDay }
  },
  _sum: { amount: true },
  _count: { id: true }
})
```

### Serviços Populares
```typescript
const popularServices = await prisma.appointment.groupBy({
  by: ['serviceId'],
  where: {
    barbershopId,
    status: 'COMPLETED'
  },
  _count: { serviceId: true },
  orderBy: { _count: { serviceId: 'desc' } },
  take: 5
})
```

## 🔒 Segurança

- **JWT tokens** com expiração
- **Password hashing** com bcrypt
- **RBAC middleware** para proteção de rotas
- **Input validation** com Zod
- **SQL injection prevention** com Prisma
- **CORS configuration**
- **Rate limiting** (recomendado em produção)

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/amazing-feature`)
3. Commit suas mudanças (`git commit -m 'Add amazing feature'`)
4. Push para a branch (`git push origin feature/amazing-feature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está licenciado sob a MIT License.

## 🆘 Suporte

- 📧 Email: support@barbershop-scheduler.com
- 📖 Documentação: docs.barbershop-scheduler.com
- 🐛 Issues: github.com/your-repo/issues

---

## 🎯 Roadmap Futuro

- [ ] Notificações push
- [ ] Integração com calendários (Google, Outlook)
- [ ] Relatórios avançados
- [ ] Sistema de avaliações
- [ ] Integração com gateways de pagamento
- [ ] App mobile nativo
- [ ] Multi-idioma
- [ ] Temas customizáveis
