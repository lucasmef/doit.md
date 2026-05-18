import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ensureDB } from '@/lib/db'
import { revokeCliToken } from '@/lib/cli-auth'
import { createManualAuditLog } from '@/lib/api/audit-log'

export const dynamic = 'force-dynamic'

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  await ensureDB()
  const ok = await revokeCliToken(userId, id)
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  await createManualAuditLog({
    userId,
    action: 'cli_token_revoked',
    summary: `Token CLI revogado: ${id}`,
  })
  return NextResponse.json({ ok: true })
}
