import { NextRequest, NextResponse } from 'next/server'
import { PushSubscriptionModel } from '@doit/db'
import type { PushStatusResponse } from '@doit/types'
import { auth } from '@/lib/auth'
import { ensureDB } from '@/lib/db'
import { isPushConfigured } from '@/lib/push'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await ensureDB()
    const endpoint = new URL(req.url).searchParams.get('endpoint')
    const rows = (await PushSubscriptionModel.find({ userId, enabled: 1 }).sort({ updatedAt: -1 }).lean()) as Record<string, unknown>[]
    const current = endpoint ? rows.find((row) => row['endpoint'] === endpoint) : null

    const response: PushStatusResponse = {
      configured: isPushConfigured(),
      subscribed: Boolean(current),
      activeDeviceCount: rows.length,
      currentDeviceEnabled: Boolean(current),
      devices: rows.map((row) => ({
        id: String(row['_id'] ?? row['id']),
        deviceLabel: (row['deviceLabel'] as string | null | undefined) ?? null,
        platform: (row['platform'] as string | null | undefined) ?? null,
        lastSeenAt: (row['lastSeenAt'] as string | null | undefined) ?? null,
        createdAt: String(row['createdAt']),
      })),
    }

    return NextResponse.json(response)
  } catch (err) {
    console.error('[GET /api/push/status]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
