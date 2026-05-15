import { NextRequest, NextResponse } from 'next/server'
import { DriveLinkModel, ItemModel } from '@doit/db'
import { auth } from '@/lib/auth'
import { ensureDB } from '@/lib/db'

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
