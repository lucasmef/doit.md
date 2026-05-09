import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { auth } from '@/lib/auth'
import { ensureDB } from '@/lib/db'
import { UserModel } from '@doit/db'

export const dynamic = 'force-dynamic'

function toProfile(user: Record<string, unknown>) {
  return {
    email: String(user['email'] ?? ''),
    name: String(user['name'] ?? user['email'] ?? ''),
  }
}

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await ensureDB()
    const user = await UserModel.findOne({ _id: userId }).lean() as Record<string, unknown> | null
    if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({ profile: toProfile(user) })
  } catch (err) {
    console.error('[GET /api/profile]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await ensureDB()
    const body = (await req.json()) as { name?: string; currentPassword?: string; newPassword?: string }
    const user = await UserModel.findOne({ _id: userId }).lean() as Record<string, unknown> | null
    if (!user) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() }
    const name = body.name?.trim()
    if (name) patch['name'] = name

    if (body.currentPassword || body.newPassword) {
      if (!body.currentPassword || !body.newPassword) {
        return NextResponse.json({ error: 'Informe a senha atual e a nova senha.' }, { status: 400 })
      }
      if (body.newPassword.length < 8) {
        return NextResponse.json({ error: 'A nova senha deve ter pelo menos 8 caracteres.' }, { status: 400 })
      }
      const ok = await bcrypt.compare(body.currentPassword, String(user['passwordHash'] ?? ''))
      if (!ok) return NextResponse.json({ error: 'Senha atual incorreta.' }, { status: 400 })
      patch['passwordHash'] = await bcrypt.hash(body.newPassword, 12)
    }

    const updated = await UserModel.findOneAndUpdate({ _id: userId }, patch, { new: true }).lean() as Record<string, unknown> | null
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({ profile: toProfile(updated) })
  } catch (err) {
    console.error('[PATCH /api/profile]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
