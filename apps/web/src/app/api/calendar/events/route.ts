import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { CalendarEventModel } from '@doit/db'
import { ensureDB } from '@/lib/db'

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
