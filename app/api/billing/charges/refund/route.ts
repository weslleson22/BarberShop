import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, requireRole } from '@/lib/api-auth'
import { refundAbacateCharge } from '@/lib/billing/abacatepay-provider'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// POST - Reembolsar cobrança na AbacatePay
export async function POST(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!requireRole(user, ['DEVELOPER', 'ADMIN'])) {
      return NextResponse.json(
        { error: 'Acesso restrito' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { chargeId } = body

    if (!chargeId) {
      return NextResponse.json({ error: 'chargeId é obrigatório' }, { status: 400 })
    }

    // Validação estrita de Multi-Tenant: Admin só pode reembolsar cobranças da sua própria barbearia
    if (user.role !== 'DEVELOPER' && user.barbershopId) {
      const localInv = await prisma.invoice.findFirst({
        where: {
          OR: [{ id: chargeId }, { providerInvoiceId: chargeId }],
        },
      })
      if (localInv && localInv.barbershopId !== user.barbershopId) {
        return NextResponse.json(
          { error: 'Acesso negado: cobrança pertence a outra barbearia' },
          { status: 403 }
        )
      }
    }

    // Se for mock sandbox de teste
    if (chargeId.includes('_dev_') || chargeId.includes('sim_')) {
      return NextResponse.json({
        success: true,
        message: 'Reembolso simulado realizado com sucesso (Sandbox)',
        chargeId,
        status: 'REFUNDED',
      })
    }

    const result = await refundAbacateCharge(chargeId)
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Erro ao processar reembolso na AbacatePay' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Reembolso aprovado e processado com sucesso na AbacatePay',
      chargeId,
      status: 'REFUNDED',
      data: result.data,
    })
  } catch (error: any) {
    console.error('Erro no reembolso:', error)
    return NextResponse.json(
      { error: error?.message || 'Falha ao processar reembolso' },
      { status: 500 }
    )
  }
}
