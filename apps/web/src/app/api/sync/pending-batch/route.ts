import { NextRequest, NextResponse } from 'next/server'
import { authWithCli } from '@/lib/auth'
import { PendingChangeModel } from '@doit/db'
import { ensureDB } from '@/lib/db'
import type { PendingChange } from '@doit/types'

export const dynamic = 'force-dynamic'

function normalizeChangeForKey(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeChangeForKey)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const key of Object.keys(value).sort()) {
      if (['_id', 'id', 'userId', 'approved', 'createdAt', 'riskLevel'].includes(key)) continue
      out[key] = normalizeChangeForKey((value as Record<string, unknown>)[key])
    }
    return out
  }
  return value
}

function changeKey(change: PendingChange): string {
  return JSON.stringify(normalizeChangeForKey(change))
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await authWithCli(req)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await ensureDB()

    const { changes } = (await req.json()) as { changes: PendingChange[] }
    if (!Array.isArray(changes)) {
      return NextResponse.json({ error: 'changes must be an array' }, { status: 400 })
    }

    const previousChanges = (await PendingChangeModel.find({ userId }).lean()) as PendingChange[]
    const previousById = new Map(previousChanges.map((c) => [c.id, c]))
    const previousByKey = new Map(previousChanges.map((c) => [changeKey(c), c]))

    // Remove pendentes anteriores deste usuário e insere os novos
    await PendingChangeModel.deleteMany({ userId })

    if (changes.length > 0) {
      const docs = changes
        .filter((c) => c.userId === userId)
        .map((c) => {
          const previous = previousById.get(c.id) ?? previousByKey.get(changeKey(c))
          return {
            ...c,
            _id: c.id,
            approved: previous?.approved ?? false,
            createdAt: previous?.createdAt ?? c.createdAt,
          }
        })
      await PendingChangeModel.insertMany(docs)
    }

    return NextResponse.json({ inserted: changes.length })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
