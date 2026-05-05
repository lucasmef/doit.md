import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { ProjectModel } from '@doit/db'
import { newProjectId } from '@doit/core'
import type { CreateProjectInput } from '@doit/types'
import { ensureDB } from '@/lib/db'

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await ensureDB()
    const projects = await ProjectModel.find({ userId }).sort({ order: 1 }).lean()
    return NextResponse.json({ projects })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await ensureDB()
    const body = (await req.json()) as CreateProjectInput
    if (!body.name?.trim()) return NextResponse.json({ error: 'name is required' }, { status: 400 })

    const count = await ProjectModel.countDocuments({ userId })
    const now = new Date().toISOString()
    const project = await ProjectModel.create({
      _id: newProjectId(),
      userId,
      name: body.name.trim(),
      description: body.description,
      status: 'active',
      areaId: body.areaId,
      color: body.color,
      order: body.order ?? count,
      createdAt: now,
      updatedAt: now,
    })

    return NextResponse.json({ project }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
