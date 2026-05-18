import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { UserModel } from '@doit/db'
import { newUserId } from '@doit/core'
import { ensureDB } from '@/lib/db'
import { checkRateLimit, clientIp } from '@/lib/api/rate-limit'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const limited = await checkRateLimit({
      key: `auth:register:${clientIp(req)}`,
      limit: 10,
      windowMs: 15 * 60_000,
    })
    if (limited) return limited

    await ensureDB()
    const body = (await req.json()) as { email?: string; password?: string; name?: string }
    const email = body.email?.trim().toLowerCase()
    const password = body.password ?? ''
    const name = body.name?.trim()

    if (!email) return NextResponse.json({ error: 'email is required' }, { status: 400 })
    if (password.length < 8) {
      return NextResponse.json({ error: 'password must have at least 8 characters' }, { status: 400 })
    }

    const existing = await UserModel.findOne({ email }).lean()
    if (existing) return NextResponse.json({ error: 'email already registered' }, { status: 409 })

    const now = new Date().toISOString()
    await UserModel.create({
      _id: newUserId(),
      email,
      name: name || email,
      passwordHash: await bcrypt.hash(password, 12),
      createdAt: now,
      updatedAt: now,
    })

    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/auth/register]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
