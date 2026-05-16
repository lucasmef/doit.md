import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ensureDB } from '@/lib/db'
import { syncGoogleCalendarForUser } from '@/lib/calendar-sync'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await ensureDB()
    const result = await syncGoogleCalendarForUser(userId)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[POST /api/calendar/sync]', err)
    const message = err instanceof Error ? err.message : ''
    if (message === 'Google account not connected') {
      return NextResponse.json({ error: message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
