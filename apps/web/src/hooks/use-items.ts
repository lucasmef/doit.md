'use client'

import useSWR, { mutate as globalMutate } from 'swr'
import type { Item, CreateItemInput, UpdateItemInput } from '@doit/types'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function useItems(params?: { status?: string; projectId?: string }) {
  const query = new URLSearchParams()
  if (params?.status) query.set('status', params.status)
  if (params?.projectId) query.set('projectId', params.projectId)
  const url = `/api/items${query.size ? '?' + query.toString() : ''}`

  const { data, error, isLoading } = useSWR<{ items: Item[] }>(url, fetcher)

  return {
    items: Array.isArray(data?.items) ? data.items : [],
    isLoading,
    isError: !!error,
  }
}

export function useItem(id: string | null) {
  const { data, error, isLoading } = useSWR<{ item: Item }>(
    id ? `/api/items/${id}` : null,
    fetcher,
  )

  return {
    item: data?.item || null,
    isLoading,
    isError: !!error,
  }
}

export async function createItem(input: CreateItemInput): Promise<Item> {
  const res = await fetch('/api/items', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error('Falha ao criar item')
  const { item } = await res.json()
  await globalMutate((key: string) => typeof key === 'string' && key.startsWith('/api/items'))
  return item
}

export async function updateItem(id: string, input: UpdateItemInput): Promise<Item> {
  const res = await fetch(`/api/items/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error('Falha ao atualizar item')
  const { item } = await res.json()
  await globalMutate((key: string) => typeof key === 'string' && key.startsWith('/api/items'))
  return item
}

export async function archiveItem(id: string): Promise<void> {
  await fetch(`/api/items/${id}`, { method: 'DELETE' })
  await globalMutate((key: string) => typeof key === 'string' && key.startsWith('/api/items'))
}
