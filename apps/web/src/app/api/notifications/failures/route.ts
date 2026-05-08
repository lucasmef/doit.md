import { NextRequest, NextResponse } from 'next/server'
import { NotificationAlertModel } from '@doit/db'
import { auth } from '@/lib/auth'
import { ensureDB } from '@/lib/db'

export const dynamic = 'force-dynamic'

type AlertRow = Record<string, unknown>

function mapAlert(row: AlertRow) {
  const { _id, ...rest } = row
  return { id: _id, ...rest }
}

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await ensureDB()
    const rows = (await NotificationAlertModel.find({ userId, acknowledgedAt: null })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean()) as AlertRow[]

    return NextResponse.json({ alerts: rows.map(mapAlert) })
  } catch (err) {
    console.error('[GET /api/notifications/failures]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await ensureDB()
    const body = (await req.json()) as { id?: string; all?: boolean }
    const now = new Date().toISOString()

    if (body.all) {
      const rows = (await NotificationAlertModel.find({ userId, acknowledgedAt: null }).lean()) as AlertRow[]
      await Promise.all(
        rows.map((row) =>
          NotificationAlertModel.findOneAndUpdate(
            { _id: String(row['_id']), userId },
            { $set: { acknowledgedAt: now } },
          ).lean(),
        ),
      )
      return NextResponse.json({ ok: true, acknowledged: rows.length })
    }

    if (!body.id) return NextResponse.json({ error: 'id is required' }, { status: 400 })
    await NotificationAlertModel.findOneAndUpdate(
      { _id: body.id, userId },
      { $set: { acknowledgedAt: now } },
    ).lean()

    return NextResponse.json({ ok: true, acknowledged: 1 })
  } catch (err) {
    console.error('[PATCH /api/notifications/failures]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
