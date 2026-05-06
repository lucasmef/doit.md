import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'

export async function auth(): Promise<{ userId: string | null }> {
  const session = await getServerSession(authOptions)
  return { userId: session?.user?.id ?? null }
}

export async function requireUserId(): Promise<string> {
  const { userId } = await auth()
  if (!userId) throw new Error('Unauthorized')
  return userId
}
