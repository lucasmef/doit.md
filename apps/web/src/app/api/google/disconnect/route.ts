import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { GoogleAccountModel, CalendarEventModel } from '@doit/db'
import { ensureDB } from '@/lib/db'
import { createManualAuditLog } from '@/lib/api/audit-log'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await ensureDB()
    await GoogleAccountModel.findOneAndDelete({ userId })
    await CalendarEventModel.deleteMany({ userId, source: 'google' })
    await createManualAuditLog({
      userId,
      action: 'google_disconnected',
      summary: 'Conta Google desconectada.',
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
