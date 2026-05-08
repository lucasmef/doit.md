import { NextRequest, NextResponse } from 'next/server'
import { PushSubscriptionModel } from '@doit/db'
import type { PushUnsubscribeRequest } from '@doit/types'
import { auth } from '@/lib/auth'
import { ensureDB } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await ensureDB()
    const body = (await req.json()) as Partial<PushUnsubscribeRequest>
    if (typeof body.endpoint !== 'string') {
      return NextResponse.json({ error: 'endpoint is required' }, { status: 400 })
    }

    const now = new Date().toISOString()
    await PushSubscriptionModel.findOneAndUpdate(
      { userId, endpoint: body.endpoint },
      {
        $set: {
          enabled: false,
          disabledAt: now,
          updatedAt: now,
        },
      },
      { new: true },
    ).lean()

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[POST /api/push/unsubscribe]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
