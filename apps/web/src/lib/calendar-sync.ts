import { CalendarEventModel, GoogleAccountModel } from '@doit/db'
import { newEventId } from '@doit/core'
import { ensureValidAccessToken, getCalendarClient, type GoogleAccountRow } from '@/lib/google'

type Row = Record<string, unknown>

const DEFAULT_CALENDAR_ID = 'primary'
const WRITABLE_ROLES = new Set(['owner', 'writer'])

function addDays(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T00:00:00`)
  date.setDate(date.getDate() + days)
  return date.toISOString().slice(0, 10)
}

function normalizeCalendarEnd(start: string, end: string, allDay: boolean): string {
  if (!allDay) return end
  if (!end || end === start) return start
  return addDays(end, -1)
}

export async function syncGoogleCalendarForUser(
  userId: string,
  options: { calendarId?: string; lookAheadDays?: number; lookBackDays?: number } = {},
): Promise<{ synced: number; removed: number }> {
  const account = (await GoogleAccountModel.findOne({ userId }).lean()) as GoogleAccountRow | null
  if (!account) throw new Error('Google account not connected')

  const requestedCalendarId = options.calendarId
  const lookAheadDays = options.lookAheadDays ?? 90
  const lookBackDays = options.lookBackDays ?? 30
  const now = Date.now()
  const timeMin = new Date(now - lookBackDays * 24 * 3600_000).toISOString()
  const timeMax = new Date(now + lookAheadDays * 24 * 3600_000).toISOString()

  const accessToken = await ensureValidAccessToken(account)
  const calendar = await getCalendarClient(accessToken, account.refreshToken ?? undefined)

  const calendarIds = requestedCalendarId
    ? [requestedCalendarId]
    : await listSyncableCalendarIds(calendar)

  let synced = 0
  let removed = 0

  for (const calendarId of calendarIds) {
    const result = await syncGoogleCalendar(calendar, userId, calendarId, timeMin, timeMax)
    synced += result.synced
    removed += result.removed
  }

  return { synced, removed }
}

async function listSyncableCalendarIds(
  calendar: Awaited<ReturnType<typeof getCalendarClient>>,
): Promise<string[]> {
  try {
    const { data } = await calendar.calendarList.list({
      minAccessRole: 'reader',
      showDeleted: false,
    })
    const ids = (data.items ?? [])
      .filter(
        (item) =>
          item.id &&
          (!item.accessRole || item.accessRole === 'reader' || WRITABLE_ROLES.has(item.accessRole)),
      )
      .map((item) => item.id as string)
    return ids.length > 0 ? ids : [DEFAULT_CALENDAR_ID]
  } catch {
    return [DEFAULT_CALENDAR_ID]
  }
}

async function syncGoogleCalendar(
  calendar: Awaited<ReturnType<typeof getCalendarClient>>,
  userId: string,
  calendarId: string,
  timeMin: string,
  timeMax: string,
): Promise<{ synced: number; removed: number }> {
  const { data } = await calendar.events.list({
    calendarId,
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 2500,
  })

  const events = data.items ?? []
  const seenGoogleIds = new Set<string>()
  const timestamp = new Date().toISOString()
  let synced = 0

  for (const ev of events) {
    if (!ev.id || ev.status === 'cancelled') continue
    const title = ev.summary?.trim()
    if (!title) continue

    const start = ev.start?.dateTime ?? ev.start?.date ?? ''
    const rawEnd = ev.end?.dateTime ?? ev.end?.date ?? ''
    if (!start || !rawEnd) continue

    const allDay = !ev.start?.dateTime
    const end = normalizeCalendarEnd(start, rawEnd, allDay)
    seenGoogleIds.add(ev.id)

    await CalendarEventModel.findOneAndUpdate(
      { googleEventId: ev.id, googleCalendarId: calendarId, userId },
      {
        $setOnInsert: { _id: newEventId() },
        userId,
        title,
        description: ev.description ?? undefined,
        start,
        end,
        allDay,
        source: 'google',
        googleCalendarId: calendarId,
        googleEventId: ev.id,
        updatedAt: timestamp,
      },
      { upsert: true, new: true },
    )
    synced++
  }

  const localEvents = (await CalendarEventModel.find({
    userId,
    source: 'google',
    googleCalendarId: calendarId,
    start: { $gte: timeMin, $lte: timeMax },
  }).lean()) as Row[]

  let removed = 0
  for (const localEvent of localEvents) {
    const googleEventId = localEvent['googleEventId']
    if (typeof googleEventId !== 'string' || seenGoogleIds.has(googleEventId)) continue
    const eventId = localEvent['_id'] ?? localEvent['id']
    if (typeof eventId !== 'string') continue
    await CalendarEventModel.deleteOne({ _id: eventId, userId })
    removed++
  }

  return { synced, removed }
}

export async function syncGoogleCalendarForAllUsers(): Promise<{
  users: number
  synced: number
  removed: number
  failed: number
}> {
  const accounts = (await GoogleAccountModel.find({}).lean()) as GoogleAccountRow[]
  let synced = 0
  let removed = 0
  let failed = 0

  for (const account of accounts) {
    try {
      const result = await syncGoogleCalendarForUser(account.userId)
      synced += result.synced
      removed += result.removed
    } catch (err) {
      failed++
      console.error('[calendar sync cron] user sync failed', { userId: account.userId, err })
    }
  }

  return { users: accounts.length, synced, removed, failed }
}
