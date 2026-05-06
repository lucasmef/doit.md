import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { AreaModel } from '@doit/db'
import type { UpdateAreaInput } from '@doit/types'
import { ensureDB } from '@/lib/db'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await ensureDB()
    const { id } = await params
    const body = (await req.json()) as UpdateAreaInput

    const area = await AreaModel.findOneAndUpdate(
      { _id: id, userId },
      { ...body, updatedAt: new Date().toISOString() },
      { new: true },
    ).lean()

    if (!area) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ area })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await ensureDB()
    const { id } = await params
    await AreaModel.findOneAndDelete({ _id: id, userId })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
