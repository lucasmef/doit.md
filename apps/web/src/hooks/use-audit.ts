'use client'

import useSWR, { mutate as globalMutate } from 'swr'
import type { AuditLog, PendingChange } from '@doit/types'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function useAuditLogs(itemId?: string) {
  const url = itemId ? `/api/audit/logs?itemId=${itemId}` : '/api/audit/logs'
  const { data, error, isLoading } = useSWR<{ logs: AuditLog[] }>(url, fetcher)
  return { logs: data?.logs ?? [], isLoading, isError: !!error }
}

export function usePendingChanges() {
  const { data, error, isLoading, mutate } = useSWR<{ changes: PendingChange[] }>(
    '/api/sync/pending',
    fetcher,
    { refreshInterval: 10_000 },
  )
  return {
    changes: data?.changes ?? [],
    isLoading,
    isError: !!error,
    refresh: mutate,
  }
}

export async function approveChange(id: string): Promise<void> {
  await fetch('/api/sync/approve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })
  await globalMutate('/api/sync/pending')
}

export async function rejectChange(id: string): Promise<void> {
  await fetch('/api/sync/reject', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  })
  await globalMutate('/api/sync/pending')
}

export async function applyApprovedChanges(): Promise<{ applied: number }> {
  const pendingRes = await fetch('/api/sync/pending')
  const { changes } = await pendingRes.json()
  const approved = (changes as PendingChange[]).filter((c) => c.approved)

  const res = await fetch('/api/sync/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ changes: approved }),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? 'Falha no push')
  }
  const result = await res.json()
  await globalMutate('/api/sync/pending')
  await globalMutate('/api/audit/logs')
  await globalMutate((key: string) => typeof key === 'string' && key.startsWith('/api/items'))
  return result
}
