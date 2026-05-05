import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { GoogleAccountModel, CalendarEventModel } from '@doit/db'
import { ensureDB } from '@/lib/db'
import { getCalendarClient, refreshAccessToken } from '@/lib/google'
import { newEventId } from '@doit/core'

export async function POST() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await ensureDB()

    const account = await GoogleAccountModel.findOne({ userId }).lean() as Record<string, unknown> | null
    if (!account) return NextResponse.json({ error: 'Google account not connected' }, { status: 400 })

    let accessToken = account['accessToken'] as string
    const expiresAt = account['expiresAt'] as number
    const refreshToken = account['refreshToken'] as string | undefined

    // Refresh token se expirado
    if (expiresAt && Date.now() > expiresAt - 60_000 && refreshToken) {
      const refreshed = await refreshAccessToken(refreshToken)
      accessToken = refreshed.accessToken
      await GoogleAccountModel.findOneAndUpdate(
        { userId },
        { accessToken, expiresAt: refreshed.expiresAt, updatedAt: new Date().toISOString() },
      )
    }

    const calendar = await getCalendarClient(accessToken, refreshToken)

    // Listar eventos dos próximos 30 dias
    const timeMin = new Date().toISOString()
    const timeMax = new Date(Date.now() + 30 * 24 * 3600_000).toISOString()

    const { data } = await calendar.events.list({
      calendarId: 'primary',
      timeMin,
      timeMax,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 200,
    })

    const events = data.items ?? []
    let upserted = 0

    for (const ev of events) {
      if (!ev.id || !ev.summary) continue

      const start = ev.start?.dateTime ?? ev.start?.date ?? ''
      const end = ev.end?.dateTime ?? ev.end?.date ?? ''
      const allDay = !ev.start?.dateTime

      await CalendarEventModel.findOneAndUpdate(
        { googleEventId: ev.id, userId },
        {
          $setOnInsert: { _id: newEventId() },
          userId,
          title: ev.summary,
          description: ev.description ?? undefined,
          start,
          end,
          allDay,
          source: 'google',
          googleCalendarId: 'primary',
          googleEventId: ev.id,
          linkedItemIds: [],
          updatedAt: new Date().toISOString(),
        },
        { upsert: true, new: true },
      )
      upserted++
    }

    return NextResponse.json({ synced: upserted })
  } catch (err) {
    console.error('[POST /api/calendar/sync]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
