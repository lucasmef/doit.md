import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ensureDB } from '@/lib/db'
import { GoogleAccountModel } from '@doit/db'
import { ensureValidAccessToken, getCalendarClient, type GoogleAccountRow } from '@/lib/google'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await ensureDB()
    const account = (await GoogleAccountModel.findOne({ userId }).lean()) as GoogleAccountRow | null
    if (!account) return NextResponse.json({ calendars: [] })

    const accessToken = await ensureValidAccessToken(account)
    const calendar = await getCalendarClient(accessToken, account.refreshToken ?? undefined)
    const { data } = await calendar.calendarList.list({
      minAccessRole: 'reader',
      showDeleted: false,
    })

    const calendars = (data.items ?? [])
      .filter((item) => item.id && item.summary)
      .map((item) => ({
        id: item.id as string,
        summary: item.summary as string,
        primary: Boolean(item.primary),
        accessRole: item.accessRole ?? undefined,
        backgroundColor: item.backgroundColor ?? undefined,
      }))

    return NextResponse.json({ calendars })
  } catch (err) {
    console.error('[GET /api/calendar/calendars]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
