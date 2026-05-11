import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { GoogleAccountModel } from '@doit/db'
import { ensureDB } from '@/lib/db'
import { createOAuthClient } from '@/lib/google'

export const dynamic = 'force-dynamic'

function generateId() {
  return 'gac_' + Math.random().toString(36).slice(2, 10)
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get('code')
  const userId = searchParams.get('state')

  if (!code || !userId) {
    return NextResponse.redirect(new URL('/settings?google=error', req.url))
  }

  try {
    await ensureDB()

    const client = createOAuthClient()
    const { tokens } = await client.getToken(code)
    client.setCredentials(tokens)

    // Obter email do usuário
    const oauth2 = google.oauth2({ version: 'v2', auth: client })
    const { data } = await oauth2.userinfo.get()
    const email = data.email ?? 'unknown'

    await GoogleAccountModel.findOneAndUpdate(
      { userId },
      {
        $setOnInsert: { _id: generateId() },
        userId,
        email,
        accessToken: tokens.access_token ?? '',
        refreshToken: tokens.refresh_token,
        expiresAt: tokens.expiry_date ?? Date.now() + 3600_000,
        scope: tokens.scope,
        updatedAt: new Date().toISOString(),
      },
      { upsert: true, new: true },
    )

    return NextResponse.redirect(new URL('/settings?google=connected', req.url))
  } catch (err) {
    console.error('[Google OAuth callback]', err)
    return NextResponse.redirect(new URL('/settings?google=error', req.url))
  }
}
