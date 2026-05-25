import { NextResponse } from 'next/server'
import { PushSubscriptionModel } from '@doit/db'
import { auth } from '@/lib/auth'
import { ensureDB } from '@/lib/db'
import { isPushConfigured, sendPush } from '@/lib/push'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function dedupeRows(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  const seen = new Set<string>()
  const result: Record<string, unknown>[] = []
  for (const row of rows) {
    const key = `${String(row['platform'] ?? 'unknown')}:${String(row['deviceLabel'] ?? row['endpoint'])}`
    if (seen.has(key)) continue
    seen.add(key)
    result.push(row)
  }
  return result
}

export async function POST() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!isPushConfigured()) return NextResponse.json({ error: 'Web Push is not configured' }, { status: 503 })

    await ensureDB()
    const rows = (await PushSubscriptionModel.find({ userId, enabled: 1 }).lean()) as Record<string, unknown>[]
    const devices = dedupeRows(rows.sort((left, right) => String(right['updatedAt']).localeCompare(String(left['updatedAt']))))
    const payload = {
      title: 'doit.md',
      body: 'Notificacoes ativadas.',
      url: '/today',
      tag: `doit-test-${Date.now()}`,
      renotify: true,
    }

    const results = await Promise.all(devices.map((row) => sendPush(row, payload)))
    const sent = results.filter((result) => result === 'sent').length
    const invalid = results.filter((result) => result === 'invalid').length
    const failed = results.filter((result) => result === 'failed').length

    return NextResponse.json({ sent, invalid, failed })
  } catch (err) {
    console.error('[POST /api/push/test]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
