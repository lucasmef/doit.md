import { NextRequest, NextResponse } from 'next/server'
import { authWithCli } from '@/lib/auth'
import { ensureDB } from '@/lib/db'
import { UserModel } from '@doit/db'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { userId, source } = await authWithCli(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await ensureDB()
  const user = (await UserModel.findOne({ _id: userId }).lean()) as Record<string, unknown> | null
  if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    userId,
    email: String(user['email'] ?? ''),
    name: String(user['name'] ?? user['email'] ?? ''),
    source,
  })
}
