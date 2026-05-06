import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { ItemModel } from '@doit/db'
import type { UpdateItemInput, Item } from '@doit/types'
import { ensureDB } from '@/lib/db'

type Params = { params: Promise<{ id: string }> }

function mapDocToItem(doc: any): Item {
  const { _id, ...rest } = doc
  return { id: _id, ...rest }
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await ensureDB()
    const { id } = await params

    const item = await ItemModel.findOne({ _id: id, userId }).lean()
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({ item: mapDocToItem(item) })
  } catch (err) {
    console.error('[GET /api/items/:id]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await ensureDB()
    const { id } = await params
    const body = (await req.json()) as UpdateItemInput

    const item = await ItemModel.findOneAndUpdate(
      { _id: id, userId },
      { ...body, updatedAt: new Date().toISOString() },
      { new: true },
    ).lean()

    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({ item: mapDocToItem(item) })
  } catch (err) {
    console.error('[PATCH /api/items/:id]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await ensureDB()
    const { id } = await params

    await ItemModel.findOneAndUpdate(
      { _id: id, userId },
      { status: 'archived', deletedAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
    )

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/items/:id]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
