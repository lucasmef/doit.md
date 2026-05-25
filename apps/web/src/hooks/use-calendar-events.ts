'use client'

import useSWR, { mutate as globalMutate } from 'swr'
import type { CalendarEvent, GoogleCalendar } from '@doit/types'

const fetcher = (url: string) => fetch(url).then((r) => r.json())
const CALENDARS_CACHE_KEY = 'doit:google-calendars-cache'

function readCachedCalendars(): GoogleCalendar[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(CALENDARS_CACHE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as GoogleCalendar[]) : []
  } catch {
    return []
  }
}

function writeCachedCalendars(calendars: GoogleCalendar[]) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(CALENDARS_CACHE_KEY, JSON.stringify(calendars))
  } catch {
    // ignore quota errors
  }
}

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

export function useGoogleCalendars() {
  const { data, error, isLoading } = useSWR<{ calendars: GoogleCalendar[] }>(
    '/api/calendar/calendars',
    fetcher,
    {
      fallbackData: { calendars: readCachedCalendars() },
      onSuccess: (result) => writeCachedCalendars(result.calendars ?? []),
    },
  )
  return {
    calendars: data?.calendars ?? [],
    isLoading,
    isError: !!error,
  }
}

export async function syncGoogleCalendar(): Promise<{ synced: number; removed: number }> {
  const res = await fetch('/api/calendar/sync', { method: 'POST' })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error ?? 'Falha ao sincronizar')
  }
  const result = await res.json()
  await globalMutate((key: string) => typeof key === 'string' && key.startsWith('/api/calendar'))
  return result
}

export type CalendarEventUpdate = {
  title: string
  description?: string
  start: string
  end: string
  allDay: boolean
}

export type CalendarEventCreate = CalendarEventUpdate & {
  calendarId?: string
}

export async function createCalendarEvent(input: CalendarEventCreate): Promise<CalendarEvent> {
  const res = await fetch('/api/calendar/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  const result = await res.json()
  if (!res.ok) throw new Error(result.error ?? 'Falha ao criar evento')
  await globalMutate((key: string) => typeof key === 'string' && key.startsWith('/api/calendar'))
  return result.event as CalendarEvent
}

export async function updateCalendarEvent(
  id: string,
  patch: CalendarEventUpdate,
): Promise<CalendarEvent> {
  const res = await fetch(`/api/calendar/events/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  })
  const result = await res.json()
  if (!res.ok) throw new Error(result.error ?? 'Falha ao editar evento')
  await globalMutate((key: string) => typeof key === 'string' && key.startsWith('/api/calendar'))
  return result.event as CalendarEvent
}

export async function deleteCalendarEvent(id: string): Promise<void> {
  const res = await fetch(`/api/calendar/events/${encodeURIComponent(id)}`, { method: 'DELETE' })
  const result = await res.json()
  if (!res.ok) throw new Error(result.error ?? 'Falha ao excluir evento')
  await globalMutate((key: string) => typeof key === 'string' && key.startsWith('/api/calendar'))
}
