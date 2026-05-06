import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { AuditLogModel } from '@doit/db'
import { ensureDB } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await ensureDB()

    const { searchParams } = new URL(req.url)
    const limit = Math.min(Number(searchParams.get('limit') ?? 50), 200)
    const itemId = searchParams.get('itemId')

    const query: Record<string, unknown> = { userId }
    if (itemId) query['itemId'] = itemId

    const logs = await AuditLogModel.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean()

    return NextResponse.json({ logs })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
