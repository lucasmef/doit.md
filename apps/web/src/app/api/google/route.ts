import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getAuthUrl, getGoogleOAuthConfigStatus } from '@/lib/google'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const config = getGoogleOAuthConfigStatus()
  if (!config.configured) {
    console.error('[GET /api/google] Google OAuth env invalid:', config.issues.join(', '))
    return NextResponse.redirect(new URL('/settings?google=config-error', req.url))
  }

  const url = getAuthUrl(userId)
  return NextResponse.redirect(url)
}
