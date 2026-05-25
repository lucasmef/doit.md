import type { CreateItemInput, Item, UpdateItemInput } from '@doit/types'

const QUEUE_KEY = 'doitmd.offline.items.queue.v1'
const CHANGE_EVENT = 'doitmd:offline-items-changed'
const REMAP_EVENT = 'doitmd:offline-item-remapped'
const FLUSH_TIMEOUT_MS = 10_000

export type OfflineItemRemapDetail = { tempId: string; itemId: string }

function dispatchRemap(tempId: string, itemId: string) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<OfflineItemRemapDetail>(REMAP_EVENT, { detail: { tempId, itemId } }))
}

export function onOfflineItemRemapped(listener: (detail: OfflineItemRemapDetail) => void) {
  if (typeof window === 'undefined') return () => {}
  const handler = (event: Event) => {
    const detail = (event as CustomEvent<OfflineItemRemapDetail>).detail
    if (detail) listener(detail)
  }
  window.addEventListener(REMAP_EVENT, handler)
  return () => window.removeEventListener(REMAP_EVENT, handler)
}

type CreateOperation = {
  id: string
  type: 'create'
  tempId: string
  input: CreateItemInput
  createdAt: string
}

type UpdateOperation = {
  id: string
  type: 'update'
  itemId: string
  input: UpdateItemInput
  createdAt: string
}

type ArchiveOperation = {
  id: string
  type: 'archive'
  itemId: string
  createdAt: string
}

export type OfflineItemOperation = CreateOperation | UpdateOperation | ArchiveOperation

type ItemFilters = {
  status?: string
  folderId?: string | null
  q?: string
}

function storageAvailable() {
  return typeof window !== 'undefined' && 'localStorage' in window
}

function nowIso() {
  return new Date().toISOString()
}

function newLocalId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

function readQueue(): OfflineItemOperation[] {
  if (!storageAvailable()) return []

  try {
    const raw = window.localStorage.getItem(QUEUE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as OfflineItemOperation[]) : []
  } catch {
    return []
  }
}

function writeQueue(queue: OfflineItemOperation[]) {
  if (!storageAvailable()) return
  window.localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT))
}

async function fetchForOfflineFlush(input: RequestInfo | URL, init?: RequestInit) {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), FLUSH_TIMEOUT_MS)
  try {
    return await fetch(input, { ...init, signal: controller.signal })
  } finally {
    window.clearTimeout(timer)
  }
}

