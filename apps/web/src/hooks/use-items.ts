'use client'

import { useEffect, useSyncExternalStore } from 'react'
import useSWR, { mutate as globalMutate } from 'swr'
import type { Item, CreateItemInput, UpdateItemInput } from '@doit/types'
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

export function useItems(params?: { status?: string; projectId?: string; q?: string }) {
  const query = new URLSearchParams()
  if (params?.status) query.set('status', params.status)
  if (params?.projectId) query.set('projectId', params.projectId)
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
