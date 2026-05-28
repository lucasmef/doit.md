import { getServerSession } from 'next-auth'
import { cookies } from 'next/headers'
import { authOptions } from '@/auth'
import { validateCliBearer } from './cli-auth'
import { ensureDB } from './db'
import { consumeRateLimit } from './api/rate-limit'

export async function auth(): Promise<{ userId: string | null }> {
  if (process.env.NODE_ENV === 'development') {
    const c = await cookies()
    if (c.has('bypass-auth')) return { userId: 'usr_9XgemgiB' }
  }
  const session = await getServerSession(authOptions)
  return { userId: session?.user?.id ?? null }
}

export async function requireUserId(): Promise<string> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')
  return userId
}

export type AuthSource = 'web' | 'cli'

export async function authWithCli(req: Request): Promise<{
  userId: string | null
  source: AuthSource | null
}> {
  if (process.env.NODE_ENV === 'development') {
    const cookieHeader = req.headers.get('cookie') || ''
    if (cookieHeader.includes('bypass-auth=')) return { userId: 'usr_9XgemgiB', source: 'web' }
  }

  const session = await getServerSession(authOptions)
  if (session?.user?.id) return { userId: session.user.id, source: 'web' }

  const header = req.headers.get('authorization') ?? req.headers.get('Authorization')
  if (header?.toLowerCase().startsWith('bearer ')) {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      req.headers.get('x-real-ip') ||
      'unknown'
    const limited = await consumeRateLimit({
      key: `auth:cli-bearer:${ip}`,
      limit: 120,
      windowMs: 15 * 60_000,
    })
    if (limited.limited) return { userId: null, source: null }

    await ensureDB()
    const userId = await validateCliBearer(header)
    if (userId) return { userId, source: 'cli' }
  }

  return { userId: null, source: null }
}