function normalizeCreatedItem(tempId: string, input: CreateItemInput, createdAt: string): Item {
  const complexity = input.complexity ?? 'task'
  const hasInboxContext = !input.folderId && !input.dueDate && !input.scheduledDate
  const title =
    complexity === 'note'
      ? titleFromNoteContent(input.contentMd) || input.title || 'Nota offline'
      : input.title

  return {
    id: tempId,
    userId: 'offline',
    title,
    contentMd: input.contentMd,
    complexity,
    status: input.status ?? (hasInboxContext ? 'inbox' : 'todo'),
    priority: complexity === 'note' ? undefined : input.priority,
    dueDate: input.dueDate,
    dueTime: complexity === 'note' ? undefined : input.dueTime,
    recurrence: complexity === 'note' ? undefined : input.recurrence,
    startDate: input.startDate,
    scheduledDate: input.scheduledDate,
    folderId: input.folderId,
    areaId: input.areaId,
    parentId: input.parentId,
    tags: input.tags ?? [],
    backlinks: [],
    createdAt,
    updatedAt: createdAt,
  }
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

function mergeTaskTitleIntoNoteContent(title: string | undefined, contentMd: string | undefined) {
  return [title?.trim(), contentMd?.trim()].filter(Boolean).join('\n\n')
}

function splitNoteContentForTask(contentMd: string | undefined) {
  const lines = (contentMd ?? '').split(/\r?\n/)
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

function applyUpdate(item: Item, input: UpdateItemInput, updatedAt: string): Item {
  const patch = { ...input }
  if (input.complexity === 'note' && item.complexity !== 'note' && patch.contentMd === undefined) {
    patch.contentMd = mergeTaskTitleIntoNoteContent(item.title, item.contentMd)
  }
  if (
    input.complexity === 'task' &&
    item.complexity === 'note' &&
    patch.title === undefined &&
    patch.contentMd === undefined
  ) {
    const next = splitNoteContentForTask(item.contentMd)
    if (next.title) patch.title = next.title
    patch.contentMd = next.contentMd || undefined
  }

  const merged: Item = { ...item, ...patch, updatedAt }
  if (merged.complexity === 'note') {
    merged.priority = undefined
    merged.recurrence = undefined
    merged.dueTime = undefined
    const title = titleFromNoteContent(merged.contentMd)
    if (title) merged.title = title
  }
  if (input.status && input.status !== 'archived') {
    merged.deletedAt = undefined
  }
  return merged
}

function matchesFilters(item: Item, filters?: ItemFilters) {
  if (filters?.status === 'closed') {
    if (item.status !== 'done' && item.status !== 'archived') return false
  } else if (filters?.status) {
    if (item.status !== filters.status) return false
  } else if (item.deletedAt || item.status === 'archived') {
    return false
  }

  if (filters?.folderId !== undefined) {
    const target = filters.folderId
    if (target === null && item.folderId) return false
    if (typeof target === 'string' && item.folderId !== target) return false
  }

  const q = filters?.q?.trim().toLocaleLowerCase('pt-BR')
  if (q) {
    const haystack = [item.title, item.contentMd, item.tags.join(' ')]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase('pt-BR')
    if (!haystack.includes(q)) return false
  }

  return true
}

function sortItems(items: Item[]) {
  return [...items].sort((a, b) => {
    const ao = typeof a.order === 'number' ? a.order : Number.POSITIVE_INFINITY
    const bo = typeof b.order === 'number' ? b.order : Number.POSITIVE_INFINITY
    if (ao !== bo) return ao - bo
    return b.updatedAt.localeCompare(a.updatedAt)
  })
}

export function onOfflineItemsChanged(listener: () => void) {
  if (typeof window === 'undefined') return () => {}

  const handleStorage = (event: StorageEvent) => {
    if (event.key === QUEUE_KEY) listener()
  }

  window.addEventListener(CHANGE_EVENT, listener)
  window.addEventListener('storage', handleStorage)

  return () => {
    window.removeEventListener(CHANGE_EVENT, listener)
    window.removeEventListener('storage', handleStorage)
  }
}

export function getOfflineItemQueue() {
  return readQueue()
}

export function hasOfflineItemQueue() {
  return readQueue().length > 0
}

export function overlayOfflineItems(items: Item[], filters?: ItemFilters) {
  const byId = new Map(items.map((item) => [item.id, item]))
  const queue = readQueue()

  for (const operation of queue) {
    if (operation.type === 'create') {
      byId.set(
        operation.tempId,
        normalizeCreatedItem(operation.tempId, operation.input, operation.createdAt),
      )
      continue
    }

    const item = byId.get(operation.itemId)
    if (!item) continue

    if (operation.type === 'update') {
      byId.set(operation.itemId, applyUpdate(item, operation.input, operation.createdAt))
    } else {
      byId.set(operation.itemId, {
        ...item,
        status: 'archived',
        deletedAt: operation.createdAt,
        updatedAt: operation.createdAt,
      })
    }
  }

  return sortItems([...byId.values()].filter((item) => matchesFilters(item, filters)))
}

export function overlayOfflineItem(item: Item | null, id: string | null) {
  const queue = readQueue()
  let current = item

  for (const operation of queue) {
    if (operation.type === 'create' && operation.tempId === id) {
      current = normalizeCreatedItem(operation.tempId, operation.input, operation.createdAt)
      continue
    }
    if (operation.type === 'create') continue

    if (!current || operation.itemId !== current.id) continue

    if (operation.type === 'update') {
      current = applyUpdate(current, operation.input, operation.createdAt)
    } else {
      current = {
        ...current,
        status: 'archived',
        deletedAt: operation.createdAt,
        updatedAt: operation.createdAt,
      }
    }
  }

  return current
}

export function queueCreateItem(input: CreateItemInput): Item {
  const createdAt = nowIso()
  const tempId = newLocalId('local_item')
  const operation: CreateOperation = {
    id: newLocalId('op'),
    type: 'create',
    tempId,
    input,
    createdAt,
  }

  writeQueue([...readQueue(), operation])
  return normalizeCreatedItem(tempId, input, createdAt)
}

export function queueUpdateItem(itemId: string, input: UpdateItemInput, fallbackItem?: Item): Item {
  const queue = readQueue()
  const createdAt = nowIso()
  const pendingCreate = queue.find(
    (operation): operation is CreateOperation =>
      operation.type === 'create' && operation.tempId === itemId,
  )

  if (pendingCreate) {
    pendingCreate.input = { ...pendingCreate.input, ...input }
    pendingCreate.createdAt = createdAt
    writeQueue(queue)
    return normalizeCreatedItem(pendingCreate.tempId, pendingCreate.input, pendingCreate.createdAt)
  }

  const operation: UpdateOperation = {
    id: newLocalId('op'),
    type: 'update',
    itemId,
    input,
    createdAt,
  }

  writeQueue([...queue, operation])

  if (fallbackItem) return applyUpdate(fallbackItem, input, createdAt)
  return {
    id: itemId,
    userId: 'offline',
    title: input.title ?? 'Item offline',
    complexity: input.complexity ?? 'task',
    status: input.status ?? 'todo',
    tags: input.tags ?? [],
    backlinks: input.backlinks ?? [],
    createdAt,
    updatedAt: createdAt,
    ...input,
  }
}

export function queueArchiveItem(itemId: string) {
  const queue = readQueue()
  const pendingCreate = queue.find(
    (operation): operation is CreateOperation =>
      operation.type === 'create' && operation.tempId === itemId,
  )

  if (pendingCreate) {
    writeQueue(queue.filter((operation) => operation.id !== pendingCreate.id))
    return
  }

  const createdAt = nowIso()
  writeQueue([
    ...queue,
    {
      id: newLocalId('op'),
      type: 'archive',
      itemId,
      createdAt,
    },
  ])
}

let flushPromise: Promise<boolean> | null = null

export async function flushOfflineItemQueue() {
  if (flushPromise) return flushPromise
  flushPromise = flushOfflineItemQueueOnce().finally(() => {
    flushPromise = null
  })
  return flushPromise
}

async function flushOfflineItemQueueOnce() {
  const queue = readQueue()
  if (!queue.length) return false

  const idMap = new Map<string, string>()
  let anySuccess = false

  for (const operation of queue) {
    const remaining = readQueue()
    const current = remaining.find((entry) => entry.id === operation.id)
    if (!current) continue

    try {
      if (current.type === 'create') {
        const response = await fetchForOfflineFlush('/api/items', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(current.input),
        })
        if (response.status === 401 || response.status >= 500) throw new Error('retry')
        if (response.ok) {
          const { item } = (await response.json()) as { item: Item }
          idMap.set(current.tempId, item.id)
          dispatchRemap(current.tempId, item.id)
        } else {
          console.warn('[offline-sync] dropping create after client error', response.status)
        }
      } else if (current.type === 'update') {
        const itemId = idMap.get(current.itemId) ?? current.itemId
        const response = await fetchForOfflineFlush(`/api/items/${itemId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(current.input),
        })
        if (response.status === 401 || response.status >= 500) throw new Error('retry')
        if (!response.ok)
          console.warn('[offline-sync] dropping update after client error', response.status)
      } else {
        const itemId = idMap.get(current.itemId) ?? current.itemId
        const response = await fetchForOfflineFlush(`/api/items/${itemId}`, { method: 'DELETE' })
        if (response.status === 401 || response.status >= 500) throw new Error('retry')
        if (!response.ok)
          console.warn('[offline-sync] dropping archive after client error', response.status)
      }

      writeQueue(readQueue().filter((entry) => entry.id !== current.id))
      anySuccess = true
    } catch (error) {
      if (
        error instanceof TypeError ||
        error instanceof DOMException ||
        (error instanceof Error && error.message === 'retry')
      ) {
        // Offline, timeout, auth, or server failure: keep operation queued and stop trying for now.
        throw error
      }
      console.warn('[offline-sync] dropping operation after error', current, error)
      writeQueue(readQueue().filter((entry) => entry.id !== current.id))
    }
  }

  return anySuccess
}
