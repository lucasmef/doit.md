import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import { validateCliBearer } from './cli-auth'
import { ensureDB } from './db'

export async function auth(): Promise<{ userId: string | null }> {
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
  const session = await getServerSession(authOptions)
  if (session?.user?.id) return { userId: session.user.id, source: 'web' }

  const header = req.headers.get('authorization') ?? req.headers.get('Authorization')
  if (header?.toLowerCase().startsWith('bearer ')) {
    await ensureDB()
    const userId = await validateCliBearer(header)
    if (userId) return { userId, source: 'cli' }
  }

  return { userId: null, source: null }
}
