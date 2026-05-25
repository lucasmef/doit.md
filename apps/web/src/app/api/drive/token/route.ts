import { NextRequest, NextResponse } from 'next/server'
import { authWithCli } from '@/lib/auth'
import { ensureDB } from '@/lib/db'
import { GoogleAccountModel } from '@doit/db'
import {
  ensureValidAccessToken,
  hasDriveScope,
  type GoogleAccountRow,
} from '@/lib/google'
import { getOrCreateRootFolder, getOrCreateInboxFolder } from '@/lib/drive'
import { google } from 'googleapis'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { userId } = await authWithCli(req)
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await ensureDB()
  const account = (await GoogleAccountModel.findOne({ userId }).lean()) as
    | GoogleAccountRow
    | null
  if (!account) {
    return NextResponse.json(
      { error: 'Google not connected', needsReauth: true },
      { status: 412 },
    )
  }
  if (!hasDriveScope(account)) {
    return NextResponse.json(
      { error: 'Drive scope missing', needsReauth: true },
      { status: 412 },
    )
  }

  try {
    const accessToken = await ensureValidAccessToken(account)
    const oauth = new google.auth.OAuth2()
    oauth.setCredentials({ access_token: accessToken })
    const drive = google.drive({ version: 'v3', auth: oauth })
    const rootFolderId = await getOrCreateRootFolder(drive, account)
    const inboxFolderId = await getOrCreateInboxFolder(drive, account)

    return NextResponse.json({
      accessToken,
      expiresAt: account.expiresAt ?? null,
      rootFolderId,
      inboxFolderId,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    if (message === 'GOOGLE_REAUTH_REQUIRED') {
      return NextResponse.json(
        { error: 'Reauth required', needsReauth: true },
        { status: 412 },
      )
    }
    console.error('[GET /api/drive/token]', err)
    return NextResponse.json({ error: 'Drive token error' }, { status: 500 })
  }
}
