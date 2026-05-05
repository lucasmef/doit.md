'use client'

import useSWR, { mutate as globalMutate } from 'swr'
import type { Area, CreateAreaInput } from '@doit/types'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function useAreas() {
  const { data, error, isLoading } = useSWR<{ areas: Area[] }>('/api/areas', fetcher)
  return { areas: data?.areas ?? [], isLoading, isError: !!error }
}

export async function createArea(input: CreateAreaInput): Promise<Area> {
  const res = await fetch('/api/areas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error('Falha ao criar área')
  const { area } = await res.json()
  await globalMutate('/api/areas')
  return area
}
