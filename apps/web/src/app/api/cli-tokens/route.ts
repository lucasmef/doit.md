import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ensureDB } from '@/lib/db'
import { generateCliToken, listCliTokens } from '@/lib/cli-auth'
import { checkRateLimit, clientIp } from '@/lib/api/rate-limit'
import { createManualAuditLog } from '@/lib/api/audit-log'

export const dynamic = 'force-dynamic'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await ensureDB()
  const tokens = await listCliTokens(userId)
  return NextResponse.json({ tokens })
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const limited = await checkRateLimit({
    key: `cli-token:create:${userId}:${clientIp(req)}`,
    limit: 10,
    windowMs: 60 * 60_000,
  })
  if (limited) return limited

  const body = (await req.json().catch(() => ({}))) as { name?: string }
  const name = (body.name ?? '').toString().slice(0, 80)
  if (!name.trim()) return NextResponse.json({ error: 'Nome obrigatorio' }, { status: 400 })

  await ensureDB()
  const { token, plaintext } = await generateCliToken(userId, name)
  await createManualAuditLog({
    userId,
    action: 'cli_token_created',
    summary: `Token CLI criado: ${token.id}`,
  })
  return NextResponse.json({ token, plaintext })
}
