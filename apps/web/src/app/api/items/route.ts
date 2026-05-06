import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ItemModel } from '@doit/db'
import { newItemId } from '@doit/core'
import type { CreateItemInput, Item } from '@doit/types'
import { ensureDB } from '@/lib/db'

export const dynamic = 'force-dynamic'

function mapDocToItem(doc: unknown): Item {
  const { _id, ...rest } = doc as { _id: string; [key: string]: unknown }
  return { id: _id, ...rest } as unknown as Item
}

function validateItemInput(input: Pick<CreateItemInput, 'complexity'> & Partial<CreateItemInput>) {
  if (input.complexity === 'note' && input.priority) {
    return 'priority is not allowed for notes'
  }
  return null
}

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

    return NextResponse.json({ items: items.map(mapDocToItem) })
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
    const validationError = validateItemInput(body)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const now = new Date().toISOString()
    const complexity = body.complexity ?? 'task'
    const hasInboxContext = !body.projectId && !body.dueDate && !body.scheduledDate

    const item = await ItemModel.create({
      _id: newItemId(),
      userId,
      title: body.title.trim(),
      complexity,
      status: body.status ?? (hasInboxContext ? 'inbox' : 'todo'),
      tags: body.tags ?? [],
      backlinks: [],
      priority: complexity === 'note' ? undefined : body.priority,
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

    return NextResponse.json({ item: mapDocToItem(item.toObject()) }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/items]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
