import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/api-auth'
import { exportUserData } from '@/lib/privacy/lgpd-service'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET - Baixar arquivo JSON completo de dados do titular (Portabilidade / Art. 18 LGPD)
export async function GET(request: NextRequest) {
  try {
    const user = getAuthUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const exportData = await exportUserData(user.id)

    const response = new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="dados-pessoais-${user.id}-${Date.now()}.json"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    })

    return response
  } catch (error) {
    console.error('Erro na exportação de dados do titular:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao exportar dados pessoais' },
      { status: 500 }
    )
  }
}
