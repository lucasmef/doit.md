'use client'

import useSWR, { mutate as globalMutate } from 'swr'
import type { CalendarEvent } from '@doit/types'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function useCalendarEvents(from?: string, to?: string) {
  const params = new URLSearchParams()
  if (from) params.set('from', from)
  if (to) params.set('to', to)
  const url = `/api/calendar/events${params.size ? '?' + params.toString() : ''}`

  const { data, error, isLoading } = useSWR<{ events: CalendarEvent[] }>(url, fetcher)
  return {
    events: data?.events ?? [],
    isLoading,
    isError: !!error,
  }
}

export async function syncGoogleCalendar(): Promise<{ synced: number }> {
  const res = await fetch('/api/calendar/sync', { method: 'POST' })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? 'Falha ao sincronizar')
  }
  const result = await res.json()
  await globalMutate((key: string) => typeof key === 'string' && key.startsWith('/api/calendar'))
  return result
}
