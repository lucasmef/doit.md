import { NextRequest, NextResponse } from 'next/server'
import { authWithCli } from '@/lib/auth'
import { PendingChangeModel } from '@doit/db'
import { ensureDB } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { userId } = await authWithCli(req)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await ensureDB()

    const changes = await PendingChangeModel.find({ userId }).sort({ createdAt: -1 }).lean()

    return NextResponse.json({ changes })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
