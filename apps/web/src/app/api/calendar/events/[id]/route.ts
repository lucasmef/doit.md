import { NextRequest, NextResponse } from 'next/server'
import { CalendarEventModel, GoogleAccountModel } from '@doit/db'
import { auth } from '@/lib/auth'
import { ensureDB } from '@/lib/db'
import { ensureValidAccessToken, getCalendarClient, type GoogleAccountRow } from '@/lib/google'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }
type Row = Record<string, unknown>

type EventPatch = {
  title?: string
  description?: string
  start?: string
  end?: string
  allDay?: boolean
}

function addDays(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T00:00:00`)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function isDateKey(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function cleanString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed || undefined
}

function googleDateTimeBody(input: Required<Pick<EventPatch, 'start' | 'end' | 'allDay'>>) {
  if (input.allDay) {
    const startDate = input.start.slice(0, 10)
    const endDate = input.end.slice(0, 10)
    return {
      start: { date: startDate },
      end: { date: addDays(endDate || startDate, 1) },
    }
  }
  return {
    start: { dateTime: input.start },
    end: { dateTime: input.end },
  }
}

function readPatch(body: Row, current: Row): EventPatch {
  const title = cleanString(body['title'])
  const description = typeof body['description'] === 'string' ? body['description'] : undefined
  const allDay = typeof body['allDay'] === 'boolean' ? body['allDay'] : Boolean(current['allDay'])
  const start = cleanString(body['start']) ?? String(current['start'] ?? '')
  const end = cleanString(body['end']) ?? String(current['end'] ?? start)

  return {
    ...(title ? { title } : {}),
    ...(description !== undefined ? { description } : {}),
    start,
    end,
    allDay,
  }
}

async function getCalendarForUser(userId: string) {
  const account = (await GoogleAccountModel.findOne({ userId }).lean()) as GoogleAccountRow | null
  if (!account) throw new Error('Google account not connected')
  const accessToken = await ensureValidAccessToken(account)
  return getCalendarClient(accessToken, account.refreshToken ?? undefined)
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await ensureDB()
    const { id } = await params
    const current = (await CalendarEventModel.findOne({ _id: id, userId }).lean()) as Row | null
    if (!current) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

    const patch = readPatch((await req.json()) as Row, current)
    const title = patch.title ?? String(current['title'] ?? '').trim()
    if (!title) return NextResponse.json({ error: 'title required' }, { status: 400 })
    if (!patch.start || !patch.end) {
      return NextResponse.json({ error: 'start and end required' }, { status: 400 })
    }
    if (patch.allDay && (!isDateKey(patch.start.slice(0, 10)) || !isDateKey(patch.end.slice(0, 10)))) {
      return NextResponse.json({ error: 'invalid all-day date' }, { status: 400 })
    }

    const timestamp = new Date().toISOString()
    const googleEventId = current['googleEventId']
    const googleCalendarId =
      typeof current['googleCalendarId'] === 'string' ? current['googleCalendarId'] : 'primary'

    if (current['source'] === 'google' && typeof googleEventId === 'string') {
      const calendar = await getCalendarForUser(userId)
      await calendar.events.patch({
        calendarId: googleCalendarId,
        eventId: googleEventId,
        requestBody: {
          summary: title,
          description: patch.description ?? '',
          ...googleDateTimeBody({
            start: patch.start,
            end: patch.end,
            allDay: patch.allDay ?? Boolean(current['allDay']),
          }),
        },
      })
    }

    const event = await CalendarEventModel.findOneAndUpdate(
      { _id: id, userId },
      {
        title,
        description: patch.description ?? undefined,
        start: patch.start,
        end: patch.end,
        allDay: patch.allDay,
        updatedAt: timestamp,
      },
      { new: true },
    )

    return NextResponse.json({ event })
  } catch (err) {
    console.error('[PATCH /api/calendar/events/[id]]', err)
    const message = err instanceof Error ? err.message : ''
    if (message === 'Google account not connected') {
      return NextResponse.json({ error: message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await ensureDB()
    const { id } = await params
    const current = (await CalendarEventModel.findOne({ _id: id, userId }).lean()) as Row | null
    if (!current) return NextResponse.json({ error: 'Event not found' }, { status: 404 })

    const googleEventId = current['googleEventId']
    const googleCalendarId =
      typeof current['googleCalendarId'] === 'string' ? current['googleCalendarId'] : 'primary'

    if (current['source'] === 'google' && typeof googleEventId === 'string') {
      const calendar = await getCalendarForUser(userId)
      try {
        await calendar.events.delete({ calendarId: googleCalendarId, eventId: googleEventId })
      } catch (err) {
        const status = (err as { code?: number; status?: number })?.code ?? (err as { status?: number })?.status
        if (status !== 404 && status !== 410) throw err
      }
    }

    await CalendarEventModel.deleteOne({ _id: id, userId })
    return NextResponse.json({ deleted: true })
  } catch (err) {
    console.error('[DELETE /api/calendar/events/[id]]', err)
    const message = err instanceof Error ? err.message : ''
    if (message === 'Google account not connected') {
      return NextResponse.json({ error: message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
