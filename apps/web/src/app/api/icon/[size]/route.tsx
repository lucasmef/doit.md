import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ size: string }> }) {
  const { size } = await params
  const dim = size === '512' ? 512 : 192
  const radius = Math.round(dim * 0.2)
  const inset = Math.round(dim * 0.158)
  const markSize = dim - inset * 2

  return new ImageResponse(
    (
      <div
        style={{
          width: dim,
          height: dim,
          borderRadius: radius,
          background: '#f8fafc',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg
          width={markSize}
          height={markSize}
          viewBox="160 96 532 532"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            display: 'block',
          }}
        >
          <defs>
            <linearGradient id="ringGradient" x1="190" y1="120" x2="660" y2="610" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#115AF5" />
              <stop offset="0.32" stopColor="#0984E6" />
              <stop offset="0.68" stopColor="#06AFCB" />
              <stop offset="1" stopColor="#39D0B9" />
            </linearGradient>
            <linearGradient id="dotBlue" x1="472" y1="110" x2="505" y2="145" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#1267F7" />
              <stop offset="1" stopColor="#0495DF" />
            </linearGradient>
            <linearGradient id="dotCyan" x1="580" y1="172" x2="618" y2="210" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#08AAC7" />
              <stop offset="1" stopColor="#2DD1BE" />
            </linearGradient>
            <linearGradient id="dotCyanBlue" x1="618" y1="224" x2="676" y2="318" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#0DB7C6" />
              <stop offset="0.48" stopColor="#04A9D4" />
              <stop offset="1" stopColor="#1166F3" />
            </linearGradient>
            <linearGradient id="checkGradient" x1="345" y1="420" x2="545" y2="300" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#0A1A43" />
              <stop offset="0.55" stopColor="#0B214F" />
              <stop offset="1" stopColor="#0A2A62" />
            </linearGradient>
          </defs>
          <path d="M 423 120 A 242 242 0 1 0 668 371" stroke="url(#ringGradient)" strokeWidth="48" strokeLinecap="round" />
          <circle cx="489" cy="127" r="17.5" fill="url(#dotBlue)" />
          <circle cx="547" cy="153" r="17.5" fill="url(#dotBlue)" />
          <circle cx="598" cy="190" r="17.5" fill="url(#dotCyan)" />
          <circle cx="636" cy="243" r="17.5" fill="url(#dotCyanBlue)" />
          <circle cx="660" cy="300" r="17.5" fill="url(#dotCyanBlue)" />
          <path d="M 357 374 L 407 421 L 526 307" stroke="url(#checkGradient)" strokeWidth="43" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    ),
    { width: dim, height: dim },
  )
}
