import { NextRequest, NextResponse } from 'next/server'
import { ItemModel, FolderModel } from '@doit/db'
import { newItemId } from '@doit/core'
import { USER_AGENTS_TAG, USER_AGENTS_TITLE } from '@doit/core'
import type { Item } from '@doit/types'
import { auth } from '@/lib/auth'
import { ensureDB } from '@/lib/db'

export const dynamic = 'force-dynamic'

function mapDocToItem(doc: unknown): Item {
  const { _id, ...rest } = doc as { _id: string; [key: string]: unknown }
  return { id: _id, ...rest } as unknown as Item
}

function normalizeFolderId(value: string | null | undefined): string | undefined {
  if (!value || value === 'global' || value === 'null') return undefined
  return value
}

async function findAgentsItem(userId: string, folderId: string | undefined) {
  const candidates = await ItemModel.find({
    userId,
    title: USER_AGENTS_TITLE,
    folderId: folderId ?? null,
    deletedAt: null,
  }).lean()

  return candidates.find(
    (item: Record<string, unknown>) =>
      Array.isArray(item['tags']) && item['tags'].includes(USER_AGENTS_TAG),
  )
}

async function ensureFolder(userId: string, folderId: string | undefined) {
  if (!folderId) return true
  const folder = await FolderModel.findOne({ _id: folderId, userId }).lean()
  return Boolean(folder)
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await ensureDB()
    const folderId = normalizeFolderId(new URL(req.url).searchParams.get('folderId'))
    const item = await findAgentsItem(userId, folderId)
    return NextResponse.json({ item: item ? mapDocToItem(item) : null })
  } catch (err) {
    console.error('[GET /api/agents]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await ensureDB()
    const body = (await req.json()) as { folderId?: string | null; contentMd?: string }
    const folderId = normalizeFolderId(body.folderId ?? undefined)
    if (!(await ensureFolder(userId, folderId))) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
    }

    const now = new Date().toISOString()
    const contentMd = body.contentMd ?? ''
    const existing = await findAgentsItem(userId, folderId)

    if (existing) {
      const id = String(existing['_id'] ?? existing['id'])
      const item = await ItemModel.findOneAndUpdate(
        { _id: id, userId },
        {
          title: USER_AGENTS_TITLE,
          contentMd,
          complexity: 'document',
          status: 'todo',
          tags: Array.from(
            new Set([...((existing['tags'] as string[] | undefined) ?? []), USER_AGENTS_TAG]),
          ),
          folderId: folderId ?? null,
          updatedAt: now,
          deletedAt: null,
        },
        { new: true },
      ).lean()
      return NextResponse.json({ item: item ? mapDocToItem(item) : null })
    }

    const item = await ItemModel.create({
      _id: newItemId(),
      userId,
      title: USER_AGENTS_TITLE,
      contentMd,
      complexity: 'document',
      status: 'todo',
      tags: [USER_AGENTS_TAG],
      backlinks: [],
      folderId,
      createdAt: now,
      updatedAt: now,
    })

    return NextResponse.json({ item: mapDocToItem(item.toObject()) }, { status: 201 })
  } catch (err) {
    console.error('[PUT /api/agents]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
