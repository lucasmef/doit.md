import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { PendingChangeModel } from '@doit/db'
import { ensureDB } from '@/lib/db'
import type { PendingChange } from '@doit/types'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await ensureDB()

    const { changes } = (await req.json()) as { changes: PendingChange[] }
    if (!Array.isArray(changes)) {
      return NextResponse.json({ error: 'changes must be an array' }, { status: 400 })
    }

    // Remove pendentes anteriores deste usuário e insere os novos
    await PendingChangeModel.deleteMany({ userId })

    if (changes.length > 0) {
      const docs = changes
        .filter((c) => c.userId === userId)
        .map((c) => ({ ...c, _id: c.id, approved: false }))
      await PendingChangeModel.insertMany(docs)
    }

    return NextResponse.json({ inserted: changes.length })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
