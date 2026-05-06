import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ItemVersionModel, ItemModel } from '@doit/db'
import { ensureDB } from '@/lib/db'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await ensureDB()
    const { id } = await params

    const versions = await ItemVersionModel.find({ itemId: id, userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean()

    return NextResponse.json({ versions })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// Restaurar uma versão
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await ensureDB()
    const { id } = await params
    const { versionId } = (await req.json()) as { versionId: string }

    const version = await ItemVersionModel.findOne({ _id: versionId, itemId: id, userId }).lean() as Record<string, unknown> | null
    if (!version) return NextResponse.json({ error: 'Version not found' }, { status: 404 })

    const snapshot = (version['snapshotData'] ?? {}) as Record<string, unknown>
    const patch = {
      title: snapshot['title'],
      contentMd: snapshot['contentMd'],
      complexity: snapshot['complexity'],
      status: snapshot['status'],
      tags: snapshot['tags'],
      dueDate: snapshot['dueDate'],
      projectId: snapshot['projectId'],
      areaId: snapshot['areaId'],
      updatedAt: new Date().toISOString(),
    }

    const item = await ItemModel.findOneAndUpdate({ _id: id, userId }, patch, { new: true }).lean()

    return NextResponse.json({ item })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
