import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import {
  ItemModel,
  AuditLogModel,
  PendingChangeModel,
  ItemVersionModel,
} from '@doit/db'
import { newAuditId, newVersionId } from '@doit/core'
import { hashContent } from '@doit/sync'
import type { PendingChange } from '@doit/types'
import { ensureDB } from '@/lib/db'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await ensureDB()

    const body = (await req.json()) as { changes: PendingChange[]; userId?: string }
    const changes: PendingChange[] = body.changes ?? []

    if (changes.length === 0) {
      return NextResponse.json({ applied: 0 })
    }

    // Só processa mudanças deste usuário e aprovadas
    const approved = changes.filter((c) => c.approved && c.userId === userId)

    // Bloqueia high risk não aprovados
    const blocked = changes.filter((c) => !c.approved && c.riskLevel === 'high')
    if (blocked.length > 0) {
      return NextResponse.json(
        { error: `${blocked.length} mudança(s) de alto risco precisam de aprovação explícita.` },
        { status: 422 },
      )
    }

    const now = new Date().toISOString()
    const auditEntries = []
    let applied = 0

    for (const change of approved) {
      if (!change.itemId) continue

      const item = await ItemModel.findOne({ _id: change.itemId, userId }).lean()
      if (!item) continue

      // Salvar versão anterior
      const snapshot = { ...item }
      const syncHash = hashContent(JSON.stringify(snapshot))
      await ItemVersionModel.create({
        _id: newVersionId(),
        itemId: change.itemId,
        userId,
        snapshotData: snapshot,
        syncHash,
        createdAt: now,
      })

      // Montar patch
      const patch: Record<string, unknown> = { updatedAt: now }

      if (change.changeType === 'deleted') {
        patch['status'] = 'archived'
        patch['deletedAt'] = now
      } else {
        if (change.titleAfter !== undefined) patch['title'] = change.titleAfter
        if (change.contentMdAfter !== undefined) patch['contentMd'] = change.contentMdAfter
        if (change.localPathAfter !== undefined) patch['localPath'] = change.localPathAfter

        if (change.frontmatterChanges) {
          for (const fc of change.frontmatterChanges) {
            const allowed = ['complexity', 'status', 'tags', 'dueDate', 'projectId', 'areaId']
            if (allowed.includes(fc.field)) patch[fc.field] = fc.after
          }
        }
      }

      await ItemModel.findOneAndUpdate({ _id: change.itemId, userId }, patch)

      // Audit log
      auditEntries.push({
        _id: newAuditId(),
        userId,
        source: 'sync-agent',
        action: change.changeType === 'deleted' ? 'file_deleted'
          : change.changeType === 'created' ? 'file_created'
          : 'file_updated',
        itemId: change.itemId,
        localPathBefore: change.localPathBefore,
        localPathAfter: change.localPathAfter,
        contentHashBefore: change.contentMdBefore
          ? hashContent(change.contentMdBefore)
          : undefined,
        contentHashAfter: change.contentMdAfter
          ? hashContent(change.contentMdAfter)
          : undefined,
        fieldChanges: change.frontmatterChanges,
        summary: buildSummary(change),
        createdAt: now,
      })

      // Remover da coleção de pendentes
      await PendingChangeModel.findOneAndDelete({ _id: change.id, userId })
      applied++
    }

    if (auditEntries.length > 0) {
      await AuditLogModel.insertMany(auditEntries)
    }

    // Log geral do push
    await AuditLogModel.create({
      _id: newAuditId(),
      userId,
      source: 'sync-agent',
      action: 'push',
      summary: `Push aplicado: ${applied} mudança(s).`,
      createdAt: now,
    })

    return NextResponse.json({ applied })
  } catch (err) {
    console.error('[POST /api/sync/push]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

function buildSummary(change: PendingChange): string {
  const path = change.localPathAfter ?? change.localPathBefore ?? change.itemId ?? '?'
  switch (change.changeType) {
    case 'deleted': return `Arquivo removido: ${path}`
    case 'created': return `Arquivo criado: ${path}`
    case 'moved': return `Movido: ${change.localPathBefore} → ${change.localPathAfter}`
    case 'renamed': return `Renomeado: ${change.titleBefore} → ${change.titleAfter}`
    case 'content_changed': return `Conteúdo alterado: ${path}`
    case 'frontmatter_changed': return `Metadados alterados: ${path}`
    default: return `Alteração em ${path}`
  }
}
