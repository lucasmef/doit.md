import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { GoogleAccountModel, UserModel } from '@doit/db'
import { ensureDB } from '@/lib/db'
import { createOAuthClient, originFromRequest, resolveRedirectUri } from '@/lib/google'

export const dynamic = 'force-dynamic'

function generateId() {
  return 'gac_' + Math.random().toString(36).slice(2, 10)
}

function redirectWithError(origin: string, reason: string) {
  return NextResponse.redirect(
    `${origin}/settings?tab=integrations&google=error&google_error=${encodeURIComponent(reason)}`,
  )
}

function getCallbackFailureReason(err: unknown): string {
  const errorData = (err as { response?: { data?: Record<string, unknown> } })?.response?.data
  const providerError = errorData?.['error']
  if (typeof providerError === 'string' && providerError) return providerError

  const description = errorData?.['error_description']
  const message = typeof (err as { message?: unknown })?.message === 'string'
    ? String((err as { message?: unknown }).message)
    : ''
  const detail = `${typeof description === 'string' ? description : ''} ${message}`.toLowerCase()

  if (detail.includes('redirect_uri_mismatch')) return 'redirect_uri_mismatch'
  if (detail.includes('invalid_grant')) return 'invalid_grant'
  return 'callback-failed'
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const userId = searchParams.get('state')
  const googleError = searchParams.get('error')
  const origin = originFromRequest(req)

  if (googleError) {
    console.warn('[Google OAuth callback] Google returned error:', googleError)
    return redirectWithError(origin, googleError)
  }

  if (!code || !userId) {
    return redirectWithError(origin, 'missing-code-or-state')
  }

  try {
    await ensureDB()

    const existing = (await GoogleAccountModel.findOne({ userId }).lean()) as
      | Record<string, unknown>
      | null

    const client = createOAuthClient(resolveRedirectUri(origin))
    const { tokens } = await client.getToken(code)
    client.setCredentials(tokens)

    const accessToken =
      tokens.access_token ??
      (typeof existing?.['accessToken'] === 'string' ? existing['accessToken'] : '')
    if (!accessToken) throw new Error('Google OAuth did not return an access token')

    let email = typeof existing?.['email'] === 'string' ? existing['email'] : ''
    try {
      const oauth2 = google.oauth2({ version: 'v2', auth: client })
      const { data } = await oauth2.userinfo.get()
      if (data.email) email = data.email
    } catch (err) {
      console.warn('[Google OAuth callback] Could not fetch Google user email:', err)
    }

    if (!email) {
      const user = (await UserModel.findOne({ _id: userId }).lean()) as
        | Record<string, unknown>
        | null
      email = typeof user?.['email'] === 'string' ? user['email'] : 'unknown'
    }

    const patch: Record<string, unknown> = {
      userId,
      email,
      accessToken,
      expiresAt: tokens.expiry_date ?? Date.now() + 3600_000,
      scope:
        tokens.scope ?? (typeof existing?.['scope'] === 'string' ? existing['scope'] : null),
      updatedAt: new Date().toISOString(),
    }

    if (tokens.refresh_token) {
      patch['refreshToken'] = tokens.refresh_token
    }

    await GoogleAccountModel.findOneAndUpdate(
      { userId },
      {
        $setOnInsert: { _id: generateId() },
        $set: patch,
      },
      { upsert: true, new: true },
    )

    return NextResponse.redirect(`${origin}/settings?tab=integrations&google=connected`)
  } catch (err) {
    console.error('[Google OAuth callback]', err)
    return redirectWithError(origin, getCallbackFailureReason(err))
  }
}
