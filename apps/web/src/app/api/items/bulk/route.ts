import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ensureDB } from '@/lib/db'
import { ItemModel, ItemVersionModel } from '@doit/db'
import { newVersionId } from '@doit/core'
import { hashContent } from '@doit/sync'
import type { BulkItemActionInput, Item, UpdateItemInput } from '@doit/types'

export const dynamic = 'force-dynamic'

type LoosePatch = UpdateItemInput & Record<string, unknown>

function mapDocToItem(doc: unknown): Item {
  const { _id, ...rest } = doc as { _id: string; [key: string]: unknown }
  return { id: _id, ...rest } as unknown as Item
}

function titleFromNoteContent(contentMd: string | undefined) {
  const firstLine = contentMd?.split(/\r?\n/).find((line) => line.trim())?.trim() ?? ''
  return firstLine.replace(/^#{1,6}\s+/, '').replace(/[*_`[\]]/g, '').trim()
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

const VERSIONED_NOTE_FIELDS = ['title', 'contentMd', 'tags', 'status', 'projectId', 'areaId'] as const

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
    projectId: item['projectId'],
    areaId: item['areaId'],
  }
}

async function createItemVersionIfChanged(item: Record<string, unknown>, userId: string) {
  const itemId = String(item['_id'] ?? item['id'])
  const snapshot = itemSnapshot(item)
  const syncHash = hashContent(JSON.stringify(snapshot))
  const latest = await ItemVersionModel.find({ itemId, userId }).sort({ createdAt: -1 }).limit(1).lean()
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
  const patch: LoosePatch = { ...(body.patch ?? {}) }
  if (body.tagAction) patch.tags = mergeTags(current['tags'], body.tagAction)

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
  if (rawPatch['projectId'] === '' || rawPatch['projectId'] === null) {
    delete patch.projectId
    unset.projectId = ''
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

    const body = (await req.json()) as BulkItemActionInput
    const ids = Array.from(new Set((body.ids ?? []).filter(Boolean)))
    if (ids.length === 0) return NextResponse.json({ error: 'ids are required' }, { status: 400 })
    if (!body.patch && !body.tagAction) return NextResponse.json({ error: 'patch or tagAction is required' }, { status: 400 })

    const now = new Date().toISOString()
    const updated: Item[] = []

    for (const id of ids) {
      const current = await ItemModel.findOne({ _id: id, userId }).lean()
      if (!current) continue

      const { set, unset, versionPatch } = buildPatch(current, body, now)
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

      if (item) updated.push(mapDocToItem(item))
    }

    return NextResponse.json({ items: updated })
  } catch (err) {
    console.error('[PATCH /api/items/bulk]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
