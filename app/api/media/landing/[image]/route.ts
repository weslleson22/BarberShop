import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ image: string }> | { image: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params)
    const imageKey = resolvedParams.image

    const map: Record<string, string> = {
      dashboard: 'page dashboard.png',
      agenda: 'page agenda.png',
      'page-dashboard': 'page dashboard.png',
      'page-agenda': 'page agenda.png',
    }

    const filename = map[imageKey] || `${imageKey}.png`
    const filePath = path.join(process.cwd(), 'img', filename)

    if (!fs.existsSync(filePath)) {
      return new NextResponse('Image not found', { status: 404 })
    }

    // Auto-sync para public/img para compatibilidade estática direta
    try {
      const publicImgDir = path.join(process.cwd(), 'public', 'img')
      if (!fs.existsSync(publicImgDir)) {
        fs.mkdirSync(publicImgDir, { recursive: true })
      }
      const safeName = filename.replace(/\s+/g, '-')
      const publicDest = path.join(publicImgDir, safeName)
      if (!fs.existsSync(publicDest)) {
        fs.copyFileSync(filePath, publicDest)
      }
    } catch {}

    const buffer = fs.readFileSync(filePath)
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (err) {
    console.error('Error serving landing image:', err)
    return new NextResponse('Internal error', { status: 500 })
  }
}
