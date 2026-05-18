import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

const COOKIE_NAME = 'doit_google_oauth_state'
const MAX_AGE_SECONDS = 10 * 60

type OAuthStatePayload = {
  nonce: string
  userId: string
  iat: number
}

function secret() {
  const value = process.env['NEXTAUTH_SECRET']
  if (!value) throw new Error('NEXTAUTH_SECRET is required for OAuth state')
  return value
}

function base64url(input: string) {
  return Buffer.from(input, 'utf8').toString('base64url')
}

function sign(payload: string) {
  return createHmac('sha256', secret()).update(payload).digest('base64url')
}

export function createGoogleOAuthState(userId: string) {
  const payload: OAuthStatePayload = {
    nonce: randomBytes(24).toString('base64url'),
    userId,
    iat: Math.floor(Date.now() / 1000),
  }
  const encoded = base64url(JSON.stringify(payload))
  return {
    state: `${encoded}.${sign(encoded)}`,
    nonce: payload.nonce,
    cookieName: COOKIE_NAME,
    maxAge: MAX_AGE_SECONDS,
  }
}

export function verifyGoogleOAuthState(
  state: string | null,
  cookieNonce: string | undefined,
): { userId: string } | { error: string } {
  if (!state || !cookieNonce) return { error: 'missing-code-or-state' }

  const [encoded, signature] = state.split('.')
  if (!encoded || !signature) return { error: 'invalid-state' }

  const expected = sign(encoded)
  const actualBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expected)
  if (
    actualBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(actualBuffer, expectedBuffer)
  ) {
    return { error: 'invalid-state' }
  }

  let payload: OAuthStatePayload
  try {
    payload = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8')) as OAuthStatePayload
  } catch {
    return { error: 'invalid-state' }
  }

  if (!payload.userId || !payload.nonce || payload.nonce !== cookieNonce) {
    return { error: 'invalid-state' }
  }

  if (Math.floor(Date.now() / 1000) - payload.iat > MAX_AGE_SECONDS) {
    return { error: 'expired-state' }
  }

  return { userId: payload.userId }
}

export { COOKIE_NAME as GOOGLE_OAUTH_STATE_COOKIE }
