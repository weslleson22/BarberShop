import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { isAvatarProxyUrl } from '@/lib/media'

export const dynamic = 'force-dynamic'

/**
 * GET /api/media/avatar/:id
 * Serve o avatar de um único usuário. Busca apenas uma linha/coluna, então
 * não sofre com o limite de 5MB do Prisma Accelerate que as listagens tinham.
 * Avatares já são exibidos publicamente (ex.: equipe na página /b/[slug]).
 */
export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    if (!id) return new NextResponse(null, { status: 404 })

    const user = await prisma.user.findUnique({
      where: { id },
      select: { avatar: true },
    })

    const avatar = user?.avatar?.trim()
    if (!avatar || isAvatarProxyUrl(avatar)) {
      return new NextResponse(null, { status: 404 })
    }

    // Data URL (formato atual dos uploads): decodifica e devolve os bytes
    if (avatar.startsWith('data:')) {
      const match = avatar.match(/^data:([^;,]+)?((?:;[^;,]+)*?)(;base64)?,([\s\S]*)$/)
      if (!match) return new NextResponse(null, { status: 404 })

      const mime = match[1] || 'application/octet-stream'
      if (!mime.startsWith('image/')) return new NextResponse(null, { status: 404 })

      const isBase64 = Boolean(match[3])
      const payload = match[4]
      const body = isBase64
        ? Buffer.from(payload, 'base64')
        : Buffer.from(decodeURIComponent(payload), 'utf-8')

      return new NextResponse(new Uint8Array(body), {
        status: 200,
        headers: {
          'Content-Type': mime,
          'Content-Length': String(body.length),
          // A URL carrega ?v=<updatedAt>, então pode ser cacheada por longo prazo
          'Cache-Control': 'public, max-age=31536000, immutable',
          'X-Content-Type-Options': 'nosniff',
        },
      })
    }

    // URL externa ou caminho relativo: apenas redireciona
    if (/^https?:\/\//i.test(avatar) || avatar.startsWith('/')) {
      const target = new URL(avatar, request.url)
      const res = NextResponse.redirect(target, 302)
      res.headers.set('Cache-Control', 'public, max-age=3600')
      return res
    }

    return new NextResponse(null, { status: 404 })
  } catch (error) {
    console.error('[API /api/media/avatar GET] Erro ao servir avatar:', error)
    return new NextResponse(null, { status: 404 })
  }
}
