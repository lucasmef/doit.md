import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { FolderModel, ItemModel } from '@doit/db'
import type { UpdateFolderInput } from '@doit/types'
import { ensureDB } from '@/lib/db'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await ensureDB()
    const { id } = await params
    const folder = await FolderModel.findOne({ _id: id, userId }).lean()
    if (!folder) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json({ folder })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await ensureDB()
    const { id } = await params
    const body = (await req.json()) as UpdateFolderInput

    if (body.parentId === id) {
      return NextResponse.json({ error: 'Folder cannot be its own parent' }, { status: 400 })
    }
    if (body.viewMode && body.viewMode !== 'list' && body.viewMode !== 'kanban') {
      return NextResponse.json({ error: 'Invalid viewMode' }, { status: 400 })
    }

    const now = new Date().toISOString()
    const patch: Record<string, unknown> = { ...body, updatedAt: now }
    if (body.viewMode) patch['viewModeManual'] = true
    const folder = await FolderModel.findOneAndUpdate({ _id: id, userId }, patch, {
      new: true,
    }).lean()

    if (!folder) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    if (body.viewMode) {
      const allFolders = (await FolderModel.find({ userId }).lean()) as Array<{
        _id?: string
        id?: string
        parentId?: string
        viewModeManual?: boolean
      }>
      const descendants = new Set<string>()
      let added = true
      while (added) {
        added = false
        for (const candidate of allFolders) {
          const candidateId = String(candidate._id ?? candidate.id)
          if (
            candidate.parentId &&
            (candidate.parentId === id || descendants.has(candidate.parentId)) &&
            !descendants.has(candidateId)
          ) {
            descendants.add(candidateId)
            added = true
          }
        }
      }

      for (const folderId of descendants) {
        const descendant = allFolders.find(
          (candidate) => String(candidate._id ?? candidate.id) === folderId,
        )
        if (descendant?.viewModeManual) continue
        await FolderModel.findOneAndUpdate(
          { _id: folderId, userId },
          { viewMode: body.viewMode, updatedAt: now },
        )
      }
    }

    return NextResponse.json({ folder })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await ensureDB()
    const { id } = await params

    const allFolders = (await FolderModel.find({ userId }).lean()) as {
      _id: string
      parentId?: string
    }[]
    const descendants = new Set<string>([id])
    let added = true
    while (added) {
      added = false
      for (const folder of allFolders) {
        if (folder.parentId && descendants.has(folder.parentId) && !descendants.has(folder._id)) {
          descendants.add(folder._id)
          added = true
        }
      }
    }

    for (const folderId of descendants) {
      await FolderModel.deleteOne({ _id: folderId, userId })
      await ItemModel.updateMany(
        { userId, folderId },
        { folderId: null, updatedAt: new Date().toISOString() },
      )
    }

    return NextResponse.json({ ok: true, removed: descendants.size })
  } catch (err) {
    console.error('[DELETE /api/folders/[id]]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
