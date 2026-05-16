import { setDefaultResultOrder } from 'node:dns'
import { setDefaultAutoSelectFamily } from 'node:net'
import { google, Auth } from 'googleapis'
import { GoogleAccountModel } from '@doit/db'

export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file'
export const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events'

setDefaultResultOrder('ipv4first')
setDefaultAutoSelectFamily(false)

const CLIENT_ID = process.env['GOOGLE_CLIENT_ID'] ?? ''
const CLIENT_SECRET = process.env['GOOGLE_CLIENT_SECRET'] ?? ''
const REDIRECT_URI_ENV = process.env['GOOGLE_REDIRECT_URI'] ?? ''
const NEXTAUTH_URL = process.env['NEXTAUTH_URL'] ?? ''

function isPlaceholder(value: string): boolean {
  return /^<.*>$/.test(value.trim())
}

export function resolveRedirectUri(origin?: string): string {
  if (REDIRECT_URI_ENV && !isPlaceholder(REDIRECT_URI_ENV)) return REDIRECT_URI_ENV
  if (NEXTAUTH_URL && !isPlaceholder(NEXTAUTH_URL)) {
    return `${NEXTAUTH_URL.replace(/\/$/, '')}/api/google/callback`
  }
  if (origin) return `${origin.replace(/\/$/, '')}/api/google/callback`
  return 'http://localhost:3000/api/google/callback'
}

export function originFromRequest(req: { url: string; headers: Headers }): string {
  const xfProto = req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim()
  const xfHost = req.headers.get('x-forwarded-host')?.split(',')[0]?.trim()
  const host = xfHost || req.headers.get('host')
  if (host) {
    const proto = xfProto || (host.startsWith('localhost') ? 'http' : 'https')
    return `${proto}://${host}`
  }
  return new URL(req.url).origin
}

export function getGoogleOAuthConfigStatus(): {
  configured: boolean
  issues: string[]
} {
  const required = {
    GOOGLE_CLIENT_ID: CLIENT_ID,
    GOOGLE_CLIENT_SECRET: CLIENT_SECRET,
  }

  const issues = Object.entries(required)
    .filter(([, value]) => !value.trim() || isPlaceholder(value))
    .map(([key]) => key)

  if (CLIENT_ID && !isPlaceholder(CLIENT_ID) && !CLIENT_ID.endsWith('.apps.googleusercontent.com')) {
    issues.push('GOOGLE_CLIENT_ID')
  }

  return { configured: issues.length === 0, issues }
}

export function createOAuthClient(redirectUri?: string): Auth.OAuth2Client {
  const status = getGoogleOAuthConfigStatus()
  if (!status.configured) {
    throw new Error(`Google OAuth is not configured: ${status.issues.join(', ')}`)
  }

  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, redirectUri ?? resolveRedirectUri())
}

export function getAuthUrl(state: string | undefined, redirectUri?: string): string {
  const client = createOAuthClient(redirectUri)
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      CALENDAR_SCOPE,
      DRIVE_SCOPE,
      'https://www.googleapis.com/auth/userinfo.email',
    ],
    state,
  })
}

export async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string
  expiresAt: number
}> {
  const client = createOAuthClient()
  client.setCredentials({ refresh_token: refreshToken })
  const { credentials } = await client.refreshAccessToken()
  return {
    accessToken: credentials.access_token ?? '',
    expiresAt: credentials.expiry_date ?? Date.now() + 3600_000,
  }
}

export async function getCalendarClient(accessToken: string, refreshToken?: string) {
  const client = createOAuthClient()
  client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
  })
  return google.calendar({ version: 'v3', auth: client })
}

export type GoogleAccountRow = {
  _id?: string
  id?: string
  userId: string
  email: string
  accessToken: string
  refreshToken?: string | null
  expiresAt?: number | null
  scope?: string | null
  driveRootFolderId?: string | null
  driveInboxFolderId?: string | null
  driveTrashFolderId?: string | null
}

export function accountHasScope(account: Pick<GoogleAccountRow, 'scope'>, scope: string): boolean {
  if (!account.scope) return false
  return account.scope.split(/\s+/).includes(scope)
}

export function hasDriveScope(account: Pick<GoogleAccountRow, 'scope'>): boolean {
  return accountHasScope(account, DRIVE_SCOPE)
}

export function hasCalendarScope(account: Pick<GoogleAccountRow, 'scope'>): boolean {
  return accountHasScope(account, CALENDAR_SCOPE)
}

export async function ensureValidAccessToken(account: GoogleAccountRow): Promise<string> {
  const expiresAt = account.expiresAt ?? 0
  const skewMs = 60_000
  if (account.accessToken && expiresAt > Date.now() + skewMs) {
    return account.accessToken
  }
  if (!account.refreshToken) {
    throw new Error('GOOGLE_REAUTH_REQUIRED')
  }
  const refreshed = await refreshAccessToken(account.refreshToken)
  await GoogleAccountModel.findOneAndUpdate(
    { userId: account.userId },
    {
      $set: {
        accessToken: refreshed.accessToken,
        expiresAt: refreshed.expiresAt,
        updatedAt: new Date().toISOString(),
      },
    },
  )
  account.accessToken = refreshed.accessToken
  account.expiresAt = refreshed.expiresAt
  return refreshed.accessToken
}

export async function getDriveClient(account: GoogleAccountRow) {
  const accessToken = await ensureValidAccessToken(account)
  const client = createOAuthClient()
  client.setCredentials({
    access_token: accessToken,
    refresh_token: account.refreshToken ?? undefined,
  })
  return google.drive({ version: 'v3', auth: client })
}
