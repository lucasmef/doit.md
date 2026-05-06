import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ size: string }> }) {
  const { size } = await params
  const dim = size === '512' ? 512 : 192
  const radius = Math.round(dim * 0.2)
  const fontSize = Math.round(dim * 0.52)
  const letterSpacing = Math.round(dim * -0.01)

  return new ImageResponse(
    (
      <div
        style={{
          width: dim,
          height: dim,
          borderRadius: radius,
          background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            color: 'white',
            fontSize,
            fontWeight: 700,
            fontFamily: 'sans-serif',
            letterSpacing,
          }}
        >
          C
        </div>
      </div>
    ),
    { width: dim, height: dim },
  )
}
