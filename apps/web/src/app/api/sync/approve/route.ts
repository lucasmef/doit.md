import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { PendingChangeModel } from '@clarity/db'
import { ensureDB } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await ensureDB()

    const { id } = (await req.json()) as { id: string }
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    const change = await PendingChangeModel.findOneAndUpdate(
      { _id: id, userId },
      { approved: true },
      { new: true },
    ).lean()

    if (!change) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({ change })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
