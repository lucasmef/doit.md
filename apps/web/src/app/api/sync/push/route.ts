import { NextRequest, NextResponse } from 'next/server'
import { authWithCli } from '@/lib/auth'
import {
  ItemModel,
  FolderModel,
  AuditLogModel,
  PendingChangeModel,
  ItemVersionModel,
} from '@doit/db'
import { newAuditId, newItemId, newVersionId } from '@doit/core'
import { hashContent } from '@doit/sync'
import type { Folder, Item, PendingChange } from '@doit/types'
import { ensureDB } from '@/lib/db'
import { resolveFolderFromPath } from '@/lib/path-resolver'

export const dynamic = 'force-dynamic'

const ALLOWED_FRONTMATTER_FIELDS = new Set([
  'title',
  'complexity',
  'status',
  'tags',
  'dueDate',
  'priority',
])

function mapFolderDoc(doc: unknown): Folder {
  const { _id, ...rest } = doc as { _id: string; [k: string]: unknown }
  return { id: _id, ...rest } as unknown as Folder
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await authWithCli(req)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await ensureDB()

    const body = (await req.json()) as { changes: PendingChange[] }
    const changes: PendingChange[] = body.changes ?? []

    if (changes.length === 0) {
      return NextResponse.json({ applied: 0 })
    }

    const approved = changes.filter((c) => c.approved && c.userId === userId)
    const blocked = changes.filter((c) => !c.approved && c.riskLevel === 'high')
    if (blocked.length > 0) {
      return NextResponse.json(
        { error: `${blocked.length} mudança(s) de alto risco precisam de aprovação explícita.` },
        { status: 422 },
      )
    }

    // Snapshot da árvore de pastas pra resolver paths
    const folderRows = (await FolderModel.find({ userId }).sort({ order: 1 }).lean()) as unknown[]
    const folders = folderRows.map(mapFolderDoc)

    const now = new Date().toISOString()
    const auditEntries: Record<string, unknown>[] = []
    let applied = 0

    function pathToFolderInfo(path: string | undefined): {
      folderId: string | undefined
      archive: boolean
    } {
      if (!path) return { folderId: undefined, archive: false }
      const resolved = resolveFolderFromPath(folders, path)
      if (resolved.special === 'archive') return { folderId: undefined, archive: true }
      return { folderId: resolved.folderId ?? undefined, archive: false }
    }

    for (const change of approved) {
      // CREATED — pode não ter itemId; geramos um novo
      if (change.changeType === 'created') {
        const id = change.itemId ?? newItemId()
        const titleAfter = change.titleAfter?.trim() || 'Sem título'
        const fmFields = (change.frontmatterChanges ?? []).reduce<Record<string, unknown>>(
          (acc, fc) => {
            if (ALLOWED_FRONTMATTER_FIELDS.has(fc.field)) acc[fc.field] = fc.after
            return acc
          },
          {},
        )
        const { folderId, archive } = pathToFolderInfo(change.localPathAfter)
        const existingCreated = (await ItemModel.findOne({ _id: id, userId }).lean()) as
          | (Item & Record<string, unknown>)
          | null
        if (existingCreated) {
          const patch = {
            title: titleAfter,
            contentMd: change.contentMdAfter ?? '',
            complexity: (fmFields['complexity'] as string) ?? existingCreated.complexity ?? 'note',
            status: archive
              ? 'archived'
              : ((fmFields['status'] as string) ?? existingCreated.status ?? 'inbox'),
            priority: fmFields['priority'],
            dueDate: fmFields['dueDate'],
            tags: (fmFields['tags'] as string[]) ?? existingCreated.tags ?? [],
            folderId: folderId ?? null,
            localPath: change.localPathAfter,
            syncHash: hashContent(change.contentMdAfter ?? ''),
            deletedAt: archive ? (existingCreated['deletedAt'] ?? now) : null,
            updatedAt: now,
          }
          await ItemModel.findOneAndUpdate({ _id: id, userId }, patch)

          auditEntries.push({
            _id: newAuditId(),
            userId,
            source: 'sync-agent',
            action: existingCreated['deletedAt'] ? 'file_restored' : 'file_updated',
            itemId: id,
            localPathAfter: change.localPathAfter,
            contentHashAfter: patch.syncHash,
            summary: `Item existente atualizado a partir de ${change.localPathAfter}`,
            createdAt: now,
          })
          await PendingChangeModel.findOneAndDelete({ _id: change.id, userId })
          applied++
          continue
        }

        const newItem = {
          _id: id,
          userId,
          title: titleAfter,
          contentMd: change.contentMdAfter ?? '',
          complexity: (fmFields['complexity'] as string) ?? 'note',
          status: archive ? 'archived' : ((fmFields['status'] as string) ?? 'inbox'),
          priority: fmFields['priority'],
          dueDate: fmFields['dueDate'],
          tags: (fmFields['tags'] as string[]) ?? [],
          backlinks: [],
          folderId,
          localPath: change.localPathAfter,
          syncHash: hashContent(change.contentMdAfter ?? ''),
          createdAt: now,
          updatedAt: now,
        }
        await ItemModel.create(newItem)

        auditEntries.push({
          _id: newAuditId(),
          userId,
          source: 'sync-agent',
          action: 'file_created',
          itemId: id,
          localPathAfter: change.localPathAfter,
          contentHashAfter: newItem.syncHash,
          summary: `Item criado a partir de ${change.localPathAfter}`,
          createdAt: now,
        })
        await PendingChangeModel.findOneAndDelete({ _id: change.id, userId })
        applied++
        continue
      }

      if (!change.itemId) continue

      const existing = (await ItemModel.findOne({ _id: change.itemId, userId }).lean()) as
        | (Item & Record<string, unknown>)
        | null
      if (!existing) continue

      // Snapshot pré-mudança
      const snapshot = { ...existing }
      const snapshotHash = hashContent(JSON.stringify(snapshot))
      await ItemVersionModel.create({
        _id: newVersionId(),
        itemId: change.itemId,
        userId,
        snapshotData: snapshot,
        syncHash: snapshotHash,
        createdAt: now,
      })

      const patch: Record<string, unknown> = { updatedAt: now }

      if (change.changeType === 'deleted') {
        patch['status'] = 'archived'
        patch['deletedAt'] = now
      } else if (change.changeType === 'moved') {
        const { folderId, archive } = pathToFolderInfo(change.localPathAfter)
        patch['folderId'] = folderId ?? null
        patch['localPath'] = change.localPathAfter
        if (archive && existing['status'] !== 'archived') patch['status'] = 'archived'
      } else {
        if (change.titleAfter !== undefined) patch['title'] = change.titleAfter
        if (change.contentMdAfter !== undefined) {
          patch['contentMd'] = change.contentMdAfter
          patch['syncHash'] = hashContent(change.contentMdAfter)
        }
        if (
          change.localPathAfter !== undefined &&
          change.localPathAfter !== existing['localPath']
        ) {
          // Movimento implícito junto com edição
          const { folderId, archive } = pathToFolderInfo(change.localPathAfter)
          patch['folderId'] = folderId ?? null
          patch['localPath'] = change.localPathAfter
          if (archive && existing['status'] !== 'archived') patch['status'] = 'archived'
        }
        if (change.frontmatterChanges) {
          for (const fc of change.frontmatterChanges) {
            if (ALLOWED_FRONTMATTER_FIELDS.has(fc.field)) patch[fc.field] = fc.after
          }
        }
      }

      await ItemModel.findOneAndUpdate({ _id: change.itemId, userId }, patch)

      auditEntries.push({
        _id: newAuditId(),
        userId,
        source: 'sync-agent',
        action:
          change.changeType === 'deleted'
            ? 'file_deleted'
            : change.changeType === 'moved'
              ? 'file_moved'
              : 'file_updated',
        itemId: change.itemId,
        localPathBefore: change.localPathBefore,
        localPathAfter: change.localPathAfter,
        contentHashBefore: change.contentMdBefore ? hashContent(change.contentMdBefore) : undefined,
        contentHashAfter: change.contentMdAfter ? hashContent(change.contentMdAfter) : undefined,
        fieldChanges: change.frontmatterChanges,
        summary: buildSummary(change),
        createdAt: now,
      })

      await PendingChangeModel.findOneAndDelete({ _id: change.id, userId })
      applied++
    }

    if (auditEntries.length > 0) {
      await AuditLogModel.insertMany(auditEntries)
    }

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
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    )
  }
}

function buildSummary(change: PendingChange): string {
  const path = change.localPathAfter ?? change.localPathBefore ?? change.itemId ?? '?'
  switch (change.changeType) {
    case 'deleted':
      return `Arquivo removido: ${path}`
    case 'created':
      return `Arquivo criado: ${path}`
    case 'moved':
      return `Movido: ${change.localPathBefore} → ${change.localPathAfter}`
    case 'renamed':
      return `Renomeado: ${change.titleBefore} → ${change.titleAfter}`
    case 'content_changed':
      return `Conteúdo alterado: ${path}`
    case 'frontmatter_changed':
      return `Metadados alterados: ${path}`
    default:
      return `Alteração em ${path}`
  }
}
