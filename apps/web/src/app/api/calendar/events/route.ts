import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { CalendarEventModel, GoogleAccountModel, ItemModel } from '@doit/db'
import { ensureDB } from '@/lib/db'
import { ensureValidAccessToken, getCalendarClient, type GoogleAccountRow } from '@/lib/google'
import { newEventId } from '@doit/core'

export const dynamic = 'force-dynamic'

function addDays(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T00:00:00`)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function cleanString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed || undefined
}

function googleDateTimeBody(input: { start: string; end: string; allDay: boolean }) {
  if (input.allDay) {
    const startDate = input.start.slice(0, 10)
    const endDate = input.end.slice(0, 10) || startDate
    return {
      start: { date: startDate },
      end: { date: addDays(endDate, 1) },
    }
  }
  return {
    start: { dateTime: input.start },
    end: { dateTime: input.end },
  }
}

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
    const linkedItemIds = new Set<string>()
    for (const event of events) {
      const ids = Array.isArray(event['linkedItemIds']) ? event['linkedItemIds'] : []
      for (const id of ids) {
        if (typeof id === 'string') linkedItemIds.add(id)
      }
    }

    if (linkedItemIds.size === 0) return NextResponse.json({ events })

    const linkedItems = await ItemModel.find({ userId }).lean()
    const blockedItemIds = new Set(
      linkedItems
        .filter((item) => linkedItemIds.has(String(item['_id'] ?? item['id'])))
        .filter((item) => item['status'] === 'archived' || item['status'] === 'done')
        .map((item) => String(item['_id'] ?? item['id'])),
    )
    const visibleEvents = events.filter((event) => {
      const ids = Array.isArray(event['linkedItemIds']) ? event['linkedItemIds'] : []
      return !ids.some((id) => typeof id === 'string' && blockedItemIds.has(id))
    })

    return NextResponse.json({ events: visibleEvents })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await ensureDB()

    const body = (await req.json()) as Record<string, unknown>
    const itemId = cleanString(body['itemId'])
    const calendarId = cleanString(body['calendarId']) ?? 'primary'
    const timestamp = new Date().toISOString()

    let title = cleanString(body['title'])
    let description = typeof body['description'] === 'string' ? body['description'] : ''
    let start = cleanString(body['start'])
    let end = cleanString(body['end'])
    let allDay = typeof body['allDay'] === 'boolean' ? body['allDay'] : false
    let linkedItemIds: string[] = []

    if (itemId) {
      const item = (await ItemModel.findOne({ _id: itemId, userId }).lean()) as Record<
        string,
        unknown
      > | null
      if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 })

      const dueDate = item['dueDate'] as string | undefined
      if (!dueDate) return NextResponse.json({ error: 'Item has no dueDate' }, { status: 400 })

      title = cleanString(item['title']) ?? title
      description = (item['contentMd'] as string | undefined) ?? description
      start = dueDate
      end = dueDate
      allDay = true
      linkedItemIds = [itemId]
    }

    if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 })
    if (!start || !end)
      return NextResponse.json({ error: 'start and end required' }, { status: 400 })

    const account = (await GoogleAccountModel.findOne({ userId }).lean()) as GoogleAccountRow | null
    if (!account)
      return NextResponse.json({ error: 'Google account not connected' }, { status: 400 })

    const accessToken = await ensureValidAccessToken(account)
    const calendar = await getCalendarClient(accessToken, account.refreshToken ?? undefined)

    const { data: created } = await calendar.events.insert({
      calendarId,
      requestBody: {
        summary: title,
        description,
        ...googleDateTimeBody({ start, end, allDay }),
      },
    })

    if (!created.id) return NextResponse.json({ error: 'Failed to create event' }, { status: 500 })

    // Salva localmente para aparecer no calendário sem precisar de sync
    const saved = await CalendarEventModel.findOneAndUpdate(
      { googleEventId: created.id, googleCalendarId: calendarId, userId },
      {
        $setOnInsert: { _id: newEventId() },
        userId,
        title: created.summary ?? title,
        description: created.description ?? undefined,
        start,
        end,
        allDay,
        source: 'google',
        googleCalendarId: calendarId,
        googleEventId: created.id,
        linkedItemIds,
        updatedAt: timestamp,
      },
      { upsert: true, new: true },
    )

    return NextResponse.json({ event: saved })
  } catch (err) {
    console.error('[POST /api/calendar/events]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
