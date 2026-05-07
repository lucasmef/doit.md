import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ItemModel } from '@doit/db'
import { ensureDB } from '@/lib/db'

export const dynamic = 'force-dynamic'

function matchesSearch(item: Record<string, unknown>, q: string) {
  const needle = q.toLocaleLowerCase('pt-BR')
  const tags = Array.isArray(item['tags']) ? item['tags'].join(' ') : ''
  const haystack = [
    item['title'],
    item['contentMd'],
    tags,
  ].filter(Boolean).join(' ').toLocaleLowerCase('pt-BR')
  return haystack.includes(needle)
}

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
      deletedAt: null,
    })
      .sort({ updatedAt: -1 })
      .lean()
    const results = items.filter((item: Record<string, unknown>) => matchesSearch(item, q)).slice(0, 10)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mapped = results.map((i: any) => ({
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
