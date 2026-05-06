import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ItemModel } from '@doit/db'
import { ensureDB } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')
  if (!q) return NextResponse.json({ items: [] })

  try {
    await ensureDB()
    const items = await ItemModel.find({
      userId,
      status: { $ne: 'archived' },
      title: { $regex: q, $options: 'i' }
    })
      .sort({ updatedAt: -1 })
      .limit(10)
      .lean()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapped = items.map((i: any) => ({
      ...i,
      id: i._id,
      _id: undefined,
    }))

    return NextResponse.json({ items: mapped })
  } catch (error) {
    console.error('[API_SEARCH_ERROR]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
