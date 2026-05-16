import { NextRequest, NextResponse } from 'next/server'
import { ensureDB } from '@/lib/db'
import { syncGoogleCalendarForAllUsers } from '@/lib/calendar-sync'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env['CRON_SECRET']
  if (!secret) return false
  const auth = req.headers.get('authorization')
  const cronSecret = req.headers.get('x-cron-secret')
  return auth === `Bearer ${secret}` || cronSecret === secret
}

export async function POST(req: NextRequest) {
  try {
    if (!isAuthorized(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    await ensureDB()
    const result = await syncGoogleCalendarForAllUsers()
    return NextResponse.json(result)
  } catch (err) {
    console.error('[POST /api/calendar/sync/cron]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
