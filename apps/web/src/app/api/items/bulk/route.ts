import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ensureDB } from '@/lib/db'
import { ItemModel, ItemVersionModel } from '@doit/db'
import { newVersionId } from '@doit/core'
import { hashContent } from '@doit/sync'
import type { BulkItemActionInput, Item, UpdateItemInput } from '@doit/types'
import { reconcileItemAttachments } from '@/lib/drive-reconcile'
import {
  pickItemPatch,
  validateItemPatchInput,
  validateItemReferences,
  validateItemState,
} from '@/lib/api/item-guards'
import { createManualAuditLog } from '@/lib/api/audit-log'

export const dynamic = 'force-dynamic'

type LoosePatch = UpdateItemInput & Record<string, unknown>

function mapDocToItem(doc: unknown): Item {
  const { _id, ...rest } = doc as { _id: string; [key: string]: unknown }
  return { id: _id, ...rest } as unknown as Item
}

function titleFromNoteContent(contentMd: string | undefined) {
  const firstLine =
    contentMd
      ?.split(/\r?\n/)
      .find((line) => line.trim())
      ?.trim() ?? ''
  return firstLine
    .replace(/^#{1,6}\s+/, '')
    .replace(/[*_`[\]]/g, '')
    .trim()
}

function mergeTaskTitleIntoNoteContent(title: unknown, contentMd: unknown) {
  return [String(title ?? '').trim(), String(contentMd ?? '').trim()].filter(Boolean).join('\n\n')
}

function splitNoteContentForTask(contentMd: unknown) {
  const lines = String(contentMd ?? '').split(/\r?\n/)
  const titleIndex = lines.findIndex((line) => line.trim())
  if (titleIndex === -1) return { title: '', contentMd: '' }

  return {
    title: titleFromNoteContent(lines[titleIndex]),
    contentMd: lines
      .slice(titleIndex + 1)
      .join('\n')
      .trim(),
  }
}

function normalizeTag(value: string) {
  return value.trim().toLocaleLowerCase('pt-BR').replace(/^@/, '')
}

function mergeTags(current: unknown, action: BulkItemActionInput['tagAction']) {
  const existing = Array.isArray(current) ? current.map(String) : []
  if (!action) return existing
  const tags = action.tags.map(normalizeTag).filter(Boolean)
  if (action.type === 'set') return Array.from(new Set(tags))
  if (action.type === 'remove') return existing.filter((tag) => !tags.includes(normalizeTag(tag)))
  return Array.from(new Set([...existing, ...tags]))
}

const VERSIONED_NOTE_FIELDS = [
  'title',
  'contentMd',
  'tags',
  'status',
  'folderId',
  'areaId',
] as const

function shouldVersionNote(current: Record<string, unknown>, patch: LoosePatch) {
  if (current['complexity'] !== 'note') return false
  return VERSIONED_NOTE_FIELDS.some((field) => Object.prototype.hasOwnProperty.call(patch, field))
}

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

async function createItemVersionIfChanged(item: Record<string, unknown>, userId: string) {
  const itemId = String(item['_id'] ?? item['id'])
  const snapshot = itemSnapshot(item)
  const syncHash = hashContent(JSON.stringify(snapshot))
  const latest = await ItemVersionModel.find({ itemId, userId })
    .sort({ createdAt: -1 })
    .limit(1)
    .lean()
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

function buildPatch(current: Record<string, unknown>, body: BulkItemActionInput, now: string) {
  const patch: LoosePatch = { ...pickItemPatch(body.patch ?? {}) }
  if (body.tagAction) patch.tags = mergeTags(current['tags'], body.tagAction)

  if (
    patch.complexity === 'note' &&
    current['complexity'] !== 'note' &&
    patch.contentMd === undefined
  ) {
    patch.contentMd = mergeTaskTitleIntoNoteContent(current['title'], current['contentMd'])
  }
  if (
    patch.complexity === 'task' &&
    current['complexity'] === 'note' &&
    patch.title === undefined &&
    patch.contentMd === undefined
  ) {
    const next = splitNoteContentForTask(current['contentMd'])
    if (next.title) patch.title = next.title
    patch.contentMd = next.contentMd || undefined
  }

  const merged = { ...mapDocToItem(current), ...patch }
  const unset: Record<string, ''> = {}

  if (merged.complexity === 'note') {
    delete patch.priority
    delete patch.recurrence
    delete patch.dueTime
    unset.priority = ''
    unset.recurrence = ''
    unset.dueTime = ''
    const title = titleFromNoteContent(merged.contentMd)
    if (title) patch.title = title
  }

  const rawPatch = patch as Record<string, unknown>

  if (patch.priority === 4 || rawPatch['priority'] === null) {
    delete patch.priority
    unset.priority = ''
  }
  if (rawPatch['recurrence'] === '' || rawPatch['recurrence'] === null) {
    delete patch.recurrence
    unset.recurrence = ''
  }
  if (rawPatch['dueDate'] === '' || rawPatch['dueDate'] === null) {
    delete patch.dueDate
    delete patch.dueTime
    unset.dueDate = ''
    unset.dueTime = ''
  }
  if (rawPatch['dueTime'] === '' || rawPatch['dueTime'] === null) {
    delete patch.dueTime
    unset.dueTime = ''
  }
  if (rawPatch['folderId'] === '' || rawPatch['folderId'] === null) {
    delete (patch as { folderId?: unknown }).folderId
    unset.folderId = ''
  }

  const set: Record<string, unknown> = { ...patch, updatedAt: now }
  if (patch.status === 'archived') set.deletedAt = now
  if (patch.status && patch.status !== 'archived') unset.deletedAt = ''

  return { set, unset, versionPatch: patch }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await ensureDB()

    const rawBody = (await req.json()) as BulkItemActionInput
    const body: BulkItemActionInput = {
      ids: rawBody.ids,
      patch: rawBody.patch ? pickItemPatch(rawBody.patch) : undefined,
      tagAction: rawBody.tagAction,
    }
    const ids = Array.from(new Set((body.ids ?? []).filter(Boolean)))
    if (ids.length === 0) return NextResponse.json({ error: 'ids are required' }, { status: 400 })
    if (!body.patch && !body.tagAction)
      return NextResponse.json({ error: 'patch or tagAction is required' }, { status: 400 })

    if (body.patch) {
      const inputError = validateItemPatchInput(body.patch)
      if (inputError) {
        return NextResponse.json({ error: inputError }, { status: 400 })
      }

      const referenceError = await validateItemReferences(body.patch, userId)
      if (referenceError) {
        return NextResponse.json({ error: referenceError }, { status: 400 })
      }
    }

    const now = new Date().toISOString()
    const updated: Item[] = []
    const reconcileItemIds = new Set<string>()

    for (const id of ids) {
      const current = await ItemModel.findOne({ _id: id, userId }).lean()
      if (!current) continue

      const { set, unset, versionPatch } = buildPatch(current, body, now)
      const validationError = validateItemState({ ...mapDocToItem(current), ...set })
      if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 400 })
      }

      if (shouldVersionNote(current, versionPatch)) {
        await createItemVersionIfChanged(current, userId)
      }

      const item = await ItemModel.findOneAndUpdate(
        { _id: id, userId },
        {
          $set: set,
          ...(Object.keys(unset).length > 0 ? { $unset: unset } : {}),
        },
        { new: true },
      ).lean()

      if (item) {
        updated.push(mapDocToItem(item))
        // Anexo segue a nota: detecta mudança de folder pra reposicionar no Drive.
        const folderUnset = Object.prototype.hasOwnProperty.call(unset, 'folderId')
        const folderSet = Object.prototype.hasOwnProperty.call(set, 'folderId')
        const folderChanged = folderUnset
          ? (current['folderId'] ?? null) !== null
          : folderSet && (set['folderId'] ?? null) !== (current['folderId'] ?? null)
        if (folderChanged) reconcileItemIds.add(id)
      }
    }

    try {
      for (const id of reconcileItemIds) {
        await reconcileItemAttachments(userId, id)
      }
    } catch (err) {
      console.warn('[items/bulk] reconciliação do Drive falhou:', err)
    }

    if (
      updated.length > 0 &&
      body.patch &&
      (Object.prototype.hasOwnProperty.call(body.patch, 'status') ||
        Object.prototype.hasOwnProperty.call(body.patch, 'folderId') ||
        Object.prototype.hasOwnProperty.call(body.patch, 'areaId') ||
        Object.prototype.hasOwnProperty.call(body.patch, 'complexity'))
    ) {
      await createManualAuditLog({
        userId,
        action: 'items_bulk_updated',
        summary: `${updated.length} item(ns) atualizado(s) em massa manualmente.`,
        fieldChanges: Object.keys(body.patch).map((field) => ({
          field,
          after: (body.patch as Record<string, unknown>)[field],
        })),
      })
    }

    return NextResponse.json({ items: updated })
  } catch (err) {
    console.error('[PATCH /api/items/bulk]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
