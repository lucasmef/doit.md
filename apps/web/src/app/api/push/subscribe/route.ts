import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { PushSubscriptionModel } from '@doit/db'
import { auth } from '@/lib/auth'
import { ensureDB } from '@/lib/db'
import { validateSubscribeRequest } from '@/lib/push'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await ensureDB()
    const input = validateSubscribeRequest(await req.json())
    if (!input) return NextResponse.json({ error: 'Invalid subscription' }, { status: 400 })

    const now = new Date().toISOString()
    const existing = (await PushSubscriptionModel.findOne({ endpoint: input.endpoint }).lean()) as Record<string, unknown> | null
    const patch = {
      userId,
      endpoint: input.endpoint,
      p256dh: input.keys.p256dh,
      auth: input.keys.auth,
      expirationTime: input.expirationTime,
      userAgent: req.headers.get('user-agent') ?? undefined,
      deviceLabel: input.deviceLabel,
      platform: input.platform,
      enabled: true,
      failureCount: 0,
      lastSeenAt: now,
      disabledAt: undefined,
      updatedAt: now,
    }

    if (existing) {
      await PushSubscriptionModel.findOneAndUpdate(
        { endpoint: input.endpoint },
        { $set: patch },
        { new: true },
      ).lean()
    } else {
      await PushSubscriptionModel.create({
        _id: `psub_${randomUUID()}`,
        ...patch,
        createdAt: now,
      })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[POST /api/push/subscribe]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
