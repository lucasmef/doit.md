import { NextRequest, NextResponse } from 'next/server'
import { authWithCli } from '@/lib/auth'
import { ensureDB } from '@/lib/db'
import { GoogleAccountModel } from '@doit/db'
import { hasDriveScope, type GoogleAccountRow } from '@/lib/google'
import { reconcileAllForUser } from '@/lib/drive-reconcile'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Drift sweep: reposiciona todos os anexos do usuário e todas as pastas-espelho
 * de acordo com a árvore de projetos. Acionado por `doit-sync drive sync`.
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await authWithCli(req)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await ensureDB()
    const account = (await GoogleAccountModel.findOne({ userId }).lean()) as
      | GoogleAccountRow
      | null
    if (!account || !hasDriveScope(account)) {
      return NextResponse.json(
        { error: 'Drive not connected', needsReauth: true },
        { status: 412 },
      )
    }

    const result = await reconcileAllForUser(userId)
    return NextResponse.json({ ok: true, ...result })
  } catch (err) {
    console.error('[POST /api/drive/reconcile]', err)
    return NextResponse.json({ error: 'Reconcile failed' }, { status: 500 })
  }
}
