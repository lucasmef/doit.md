import { NextRequest, NextResponse } from 'next/server'
import { authWithCli } from '@/lib/auth'
import {
  ItemModel,
  FolderModel,
  AuditLogModel,
  PendingChangeModel,
  ItemVersionModel,
} from '@doit/db'
import {
  newAuditId,
  newFolderId,
  newItemId,
  newVersionId,
  slugify,
  USER_AGENTS_TAG,
  USER_AGENTS_FILENAME,
  USER_AGENTS_TITLE,
} from '@doit/core'
import { hashContent } from '@doit/sync'
import type { Folder, Item, PendingChange } from '@doit/types'
import { ensureDB } from '@/lib/db'
import { resolveFolderFromPath } from '@/lib/path-resolver'
import {
  reconcileFolderMirror,
  reconcileItemAttachments,
  registerInboxLinks,
} from '@/lib/drive-reconcile'
import { checkRateLimit, clientIp } from '@/lib/api/rate-limit'

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
    const authedUserId = userId

    const limited = await checkRateLimit({
      key: `sync:push:${userId}:${clientIp(req)}`,
      limit: 60,
      windowMs: 15 * 60_000,
    })
    if (limited) return limited

    await ensureDB()

    const body = (await req.json()) as { changes?: PendingChange[]; ids?: string[] }
    const requestedIds = new Set([
      ...(body.ids ?? []),
      ...((body.changes ?? []).map((change) => change.id).filter(Boolean)),
    ])

    const pendingRows = (await PendingChangeModel.find({ userId }).lean()) as Array<
      PendingChange & { _id?: string }
    >
    const normalizedPendingRows = pendingRows.map((change) => ({
      ...change,
      id: change.id ?? change._id ?? '',
    }))
    const changes =
      requestedIds.size > 0
        ? normalizedPendingRows.filter((change) => requestedIds.has(change.id))
        : normalizedPendingRows

    if (requestedIds.size > 0 && changes.length !== requestedIds.size) {
      return NextResponse.json({ error: 'Unknown pending change id' }, { status: 404 })
    }

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
    if (requestedIds.size > 0 && approved.length !== changes.length) {
      return NextResponse.json(
        { error: 'Only approved pending changes can be pushed.' },
        { status: 422 },
      )
    }

    // Snapshot da árvore de pastas pra resolver paths
    const folderRows = (await FolderModel.find({ userId }).sort({ order: 1 }).lean()) as unknown[]
    const folders = folderRows.map(mapFolderDoc)

    const now = new Date().toISOString()
    const auditEntries: Record<string, unknown>[] = []
    let applied = 0

    // Reconciliação do espelho do Drive: coletada durante o loop, aplicada no fim.
    const reconcileItemIds = new Set<string>()
    const reconcileFolderIds = new Set<string>()
    const inboxScan = new Map<string, string>()

    async function pathToFolderInfo(path: string | undefined): Promise<{
      folderId: string | undefined
      archive: boolean
    }> {
      if (!path) return { folderId: undefined, archive: false }
      const resolved = resolveFolderFromPath(folders, path)
      if (resolved.special === 'archive') return { folderId: undefined, archive: true }
      if (resolved.folderId) return { folderId: resolved.folderId, archive: false }
      const folderId = await ensureFoldersFromPath(path)
      return { folderId, archive: false }
    }

    async function ensureFoldersFromPath(path: string): Promise<string | undefined> {
      const segments = path.split('/').filter(Boolean).slice(0, -1)
      return ensureFolderSegments(segments)
    }

    async function ensureFolderPath(folderPath: string | undefined): Promise<string | undefined> {
      const segments = folderPath?.split('/').filter(Boolean) ?? []
      return ensureFolderSegments(segments)
    }

    async function ensureFolderSegments(segments: string[]): Promise<string | undefined> {
      if (segments.length === 0) return undefined
      if (
        ['Inbox', 'inbox', 'Proximos', 'proximos', '_arquivo', 'Arquivo', 'arquivo'].includes(
          segments[0] ?? '',
        )
      ) {
        return undefined
      }

      let parentId: string | undefined
      let currentId: string | undefined
      for (const segment of segments) {
        const match = folders.find(
          (folder) =>
            (folder.parentId ?? undefined) === parentId &&
            slugify(folder.name, 'pasta') === segment,
        )
        if (match) {
          currentId = match.id
          parentId = match.id
          continue
        }

        const siblingCount = folders.filter(
          (folder) => (folder.parentId ?? undefined) === parentId,
        ).length
        const id = newFolderId()
        const folder: Folder = {
          id,
          userId: authedUserId,
          name: segment,
          parentId,
          order: siblingCount,
          viewMode: 'list',
          viewModeManual: false,
          createdAt: now,
          updatedAt: now,
        }
        await FolderModel.create({ ...folder, _id: id })
        folders.push(folder)
        currentId = id
        parentId = id
      }
      return currentId
    }

    function folderNameFromPath(path: string | undefined): string {
      return path?.split('/').filter(Boolean).at(-1) ?? 'Nova pasta'
    }

    function parentPathFromFolderPath(path: string | undefined): string | undefined {
      const segments = path?.split('/').filter(Boolean) ?? []
      segments.pop()
      return segments.length > 0 ? segments.join('/') : undefined
    }

    async function deleteFolderSubtree(folderId: string) {
      const ids = new Set<string>([folderId])
      let changed = true
      while (changed) {
        changed = false
        for (const folder of folders) {
          if (folder.parentId && ids.has(folder.parentId) && !ids.has(folder.id)) {
            ids.add(folder.id)
            changed = true
          }
        }
      }

      for (const id of ids) {
        const affected = (await ItemModel.find({ userId, folderId: id }).lean()) as Array<{
          _id?: string
          id?: string
        }>
        for (const it of affected) {
          const affectedId = String(it._id ?? it.id ?? '')
          if (affectedId) reconcileItemIds.add(affectedId)
        }
        await ItemModel.updateMany({ userId, folderId: id }, { folderId: null })
      }
      for (const id of Array.from(ids).reverse()) {
        await FolderModel.findOneAndDelete({ _id: id, userId })
      }
      for (let index = folders.length - 1; index >= 0; index--) {
        if (ids.has(folders[index]!.id)) folders.splice(index, 1)
      }
    }

    async function applyFolderChange(change: PendingChange): Promise<boolean> {
      if (!change.changeType.startsWith('folder_')) return false

      if (change.changeType === 'folder_created') {
        await ensureFolderPath(change.localPathAfter)
      } else if (change.changeType === 'folder_moved' || change.changeType === 'folder_renamed') {
        const id = change.folderId
        if (id) reconcileFolderIds.add(id)
        const name = change.folderNameAfter ?? folderNameFromPath(change.localPathAfter)
        const parentId = await ensureFolderPath(parentPathFromFolderPath(change.localPathAfter))
        if (id) {
          const existing = folders.find((folder) => folder.id === id)
          await FolderModel.findOneAndUpdate(
            { _id: id, userId },
            { name, parentId: parentId ?? null, updatedAt: now },
          )
          if (existing) {
            existing.name = name
            existing.parentId = parentId
            existing.updatedAt = now
          }
        } else {
          await ensureFolderPath(change.localPathAfter)
        }
      } else if (change.changeType === 'folder_deleted' && change.folderId) {
        await deleteFolderSubtree(change.folderId)
      }

      auditEntries.push({
        _id: newAuditId(),
        userId,
        source: 'sync-agent',
        action:
          change.changeType === 'folder_created'
            ? 'folder_created'
            : change.changeType === 'folder_deleted'
              ? 'folder_deleted'
              : 'folder_moved',
        localPathBefore: change.localPathBefore,
        localPathAfter: change.localPathAfter,
        summary: buildSummary(change),
        createdAt: now,
      })
      await PendingChangeModel.findOneAndDelete({ _id: change.id, userId })
      applied++
      return true
    }

    function normalizeIncomingBody(title: string | undefined, content: string | undefined): string {
      const body = content ?? ''
      const cleanTitle = title?.trim()
      if (!cleanTitle) return body
      const cleanBody = body.trim()
      if (cleanBody === cleanTitle || cleanBody === `# ${cleanTitle}`) return ''
      return body
    }

    function isAgentsPath(path: string | undefined): boolean {
      const fileName = path?.split('/').filter(Boolean).at(-1)
      return fileName === USER_AGENTS_TITLE || fileName === USER_AGENTS_FILENAME
    }

    for (const change of approved) {
      if (await applyFolderChange(change)) continue
      // CREATED — pode não ter itemId; geramos um novo
      if (change.changeType === 'created') {
        const id = change.itemId ?? newItemId()
        const agentsFile = isAgentsPath(change.localPathAfter)
        const titleAfter = agentsFile
          ? USER_AGENTS_TITLE
          : change.titleAfter?.trim() || 'Sem título'
        const fmFields = (change.frontmatterChanges ?? []).reduce<Record<string, unknown>>(
          (acc, fc) => {
            if (ALLOWED_FRONTMATTER_FIELDS.has(fc.field)) acc[fc.field] = fc.after
            return acc
          },
          {},
        )
        const { folderId, archive } = await pathToFolderInfo(change.localPathAfter)
        const contentMdAfter = agentsFile
          ? (change.contentMdAfter ?? '')
          : normalizeIncomingBody(titleAfter, change.contentMdAfter)
        reconcileItemIds.add(id)
        if (contentMdAfter) inboxScan.set(id, contentMdAfter)
        const existingCreated = (await ItemModel.findOne({ _id: id, userId }).lean()) as
          | (Item & Record<string, unknown>)
          | null
        if (existingCreated) {
          const patch = {
            title: titleAfter,
            contentMd: contentMdAfter,
            complexity: agentsFile
              ? 'document'
              : ((fmFields['complexity'] as string) ?? existingCreated.complexity ?? 'note'),
            status: agentsFile
              ? 'todo'
              : archive
                ? 'archived'
                : ((fmFields['status'] as string) ?? existingCreated.status ?? 'inbox'),
            priority: fmFields['priority'],
            dueDate: fmFields['dueDate'],
            tags: agentsFile
              ? Array.from(new Set([...(existingCreated.tags ?? []), USER_AGENTS_TAG]))
              : ((fmFields['tags'] as string[]) ?? existingCreated.tags ?? []),
            folderId: folderId ?? null,
            localPath: change.localPathAfter,
            syncHash: hashContent(contentMdAfter),
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
          contentMd: contentMdAfter,
          complexity: agentsFile ? 'document' : ((fmFields['complexity'] as string) ?? 'note'),
          status: agentsFile
            ? 'todo'
            : archive
              ? 'archived'
              : ((fmFields['status'] as string) ?? 'inbox'),
          priority: fmFields['priority'],
          dueDate: fmFields['dueDate'],
          tags: agentsFile ? [USER_AGENTS_TAG] : ((fmFields['tags'] as string[]) ?? []),
          backlinks: [],
          folderId,
          localPath: change.localPathAfter,
          syncHash: hashContent(contentMdAfter),
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
        const { folderId, archive } = await pathToFolderInfo(change.localPathAfter)
        patch['folderId'] = folderId ?? null
        patch['localPath'] = change.localPathAfter
        if (archive && existing['status'] !== 'archived') patch['status'] = 'archived'
      } else {
        if (change.titleAfter !== undefined) patch['title'] = change.titleAfter
        if (change.contentMdAfter !== undefined) {
          const contentMdAfter = isAgentsPath(change.localPathAfter ?? change.localPathBefore)
            ? change.contentMdAfter
            : normalizeIncomingBody(change.titleAfter ?? existing.title, change.contentMdAfter)
          patch['contentMd'] = contentMdAfter
          patch['syncHash'] = hashContent(contentMdAfter)
        }
        if (
          change.localPathAfter !== undefined &&
          change.localPathAfter !== existing['localPath']
        ) {
          // Movimento implícito junto com edição
          const { folderId, archive } = await pathToFolderInfo(change.localPathAfter)
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

      if (patch['folderId'] !== undefined) reconcileItemIds.add(change.itemId)
      if (typeof patch['contentMd'] === 'string') {
        inboxScan.set(change.itemId, patch['contentMd'])
        reconcileItemIds.add(change.itemId)
      }

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

    // Reconcilia o espelho do Drive depois de aplicar as mudanças. Best-effort:
    // cada função já trata os próprios erros, mas blindamos o push de qualquer forma.
    try {
      for (const [itemId, contentMd] of inboxScan) {
        await registerInboxLinks(userId, itemId, contentMd)
      }
      for (const itemId of reconcileItemIds) {
        await reconcileItemAttachments(userId, itemId)
      }
      for (const folderId of reconcileFolderIds) {
        await reconcileFolderMirror(userId, folderId)
      }
    } catch (err) {
      console.warn('[sync/push] reconciliação do Drive falhou:', err)
    }

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
    case 'folder_created':
      return `Pasta criada: ${path}`
    case 'folder_moved':
      return `Pasta movida: ${change.localPathBefore} -> ${change.localPathAfter}`
    case 'folder_renamed':
      return `Pasta renomeada: ${change.folderNameBefore} -> ${change.folderNameAfter}`
    case 'folder_deleted':
      return `Pasta removida: ${path}`
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
