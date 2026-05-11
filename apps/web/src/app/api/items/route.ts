import { NextRequest, NextResponse } from 'next/server'
import { auth, authWithCli } from '@/lib/auth'
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

function titleFromNoteContent(contentMd: string | undefined) {
  const firstLine = contentMd?.split(/\r?\n/).find((line) => line.trim())?.trim() ?? ''
  return firstLine.replace(/^#{1,6}\s+/, '').replace(/[*_`[\]]/g, '').trim()
}

function matchesSearch(item: Record<string, unknown>, q: string) {
  const needle = q.toLocaleLowerCase('pt-BR')
  const tags = Array.isArray(item['tags']) ? item['tags'].join(' ') : ''
  const haystack = [
    item['title'],
    item['contentMd'],
    tags,
  ].filter(Boolean).join(' ').toLocaleLowerCase('pt-BR')
  return haystack.includes(needle)
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await authWithCli(req)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await ensureDB()

    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const folderIdParam = searchParams.get('folderId')
    const q = searchParams.get('q')?.trim()

    const query: Record<string, unknown> = { userId }
    if (status === 'archived') query['status'] = 'archived'
    else if (status === 'closed') {
      // Filter below; the local SQL adapter does not support Mongo's $in operator.
    } else {
      query['deletedAt'] = null
      if (status) query['status'] = status
    }
    if (folderIdParam !== null) {
      query['folderId'] = folderIdParam === 'null' || folderIdParam === '' ? null : folderIdParam
    }

    const rows = await ItemModel.find(query).lean()
    const filtered = rows.filter((item: Record<string, unknown>) => {
      if (status === 'closed' && item['status'] !== 'done' && item['status'] !== 'archived') return false
      if (q && !matchesSearch(item, q)) return false
      return true
    })
    filtered.sort((a: Record<string, unknown>, b: Record<string, unknown>) => {
      const ao = typeof a['order'] === 'number' ? (a['order'] as number) : Number.POSITIVE_INFINITY
      const bo = typeof b['order'] === 'number' ? (b['order'] as number) : Number.POSITIVE_INFINITY
      if (ao !== bo) return ao - bo
      const au = String(a['updatedAt'] ?? '')
      const bu = String(b['updatedAt'] ?? '')
      return bu.localeCompare(au)
    })

    return NextResponse.json({ items: filtered.map(mapDocToItem) })
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
    const complexity = body.complexity ?? 'task'
    const title = complexity === 'note' ? titleFromNoteContent(body.contentMd) : body.title?.trim()
    if (!title && complexity !== 'note') {
      return NextResponse.json({ error: 'title is required' }, { status: 400 })
    }
    const finalTitle = title ?? ''
    const validationError = validateItemInput(body)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const now = new Date().toISOString()
    const hasInboxContext = !body.folderId && !body.dueDate && !body.scheduledDate

    const item = await ItemModel.create({
      _id: newItemId(),
      userId,
      title: finalTitle,
      complexity,
      status: body.status ?? (hasInboxContext ? 'inbox' : 'todo'),
      tags: body.tags ?? [],
      backlinks: [],
      priority: complexity === 'note' ? undefined : body.priority,
      dueDate: body.dueDate,
      dueTime: complexity === 'note' ? undefined : body.dueTime,
      recurrence: complexity === 'note' ? undefined : body.recurrence,
      startDate: body.startDate,
      scheduledDate: body.scheduledDate,
      folderId: body.folderId,
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
