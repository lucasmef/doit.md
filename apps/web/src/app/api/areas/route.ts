import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { AreaModel } from '@doit/db'
import { newAreaId } from '@doit/core'
import type { CreateAreaInput } from '@doit/types'
import { ensureDB } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await ensureDB()
    const areas = await AreaModel.find({ userId }).sort({ order: 1 }).lean()
    return NextResponse.json({ areas })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await ensureDB()
    const body = (await req.json()) as CreateAreaInput
    if (!body.name?.trim()) return NextResponse.json({ error: 'name is required' }, { status: 400 })

    const count = await AreaModel.countDocuments({ userId })
    const now = new Date().toISOString()
    const area = await AreaModel.create({
      _id: newAreaId(),
      userId,
      name: body.name.trim(),
      description: body.description,
      color: body.color,
      order: body.order ?? count,
      createdAt: now,
      updatedAt: now,
    })

    return NextResponse.json({ area }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
