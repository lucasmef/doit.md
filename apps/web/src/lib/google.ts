import { google, Auth } from 'googleapis'

const CLIENT_ID = process.env['GOOGLE_CLIENT_ID'] ?? ''
const CLIENT_SECRET = process.env['GOOGLE_CLIENT_SECRET'] ?? ''
const REDIRECT_URI = process.env['GOOGLE_REDIRECT_URI'] ?? 'http://localhost:3000/api/google/callback'

export function createOAuthClient(): Auth.OAuth2Client {
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
