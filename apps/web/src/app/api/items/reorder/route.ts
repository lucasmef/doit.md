import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ensureDB } from '@/lib/db'
import { ItemModel } from '@doit/db'
import type { Item } from '@doit/types'

export const dynamic = 'force-dynamic'

type ReorderUpdate = {
  id: string
  order: number
}

function mapDocToItem(doc: unknown): Item {
  const { _id, ...rest } = doc as { _id: string; [key: string]: unknown }
  return { id: _id, ...rest } as unknown as Item
}

function parseUpdates(value: unknown): ReorderUpdate[] {
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => {
      if (!entry || typeof entry !== 'object') return null
      const id = (entry as Record<string, unknown>)['id']
      const order = (entry as Record<string, unknown>)['order']
      if (typeof id !== 'string' || !id) return null
      if (typeof order !== 'number' || !Number.isFinite(order)) return null
      return { id, order }
    })
    .filter((entry): entry is ReorderUpdate => entry !== null)
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await ensureDB()

    const body = (await req.json()) as { updates?: unknown }
    const updates = parseUpdates(body.updates)
    if (updates.length === 0) {
      return NextResponse.json({ error: 'updates are required' }, { status: 400 })
    }

    const ids = Array.from(new Set(updates.map((entry) => entry.id)))
    if (ids.length !== updates.length) {
      return NextResponse.json({ error: 'duplicate ids are not allowed' }, { status: 400 })
    }

    const current = await Promise.all(ids.map((id) => ItemModel.findOne({ _id: id, userId }).lean()))
    if (current.some((item) => !item)) {
      return NextResponse.json({ error: 'One or more items were not found' }, { status: 404 })
    }

    const now = new Date().toISOString()
    const updated: Item[] = []

    for (const entry of updates) {
      const item = await ItemModel.findOneAndUpdate(
        { _id: entry.id, userId },
        { $set: { order: entry.order, updatedAt: now } },
        { new: true },
      ).lean()
      if (item) updated.push(mapDocToItem(item))
    }

    return NextResponse.json({ items: updated })
  } catch (err) {
    console.error('[PATCH /api/items/reorder]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
