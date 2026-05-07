import { getToken } from 'next-auth/jwt'
import { NextResponse, type NextRequest } from 'next/server'

function getPublicOrigin(request: NextRequest) {
  if (process.env['NEXTAUTH_URL']) return process.env['NEXTAUTH_URL']

  const proto = request.headers.get('x-forwarded-proto') ?? request.nextUrl.protocol.replace(':', '')
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? request.nextUrl.host
  return `${proto}://${host}`
}

export default async function middleware(request: NextRequest) {
  const token = await getToken({ req: request })
  if (token) return NextResponse.next()

  const signInUrl = new URL('/sign-in', getPublicOrigin(request))
  signInUrl.searchParams.set('callbackUrl', `${request.nextUrl.pathname}${request.nextUrl.search}`)
  return NextResponse.redirect(signInUrl)
}

export const config = {
  matcher: [
    '/((?!api/auth|api/health|api/icon|sign-in|sign-up|_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
  ],
}
