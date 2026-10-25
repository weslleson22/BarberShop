import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/api-auth'
import {
  getAllTutorialsAsync,
  createTutorialAsync,
  updateTutorialAsync,
  deleteTutorialAsync,
} from '@/lib/developer-tutorials'

export const dynamic = 'force-dynamic'
export const revalidate = 0

// GET - Listar tutoriais cadastrados
export async function GET() {
  try {
    const tutorials = await getAllTutorialsAsync()
    return NextResponse.json({ tutorials })
  } catch (error: any) {
    console.error('[TUTORIALS_GET_ERR]', error)
    return NextResponse.json({ error: 'Erro ao carregar tutoriais.' }, { status: 500 })
  }
}

// POST - Criar novo tutorial com vídeo do YouTube (restrito a DEVELOPER)
export async function POST(request: NextRequest) {
  try {
    const authUser = getAuthUser(request)
    if (!authUser?.id || authUser.role !== 'DEVELOPER') {
      return NextResponse.json(
        { error: 'Acesso restrito ao Administrador da Plataforma (DEVELOPER).' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { title, category, description, youtubeUrl, duration, order } = body

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'O título do tutorial é obrigatório.' }, { status: 400 })
    }

    if (!youtubeUrl || !youtubeUrl.trim()) {
      return NextResponse.json(
        { error: 'O link do vídeo do YouTube é obrigatório.' },
        { status: 400 }
      )
    }

    const newTutorial = await createTutorialAsync({
      title: title.trim(),
      category: category?.trim() || 'Geral',
      description: description?.trim() || '',
      youtubeUrl: youtubeUrl.trim(),
      duration: duration?.trim() || '3 min',
      order: Number(order) || 1,
    })

    return NextResponse.json({
      success: true,
      tutorial: newTutorial,
      message: 'Tutorial em vídeo cadastrado com sucesso!',
    })
  } catch (error: any) {
    console.error('[TUTORIALS_POST_ERR]', error)
    return NextResponse.json({ error: 'Erro ao cadastrar tutorial.' }, { status: 500 })
  }
}

// PUT - Atualizar tutorial existente (restrito a DEVELOPER)
export async function PUT(request: NextRequest) {
  try {
    const authUser = getAuthUser(request)
    if (!authUser?.id || authUser.role !== 'DEVELOPER') {
      return NextResponse.json(
        { error: 'Acesso restrito ao Administrador da Plataforma (DEVELOPER).' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { id, title, category, description, youtubeUrl, duration, order } = body

    if (!id) {
      return NextResponse.json({ error: 'O id do tutorial é obrigatório.' }, { status: 400 })
    }

    const updated = await updateTutorialAsync(id, {
      ...(title && { title: title.trim() }),
      ...(category && { category: category.trim() }),
      ...(description !== undefined && { description: description.trim() }),
      ...(youtubeUrl && { youtubeUrl: youtubeUrl.trim() }),
      ...(duration && { duration: duration.trim() }),
      ...(order !== undefined && { order: Number(order) }),
    })

    if (!updated) {
      return NextResponse.json({ error: 'Tutorial não encontrado.' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      tutorial: updated,
      message: 'Tutorial atualizado com sucesso!',
    })
  } catch (error: any) {
    console.error('[TUTORIALS_PUT_ERR]', error)
    return NextResponse.json({ error: 'Erro ao atualizar tutorial.' }, { status: 500 })
  }
}

// DELETE - Remover tutorial (restrito a DEVELOPER)
export async function DELETE(request: NextRequest) {
  try {
    const authUser = getAuthUser(request)
    if (!authUser?.id || authUser.role !== 'DEVELOPER') {
      return NextResponse.json(
        { error: 'Acesso restrito ao Administrador da Plataforma (DEVELOPER).' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'O id do tutorial é obrigatório.' }, { status: 400 })
    }

    const deleted = await deleteTutorialAsync(id)
    if (!deleted) {
      return NextResponse.json({ error: 'Tutorial não encontrado.' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      message: 'Tutorial removido com sucesso.',
    })
  } catch (error: any) {
    console.error('[TUTORIALS_DELETE_ERR]', error)
    return NextResponse.json({ error: 'Erro ao remover tutorial.' }, { status: 500 })
  }
}
