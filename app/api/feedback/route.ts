import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthUser, requireRole } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// POST - Submeter formulário de feedback do SaaS
export async function POST(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    const body = await request.json()

    const {
      easeScore,
      satisfactionScore,
      mostUsedFeature,
      missingFeature,
      problems,
      bugsReported,
      continueIntent,
      notes,
      barbershopId: bodyBarbershopId,
      userName: bodyUserName,
      userEmail: bodyUserEmail,
    } = body

    // Validações essenciais
    const parsedEase = Number(easeScore)
    const parsedSat = Number(satisfactionScore)

    if (!parsedEase || parsedEase < 1 || parsedEase > 5) {
      return NextResponse.json(
        { error: 'A avaliação de facilidade (easeScore) deve ser um número entre 1 e 5' },
        { status: 400 }
      )
    }

    if (!parsedSat || parsedSat < 1 || parsedSat > 5) {
      return NextResponse.json(
        { error: 'A avaliação de satisfação (satisfactionScore) deve ser um número entre 1 e 5' },
        { status: 400 }
      )
    }

    const validIntents = ['YES', 'NO', 'MAYBE']
    const normalizedIntent = (continueIntent || '').toUpperCase().trim()
    if (!validIntents.includes(normalizedIntent)) {
      return NextResponse.json(
        { error: 'A intenção de continuar (continueIntent) deve ser YES, NO ou MAYBE' },
        { status: 400 }
      )
    }

    const barbershopId = user?.barbershopId || bodyBarbershopId || null
    const userId = user?.id || null
    const userName = user?.name || bodyUserName || null
    const userEmail = user?.email || bodyUserEmail || null

    const feedback = await prisma.tenantFeedback.create({
      data: {
        barbershopId,
        userId,
        userName,
        userEmail,
        easeScore: parsedEase,
        satisfactionScore: parsedSat,
        mostUsedFeature: mostUsedFeature ? String(mostUsedFeature).trim() : null,
        missingFeature: missingFeature ? String(missingFeature).trim() : null,
        problems: problems ? String(problems).trim() : null,
        bugsReported: bugsReported ? String(bugsReported).trim() : null,
        continueIntent: normalizedIntent,
        notes: notes ? String(notes).trim() : null,
      },
    })

    return NextResponse.json({ success: true, feedback }, { status: 201 })
  } catch (error: any) {
    console.error('Feedback POST error:', error)
    return NextResponse.json(
      { error: 'Erro ao registrar feedback', details: error?.message },
      { status: 500 }
    )
  }
}

// GET - Listar feedbacks recebidos (DEVELOPER lista todos, ADMIN lista do próprio tenant)
export async function GET(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const isDeveloper = requireRole(user, ['DEVELOPER'])
    const isAdmin = requireRole(user, ['ADMIN'])

    if (!isDeveloper && !isAdmin) {
      return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 403 })
    }

    const whereClause: any = {}
    if (!isDeveloper) {
      const tenantId = (user as any)?.barbershopId
      if (!tenantId) {
        return NextResponse.json({ error: 'Barbearia não associada' }, { status: 400 })
      }
      whereClause.barbershopId = tenantId
    }

    const feedbacks = await prisma.tenantFeedback.findMany({
      where: whereClause,
      include: {
        barbershop: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    // Resumo de métricas dos feedbacks
    const total = feedbacks.length
    const avgEase = total > 0 ? feedbacks.reduce((acc, f) => acc + f.easeScore, 0) / total : 0
    const avgSat = total > 0 ? feedbacks.reduce((acc, f) => acc + f.satisfactionScore, 0) / total : 0
    const intentCounts = {
      YES: feedbacks.filter((f) => f.continueIntent === 'YES').length,
      NO: feedbacks.filter((f) => f.continueIntent === 'NO').length,
      MAYBE: feedbacks.filter((f) => f.continueIntent === 'MAYBE').length,
    }

    return NextResponse.json({
      feedbacks,
      metrics: {
        total,
        avgEaseScore: Math.round(avgEase * 10) / 10,
        avgSatisfactionScore: Math.round(avgSat * 10) / 10,
        intentCounts,
      },
    })
  } catch (error: any) {
    console.error('Feedback GET error:', error)
    return NextResponse.json(
      { error: 'Erro ao carregar feedbacks' },
      { status: 500 }
    )
  }
}
