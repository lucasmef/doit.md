import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { GoogleAccountModel } from '@doit/db'
import { ensureDB } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await ensureDB()
    const doc = await GoogleAccountModel.findOne({ userId }).lean() as Record<string, unknown> | null

    if (!doc) return NextResponse.json({ account: null })

    return NextResponse.json({
      account: {
        email: doc['email'],
        connectedAt: doc['updatedAt'] ?? doc['createdAt'],
      },
    })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
