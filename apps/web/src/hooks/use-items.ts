'use client'

import { useEffect, useSyncExternalStore } from 'react'
import useSWR, { mutate as globalMutate } from 'swr'
import type { Item, CreateItemInput, UpdateItemInput, BulkItemActionInput } from '@doit/types'
import {
  flushOfflineItemQueue,
  getOfflineItemQueue,
  hasOfflineItemQueue,
  onOfflineItemsChanged,
  overlayOfflineItem,
  overlayOfflineItems,
  queueArchiveItem,
  queueCreateItem,
  queueUpdateItem,
} from '@/lib/offline-items'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

async function readError(res: Response, fallback: string) {
  try {
    const data = (await res.json()) as { error?: string }
    return data.error ?? fallback
  } catch {
    return fallback
  }
}

function getOfflineSnapshot() {
  return JSON.stringify(getOfflineItemQueue())
}

function getServerSnapshot() {
  return 'clean'
}

function useOfflineItemsVersion() {
  return useSyncExternalStore(onOfflineItemsChanged, getOfflineSnapshot, getServerSnapshot)
}

function isNetworkFailure(error: unknown) {
  return error instanceof TypeError
}

async function flushAndRevalidateItems() {
  const changed = await flushOfflineItemQueue()
  if (changed) {
    await globalMutate((key: string) => typeof key === 'string' && key.startsWith('/api/items'))
  }
}

function useFlushOfflineItems() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const sync = () => {
      if (navigator.onLine) void flushAndRevalidateItems()
    }

    sync()
    window.addEventListener('online', sync)
    return () => window.removeEventListener('online', sync)
  }, [])
}

export function useItems(params?: { status?: string; projectId?: string; folderId?: string | null; q?: string }) {
  const query = new URLSearchParams()
  if (params?.status) query.set('status', params.status)
  if (params?.projectId) query.set('projectId', params.projectId)
  if (params?.folderId !== undefined) query.set('folderId', params.folderId ?? 'null')
  if (params?.q) query.set('q', params.q)
  const url = `/api/items${query.size ? '?' + query.toString() : ''}`

  useFlushOfflineItems()
  useOfflineItemsVersion()
  const { data, error, isLoading } = useSWR<{ items: Item[] }>(url, fetcher)
  const items = overlayOfflineItems(Array.isArray(data?.items) ? data.items : [], params)

  return {
    items,
    isLoading,
    isError: !!error,
    hasOfflineChanges: hasOfflineItemQueue(),
  }
}

export function useItem(id: string | null) {
  useFlushOfflineItems()
  useOfflineItemsVersion()
  const { data, error, isLoading } = useSWR<{ item: Item }>(id ? `/api/items/${id}` : null, fetcher)
  const item = overlayOfflineItem(data?.item || null, id)

  return {
    item,
    isLoading,
    isError: !!error,
    hasOfflineChanges: hasOfflineItemQueue(),
  }
}

export async function createItem(input: CreateItemInput): Promise<Item> {
  try {
    const res = await fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!res.ok) throw new Error(await readError(res, 'Falha ao criar item'))
    const { item } = await res.json()
    await globalMutate((key: string) => typeof key === 'string' && key.startsWith('/api/items'))
    return item
  } catch (error) {
    if (!isNetworkFailure(error)) throw error
    const item = queueCreateItem(input)
    await globalMutate((key: string) => typeof key === 'string' && key.startsWith('/api/items'))
    return item
  }
}

export async function updateItem(id: string, input: UpdateItemInput): Promise<Item> {
  if (id.startsWith('local_item_')) {
    const item = queueUpdateItem(id, input)
    await globalMutate((key: string) => typeof key === 'string' && key.startsWith('/api/items'))
    return item
  }

  try {
    const res = await fetch(`/api/items/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })
    if (!res.ok) throw new Error(await readError(res, 'Falha ao atualizar item'))
    const { item } = await res.json()
    await globalMutate((key: string) => typeof key === 'string' && key.startsWith('/api/items'))
    await globalMutate(`/api/items/${id}/versions`)
    return item
  } catch (error) {
    if (!isNetworkFailure(error)) throw error
    const item = queueUpdateItem(id, input)
    await globalMutate((key: string) => typeof key === 'string' && key.startsWith('/api/items'))
    return item
  }
}

export async function archiveItem(id: string): Promise<void> {
  if (id.startsWith('local_item_')) {
    queueArchiveItem(id)
    await globalMutate((key: string) => typeof key === 'string' && key.startsWith('/api/items'))
    return
  }

  try {
    const res = await fetch(`/api/items/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error(await readError(res, 'Falha ao arquivar item'))
  } catch (error) {
    if (!isNetworkFailure(error)) throw error
    queueArchiveItem(id)
  } finally {
    await globalMutate((key: string) => typeof key === 'string' && key.startsWith('/api/items'))
  }
}

function normalizeTag(value: string) {
  return value.trim().toLocaleLowerCase('pt-BR').replace(/^@/, '')
}

function patchWithTags(item: Item | undefined, action: BulkItemActionInput): UpdateItemInput {
  const patch = { ...(action.patch ?? {}) } as UpdateItemInput
  if (!action.tagAction) return patch

  const tags = action.tagAction.tags.map(normalizeTag).filter(Boolean)
  const current = item?.tags ?? []
  if (action.tagAction.type === 'set') {
    patch.tags = Array.from(new Set(tags))
  } else if (action.tagAction.type === 'remove') {
    patch.tags = current.filter((tag) => !tags.includes(normalizeTag(tag)))
  } else {
    patch.tags = Array.from(new Set([...current, ...tags]))
  }
  return patch
}

export async function bulkUpdateItems(input: BulkItemActionInput, fallbackItems: Item[] = []): Promise<Item[]> {
  const ids = Array.from(new Set(input.ids.filter(Boolean)))
  if (ids.length === 0) return []

  const fallbackById = new Map(fallbackItems.map((item) => [item.id, item]))

  if (ids.every((id) => id.startsWith('local_item_'))) {
    const items = ids.map((id) => queueUpdateItem(id, patchWithTags(fallbackById.get(id), input), fallbackById.get(id)))
    await globalMutate((key: string) => typeof key === 'string' && key.startsWith('/api/items'))
    return items
  }

  try {
    const res = await fetch('/api/items/bulk', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...input, ids }),
    })
    if (!res.ok) throw new Error(await readError(res, 'Falha ao atualizar itens'))
    const { items } = (await res.json()) as { items: Item[] }
    await globalMutate((key: string) => typeof key === 'string' && key.startsWith('/api/items'))
    await Promise.all(ids.map((id) => globalMutate(`/api/items/${id}/versions`)))
    return items
  } catch (error) {
    if (!isNetworkFailure(error)) throw error

    const items = ids.map((id) => {
      if (input.patch?.status === 'archived') {
        queueArchiveItem(id)
        return {
          ...(fallbackById.get(id) ?? {
            id,
            userId: 'offline',
            title: 'Item offline',
            complexity: 'task' as const,
            status: 'todo' as const,
            tags: [],
            backlinks: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }),
          status: 'archived' as const,
        }
      }
      return queueUpdateItem(id, patchWithTags(fallbackById.get(id), input), fallbackById.get(id))
    })
    await globalMutate((key: string) => typeof key === 'string' && key.startsWith('/api/items'))
    return items
  }
}
