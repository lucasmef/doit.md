import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ItemModel, ItemVersionModel } from '@doit/db'
import type { UpdateItemInput, Item } from '@doit/types'
import { ensureDB } from '@/lib/db'
import { newVersionId } from '@doit/core'
import { hashContent } from '@doit/sync'
import { reconcileItemAttachments } from '@/lib/drive-reconcile'
import {
  pickItemPatch,
  validateItemPatchInput,
  validateItemReferences,
  validateItemState,
} from '@/lib/api/item-guards'
import { createManualAuditLog } from '@/lib/api/audit-log'

export const dynamic = 'force-dynamic'

type Params = { params: Promise<{ id: string }> }

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

const VERSIONED_NOTE_FIELDS = [
  'title',
  'contentMd',
  'tags',
  'status',
  'folderId',
  'areaId',
] as const

function shouldVersionNote(current: Record<string, unknown>, patch: UpdateItemInput) {
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

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await ensureDB()
    const { id } = await params

    const item = await ItemModel.findOne({ _id: id, userId }).lean()
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    return NextResponse.json({ item: mapDocToItem(item) })
  } catch (err) {
    console.error('[GET /api/items/:id]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await ensureDB()
    const { id } = await params
    const body = pickItemPatch(await req.json())
    const current = await ItemModel.findOne({ _id: id, userId }).lean()
    if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const inputError = validateItemPatchInput(body)
    if (inputError) {
      return NextResponse.json({ error: inputError }, { status: 400 })
    }

    const referenceError = await validateItemReferences(body, userId)
    if (referenceError) {
      return NextResponse.json({ error: referenceError }, { status: 400 })
    }

    const patch = { ...body } as UpdateItemInput
    const rawPatch = patch as Record<string, unknown>
    if (
      body.complexity === 'note' &&
      current['complexity'] !== 'note' &&
      patch.contentMd === undefined
    ) {
      patch.contentMd = mergeTaskTitleIntoNoteContent(current['title'], current['contentMd'])
    }
    if (
      body.complexity === 'task' &&
      current['complexity'] === 'note' &&
      patch.title === undefined &&
      patch.contentMd === undefined
    ) {
      const next = splitNoteContentForTask(current['contentMd'])
      if (next.title) patch.title = next.title
      patch.contentMd = next.contentMd || undefined
    }

    if (shouldVersionNote(current, patch)) {
      await createItemVersionIfChanged(current, userId)
    }

    const merged = { ...mapDocToItem(current), ...patch }
    if (merged.complexity === 'note') {
      merged.priority = undefined
      merged.recurrence = undefined
      merged.dueTime = undefined
      const title = titleFromNoteContent(merged.contentMd)
      if (title) merged.title = title
    }

    const validationError = validateItemState(merged)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const unset: Record<string, ''> = {}
    if (rawPatch['folderId'] === '' || rawPatch['folderId'] === null) {
      delete (patch as { folderId?: unknown }).folderId
      unset.folderId = ''
    }

    const item = await ItemModel.findOneAndUpdate(
      { _id: id, userId },
      {
        $set: {
          ...patch,
          ...(merged.complexity === 'note' ? { title: merged.title } : {}),
          ...(patch.status && patch.status !== 'archived' ? { deletedAt: null } : {}),
          updatedAt: new Date().toISOString(),
        },
        ...(merged.complexity === 'note' || Object.keys(unset).length > 0
          ? {
              $unset: {
                ...(merged.complexity === 'note'
                  ? { priority: '', recurrence: '', dueTime: '' }
                  : {}),
                ...unset,
              },
            }
          : {}),
      },
      { new: true },
    ).lean()

    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Anexo segue a nota: se o folder mudou, reposiciona os arquivos no Drive.
    if (
      Object.prototype.hasOwnProperty.call(body, 'folderId') &&
      (body.folderId ?? null) !== (current['folderId'] ?? null)
    ) {
      await reconcileItemAttachments(userId, id)
    }

    if (
      Object.prototype.hasOwnProperty.call(body, 'status') ||
      Object.prototype.hasOwnProperty.call(body, 'folderId') ||
      Object.prototype.hasOwnProperty.call(body, 'areaId') ||
      Object.prototype.hasOwnProperty.call(body, 'complexity')
    ) {
      await createManualAuditLog({
        userId,
        itemId: id,
        action: 'item_updated',
        summary: `Item atualizado manualmente: ${id}`,
        fieldChanges: Object.keys(body).map((field) => ({
          field,
          before: current[field],
          after: (body as Record<string, unknown>)[field],
        })),
      })
    }

    return NextResponse.json({ item: mapDocToItem(item) })
  } catch (err) {
    console.error('[PATCH /api/items/:id]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { userId } = await auth()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await ensureDB()
    const { id } = await params

    await ItemModel.findOneAndUpdate(
      { _id: id, userId },
      {
        status: 'archived',
        deletedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    )

    await createManualAuditLog({
      userId,
      itemId: id,
      action: 'item_archived',
      summary: `Item arquivado manualmente: ${id}`,
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/items/:id]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
