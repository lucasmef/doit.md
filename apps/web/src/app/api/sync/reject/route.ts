import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { PendingChangeModel } from '@doit/db'
import { ensureDB } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await ensureDB()

    const { id } = (await req.json()) as { id: string }
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

    await PendingChangeModel.findOneAndDelete({ _id: id, userId })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
