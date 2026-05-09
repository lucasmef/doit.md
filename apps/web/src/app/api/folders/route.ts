import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { FolderModel } from '@doit/db'
import { newFolderId } from '@doit/core'
import type { CreateFolderInput } from '@doit/types'
import { ensureDB } from '@/lib/db'
import { migrateProjectsToFoldersForUser } from '@/lib/migrate-folders'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await ensureDB()
    await migrateProjectsToFoldersForUser(userId)
    const folders = await FolderModel.find({ userId }).sort({ order: 1 }).lean()
    return NextResponse.json({ folders })
  } catch (err) {
    console.error('[GET /api/folders]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await ensureDB()
    const body = (await req.json()) as CreateFolderInput
    if (!body.name?.trim()) return NextResponse.json({ error: 'name is required' }, { status: 400 })

    const count = await FolderModel.countDocuments({ userId })
    const now = new Date().toISOString()
    const folder = await FolderModel.create({
      _id: newFolderId(),
      userId,
      name: body.name.trim(),
      parentId: body.parentId,
      order: body.order ?? count,
      createdAt: now,
      updatedAt: now,
    })

    return NextResponse.json({ folder }, { status: 201 })
  } catch (err) {
    console.error('[POST /api/folders]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
