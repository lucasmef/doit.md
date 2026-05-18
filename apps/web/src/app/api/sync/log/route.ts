import { NextRequest, NextResponse } from 'next/server'
import { authWithCli } from '@/lib/auth'
import { AuditLogModel } from '@doit/db'
import { newAuditId } from '@doit/core'
import type { AuditAction } from '@doit/types'
import { ensureDB } from '@/lib/db'
import { checkRateLimit, clientIp } from '@/lib/api/rate-limit'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await authWithCli(req)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const limited = await checkRateLimit({
      key: `sync:log:${userId}:${clientIp(req)}`,
      limit: 120,
      windowMs: 15 * 60_000,
    })
    if (limited) return limited

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
