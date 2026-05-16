import { NextRequest, NextResponse } from 'next/server'
import { DriveLinkModel, GoogleAccountModel, ItemModel } from '@doit/db'
import { auth } from '@/lib/auth'
import { ensureDB } from '@/lib/db'
import { getDriveClient, hasDriveScope, type GoogleAccountRow } from '@/lib/google'
import { getOrCreateTrashFolder, moveDriveItem } from '@/lib/drive'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

function mapDriveLink(doc: Record<string, unknown>) {
  return {
    id: String(doc['_id'] ?? doc['id'] ?? ''),
    fileId: String(doc['fileId'] ?? ''),
    name: String(doc['fileName'] ?? ''),
    mimeType: typeof doc['mimeType'] === 'string' ? doc['mimeType'] : null,
    size: typeof doc['size'] === 'number' ? doc['size'] : Number(doc['size'] ?? 0),
    webViewLink: String(doc['webViewLink'] ?? ''),
    createdAt: String(doc['createdAt'] ?? ''),
  }
}

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await ensureDB()
    const { id } = await params
    const item = await ItemModel.findOne({ _id: id, userId }).lean()
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const links = await DriveLinkModel.find({ itemId: id, userId })
      .sort({ createdAt: -1 })
      .lean()

    return NextResponse.json({ links: links.map(mapDriveLink) })
  } catch (err) {
    console.error('[GET /api/items/:id/drive-links]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

/**
 * Exclui um anexo: move o arquivo para a pasta `_trash/` no Drive e remove o
 * vínculo. O move é best-effort — se falhar (arquivo já apagado, etc.), o
 * vínculo é removido mesmo assim para o anexo sumir do app.
 */
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await ensureDB()
    const { id } = await params
    const body = (await req.json().catch(() => ({}))) as { fileId?: unknown }
    const fileId = typeof body.fileId === 'string' ? body.fileId : ''
    if (!fileId) return NextResponse.json({ error: 'Missing fileId' }, { status: 400 })

    const link = await DriveLinkModel.findOne({ userId, itemId: id, fileId }).lean()
    if (!link) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    let moved = false
    const account = (await GoogleAccountModel.findOne({ userId }).lean()) as
      | GoogleAccountRow
      | null
    if (account && hasDriveScope(account)) {
      try {
        const drive = await getDriveClient(account)
        const trashFolderId = await getOrCreateTrashFolder(drive, account)
        moved = await moveDriveItem(drive, fileId, trashFolderId)
      } catch (err) {
        console.warn(`[DELETE drive-link] falha ao mover ${fileId} para _trash:`, err)
      }
    }

    await DriveLinkModel.deleteMany({ userId, itemId: id, fileId })
    return NextResponse.json({ ok: true, moved })
  } catch (err) {
    console.error('[DELETE /api/items/:id/drive-links]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
