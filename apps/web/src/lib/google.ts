import { google, Auth } from 'googleapis'

const CLIENT_ID = process.env['GOOGLE_CLIENT_ID'] ?? ''
const CLIENT_SECRET = process.env['GOOGLE_CLIENT_SECRET'] ?? ''
const REDIRECT_URI = process.env['GOOGLE_REDIRECT_URI'] ?? 'http://localhost:3000/api/google/callback'

function isPlaceholder(value: string): boolean {
  return /^<.*>$/.test(value.trim())
}

export function getGoogleOAuthConfigStatus(): {
  configured: boolean
  issues: string[]
} {
  const required = {
    GOOGLE_CLIENT_ID: CLIENT_ID,
    GOOGLE_CLIENT_SECRET: CLIENT_SECRET,
    GOOGLE_REDIRECT_URI: REDIRECT_URI,
  }

  const issues = Object.entries(required)
    .filter(([, value]) => !value.trim() || isPlaceholder(value))
    .map(([key]) => key)

  if (CLIENT_ID && !isPlaceholder(CLIENT_ID) && !CLIENT_ID.endsWith('.apps.googleusercontent.com')) {
    issues.push('GOOGLE_CLIENT_ID')
  }

  return { configured: issues.length === 0, issues }
}

export function createOAuthClient(): Auth.OAuth2Client {
  const status = getGoogleOAuthConfigStatus()
  if (!status.configured) {
    throw new Error(`Google OAuth is not configured: ${status.issues.join(', ')}`)
  }

  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)
}

export function getAuthUrl(state?: string): string {
  const client = createOAuthClient()
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/calendar.events',
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
