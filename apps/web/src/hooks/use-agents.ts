'use client'

import useSWR, { mutate as globalMutate } from 'swr'
import type { Item } from '@doit/types'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function agentsUrl(folderId: string | null) {
  return `/api/agents?folderId=${encodeURIComponent(folderId ?? 'global')}`
}

async function readError(res: Response, fallback: string) {
  try {
    const data = (await res.json()) as { error?: string }
    return data.error ?? fallback
  } catch {
    return fallback
  }
}

export function useAgentsInstructions(folderId: string | null, enabled = true) {
  const url = agentsUrl(folderId)
  const { data, error, isLoading, mutate } = useSWR<{ item: Item | null }>(
    enabled ? url : null,
    fetcher,
  )
  return {
    item: data?.item ?? null,
    content: data?.item?.contentMd ?? '',
    isLoading,
    isError: !!error,
    mutate,
  }
}

export async function saveAgentsInstructions(folderId: string | null, contentMd: string) {
  const res = await fetch('/api/agents', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ folderId, contentMd }),
  })
  if (!res.ok) throw new Error(await readError(res, 'Falha ao salvar AGENTS.md'))
  const data = (await res.json()) as { item: Item }
  await globalMutate(agentsUrl(folderId))
  return data.item
}
