import { NextResponse } from 'next/server'
import { RateLimitModel } from '@doit/db'

type Bucket = {
  count: number
  resetAt: number
}

type RateLimitOptions = {
  key: string
  limit: number
  windowMs: number
}

export function clientIp(req: Request) {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  )
}

export async function consumeRateLimit({ key, limit, windowMs }: RateLimitOptions) {
  const now = Date.now()
  const existing = (await RateLimitModel.findOne({ _id: key }).lean()) as Bucket | null
  const bucket =
    existing && existing.resetAt > now
      ? existing
      : {
          count: 0,
          resetAt: now + windowMs,
        }

  bucket.count += 1
  await RateLimitModel.findOneAndUpdate(
    { _id: key },
    {
      $set: {
        count: bucket.count,
        resetAt: bucket.resetAt,
      },
    },
    { upsert: true },
  )

  if (bucket.count <= limit) return { limited: false as const, retryAfter: 0 }

  return {
    limited: true as const,
    retryAfter: Math.ceil((bucket.resetAt - now) / 1000),
  }
}

export async function checkRateLimit(options: RateLimitOptions) {
  const result = await consumeRateLimit(options)
  if (!result.limited) return null

  return NextResponse.json(
    { error: 'Too many requests' },
    {
      status: 429,
      headers: {
        'Retry-After': String(result.retryAfter),
      },
    },
  )
}
