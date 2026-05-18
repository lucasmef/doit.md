import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ItemVersionModel, ItemModel } from '@doit/db'
import { ensureDB } from '@/lib/db'
import { newVersionId } from '@doit/core'
import { hashContent } from '@doit/sync'
import { createManualAuditLog } from '@/lib/api/audit-log'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

function itemSnapshot(item: Record<string, unknown>) {
  return {
    title: item['title'],
    contentMd: item['contentMd'],
    complexity: item['complexity'],
    status: item['status'],
    tags: item['tags'],
    dueDate: item['dueDate'],
    folderId: item['folderId'],
    areaId: item['areaId'],
  }
}

async function createVersionIfChanged(item: Record<string, unknown>, userId: string) {
  const itemId = String(item['_id'] ?? item['id'])
  const snapshot = itemSnapshot(item)
  const syncHash = hashContent(JSON.stringify(snapshot))
  const latest = await ItemVersionModel.find({ itemId, userId }).sort({ createdAt: -1 }).limit(1).lean()
  if (latest[0]?.['syncHash'] === syncHash) return
  await ItemVersionModel.create({
    _id: newVersionId(),
    itemId,
    userId,
    snapshotData: snapshot,
    syncHash,
    createdAt: new Date().toISOString(),
  })
}

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

    const current = await ItemModel.findOne({ _id: id, userId }).lean() as Record<string, unknown> | null
    if (!current) return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    await createVersionIfChanged(current, userId)

    const snapshot = (version['snapshotData'] ?? {}) as Record<string, unknown>
    const patch = {
      title: snapshot['title'],
      contentMd: snapshot['contentMd'],
      complexity: snapshot['complexity'],
      status: snapshot['status'],
      tags: snapshot['tags'],
      dueDate: snapshot['dueDate'],
      folderId: snapshot['folderId'],
      areaId: snapshot['areaId'],
      updatedAt: new Date().toISOString(),
    }

    const item = await ItemModel.findOneAndUpdate({ _id: id, userId }, patch, { new: true }).lean()

    await createManualAuditLog({
      userId,
      itemId: id,
      action: 'item_version_restored',
      summary: `Versao restaurada manualmente: ${versionId}`,
    })

    return NextResponse.json({ item })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
