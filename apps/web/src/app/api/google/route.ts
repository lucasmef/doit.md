import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getAuthUrl, getGoogleOAuthConfigStatus, originFromRequest, resolveRedirectUri } from '@/lib/google'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const origin = originFromRequest(req)
  const config = getGoogleOAuthConfigStatus()
  if (!config.configured) {
    console.error('[GET /api/google] Google OAuth env invalid:', config.issues.join(', '))
    return NextResponse.redirect(`${origin}/settings?google=config-error`)
  }

  const redirectUri = resolveRedirectUri(origin)
  const url = getAuthUrl(userId, redirectUri)
  return NextResponse.redirect(url)
}
