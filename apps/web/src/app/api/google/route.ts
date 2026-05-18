import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getAuthUrl, getGoogleOAuthConfigStatus, originFromRequest, resolveRedirectUri } from '@/lib/google'
import { createGoogleOAuthState } from '@/lib/api/oauth-state'
import { checkRateLimit, clientIp } from '@/lib/api/rate-limit'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const limited = await checkRateLimit({
    key: `google:start:${clientIp(req)}`,
    limit: 20,
    windowMs: 15 * 60_000,
  })
  if (limited) return limited

  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const origin = originFromRequest(req)
  const config = getGoogleOAuthConfigStatus()
  if (!config.configured) {
    console.error('[GET /api/google] Google OAuth env invalid:', config.issues.join(', '))
    return NextResponse.redirect(`${origin}/settings?google=config-error`)
  }

  const redirectUri = resolveRedirectUri(origin)
  const oauthState = createGoogleOAuthState(userId)
  const url = getAuthUrl(oauthState.state, redirectUri)
  const res = NextResponse.redirect(url)
  res.cookies.set(oauthState.cookieName, oauthState.nonce, {
    httpOnly: true,
    sameSite: 'lax',
    secure: origin.startsWith('https://'),
    path: '/api/google/callback',
    maxAge: oauthState.maxAge,
  })
  return res
}
