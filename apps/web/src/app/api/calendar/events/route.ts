import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { CalendarEventModel, GoogleAccountModel, ItemModel } from '@doit/db'
import { ensureDB } from '@/lib/db'
import { getCalendarClient, refreshAccessToken } from '@/lib/google'
import { newEventId } from '@doit/core'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await ensureDB()

    const { searchParams } = new URL(req.url)
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    const query: Record<string, unknown> = { userId }
    if (from || to) {
      query['start'] = {}
      if (from) (query['start'] as Record<string, string>)['$gte'] = from
      if (to) (query['start'] as Record<string, string>)['$lte'] = to
    }

    const events = await CalendarEventModel.find(query).sort({ start: 1 }).lean()

    return NextResponse.json({ events })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await ensureDB()

    const { itemId } = (await req.json()) as { itemId: string }
    if (!itemId) return NextResponse.json({ error: 'itemId required' }, { status: 400 })

    const item = await ItemModel.findOne({ _id: itemId, userId }).lean() as Record<string, unknown> | null
    if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 })

    const dueDate = item['dueDate'] as string | undefined
    if (!dueDate) return NextResponse.json({ error: 'Item has no dueDate' }, { status: 400 })

    const account = await GoogleAccountModel.findOne({ userId }).lean() as Record<string, unknown> | null
    if (!account) return NextResponse.json({ error: 'Google account not connected' }, { status: 400 })

    let accessToken = account['accessToken'] as string
    const expiresAt = account['expiresAt'] as number
    const refreshToken = account['refreshToken'] as string | undefined

    if (expiresAt && Date.now() > expiresAt - 60_000 && refreshToken) {
      const refreshed = await refreshAccessToken(refreshToken)
      accessToken = refreshed.accessToken
      await GoogleAccountModel.findOneAndUpdate(
        { userId },
        { accessToken, expiresAt: refreshed.expiresAt, updatedAt: new Date().toISOString() },
      )
    }

    const calendar = await getCalendarClient(accessToken, refreshToken)

    const eventBody = {
      summary: item['title'] as string,
      description: (item['contentMd'] as string | undefined) ?? '',
      start: { date: dueDate },
      end: { date: dueDate },
    }

    const { data: created } = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: eventBody,
    })

    if (!created.id) return NextResponse.json({ error: 'Failed to create event' }, { status: 500 })

    // Salva localmente para aparecer no calendário sem precisar de sync
    const saved = await CalendarEventModel.findOneAndUpdate(
      { googleEventId: created.id, userId },
      {
        $setOnInsert: { _id: newEventId() },
        userId,
        title: created.summary ?? (item['title'] as string),
        description: created.description ?? undefined,
        start: dueDate,
        end: dueDate,
        allDay: true,
        source: 'google',
        googleCalendarId: 'primary',
        googleEventId: created.id,
        linkedItemIds: [itemId],
        updatedAt: new Date().toISOString(),
      },
      { upsert: true, new: true },
    )

    return NextResponse.json({ event: saved })
  } catch (err) {
    console.error('[POST /api/calendar/events]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
