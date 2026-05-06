import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { AuditLogModel } from '@doit/db'
import { newAuditId } from '@doit/core'
import type { AuditAction } from '@doit/types'
import { ensureDB } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await ensureDB()

    const body = (await req.json()) as { action: AuditAction; summary: string; itemId?: string }

    await AuditLogModel.create({
      _id: newAuditId(),
      userId,
      source: 'sync-agent',
      action: body.action,
      itemId: body.itemId,
      summary: body.summary,
      createdAt: new Date().toISOString(),
    })

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
