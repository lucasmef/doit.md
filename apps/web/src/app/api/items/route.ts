import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { ItemModel } from '@clarity/db'
import { newItemId } from '@clarity/core'
import type { CreateItemInput } from '@clarity/types'
import { ensureDB } from '@/lib/db'

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await ensureDB()

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const projectId = searchParams.get('projectId')

    const query: Record<string, unknown> = { userId, deletedAt: null }
    if (status) query['status'] = status
    if (projectId) query['projectId'] = projectId

    const items = await ItemModel.find(query).sort({ updatedAt: -1 }).lean()

    return NextResponse.json({ items })
  } catch (err) {
    console.error('[GET /api/items]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await ensureDB()

    const body = (await req.json()) as CreateItemInput
    if (!body.title?.trim()) {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }

    const now = new Date().toISOString()
    const item = await ItemModel.create({
      _id: newItemId(),
      userId,
      title: body.title.trim(),
      complexity: body.complexity ?? 'capture',
      status: body.status ?? 'inbox',
      tags: body.tags ?? [],
      backlinks: [],
      priority: body.priority,
      dueDate: body.dueDate,
      startDate: body.startDate,
      scheduledDate: body.scheduledDate,
      projectId: body.projectId,
      areaId: body.areaId,
      parentId: body.parentId,
      contentMd: body.contentMd,
      createdAt: now,
      updatedAt: now,
    })

    return NextResponse.json({ item }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/items]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
