import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { GoogleAccountModel, CalendarEventModel } from '@doit/db'
import { ensureDB } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await ensureDB()
    await GoogleAccountModel.findOneAndDelete({ userId })
    await CalendarEventModel.deleteMany({ userId, source: 'google' })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
