'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { CalendarEvent, GoogleCalendar } from '@doit/types'
import { toLocalDateKey } from '@doit/core'
import { createCalendarEvent, useGoogleCalendars } from '@/hooks/use-calendar-events'
import { usePreferences } from '@/hooks/use-preferences'
import { useToast } from '@/components/ui/toast'
import { useUI } from '@/store/ui'

const DATE_WORD_SHORTCUT =
  /(?:^|\s)(hoje|amanh[aã]|depois de amanh[aã]|fim de semana|final de semana|semana que vem|segunda(?:-feira)?|ter[cç]a(?:-feira)?|quarta(?:-feira)?|quinta(?:-feira)?|sexta(?:-feira)?|s[aá]bado|domingo)\b/iu
const SLASH_DATE_SHORTCUT = /(?:^|\s)(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/u
const ISO_DATE_SHORTCUT = /(?:^|\s)(\d{4}-\d{2}-\d{2})\b/u
const TIME_SHORTCUT = /(?:^|\s)(?:as\s+|às\s+)?([01]?\d|2[0-3])(?::([0-5]\d)|h([0-5]\d)?)\b/iu
const INLINE_METADATA_PATTERN =
  /(\b(?:hoje|amanh[aã]|depois de amanh[aã]|fim de semana|final de semana|semana que vem|segunda(?:-feira)?|ter[cç]a(?:-feira)?|quarta(?:-feira)?|quinta(?:-feira)?|sexta(?:-feira)?|s[aá]bado|domingo)\b|\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b|\b\d{4}-\d{2}-\d{2}\b|\b(?:as\s+|às\s+)?(?:[01]?\d|2[0-3])(?::[0-5]\d|h[0-5]\d?)\b)/giu

const TIME_SUGGESTIONS = ['09:00', '12:00', '14:00', '18:00']

function toDateInputValue(date: Date) {
  return toLocalDateKey(date)
}

function dateAfter(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return toDateInputValue(date)
}

function nextWeekday(targetDay: number, minimumDays = 1) {
  const date = new Date()
  let days = (targetDay - date.getDay() + 7) % 7
  if (days < minimumDays) days += 7
  date.setDate(date.getDate() + days)
  return toDateInputValue(date)
}

function normalizeToken(value: string) {
  return value.trim().toLocaleLowerCase('pt-BR')
}

function parseSlashDate(dayText: string, monthText: string, yearText?: string) {
  const day = Number(dayText)
  const month = Number(monthText)
  const now = new Date()
  let year = yearText ? Number(yearText) : now.getFullYear()
  if (yearText?.length === 2) year += 2000
  if (!day || !month || month > 12 || day > 31) return ''

  let date = new Date(year, month - 1, day)
  if (!yearText && toDateInputValue(date) < toDateInputValue(now)) {
    date = new Date(year + 1, month - 1, day)
  }
  if (date.getDate() !== day || date.getMonth() !== month - 1) return ''
  return toDateInputValue(date)
}

function parseDateWord(value: string) {
  const token = normalizeToken(value)
  if (token === 'hoje') return toDateInputValue(new Date())
  if (token === 'amanha' || token === 'amanhã') return dateAfter(1)
  if (token === 'depois de amanha' || token === 'depois de amanhã') return dateAfter(2)
  if (token === 'fim de semana' || token === 'final de semana') return nextWeekday(6)
  if (token === 'semana que vem') return nextWeekday(1)

  const weekdays: Record<string, number> = {
    domingo: 0,
    segunda: 1,
    'segunda-feira': 1,
    terca: 2,
    terça: 2,
    'terca-feira': 2,
    'terça-feira': 2,
    quarta: 3,
    'quarta-feira': 3,
    quinta: 4,
    'quinta-feira': 4,
    sexta: 5,
    'sexta-feira': 5,
    sabado: 6,
    sábado: 6,
  }
  const weekday = weekdays[token]
  return weekday === undefined ? '' : nextWeekday(weekday)
}

function parseInlineDate(value: string) {
  const wordMatch = value.match(DATE_WORD_SHORTCUT)
  if (wordMatch?.[1]) return parseDateWord(wordMatch[1])

  const slashMatch = value.match(SLASH_DATE_SHORTCUT)
  if (slashMatch?.[1] && slashMatch[2]) {
    return parseSlashDate(slashMatch[1], slashMatch[2], slashMatch[3])
  }

  const isoMatch = value.match(ISO_DATE_SHORTCUT)
  if (isoMatch?.[1] && !Number.isNaN(new Date(`${isoMatch[1]}T12:00:00`).getTime())) {
    return isoMatch[1]
  }

  return ''
}

function parseInlineTime(value: string) {
  const match = value.match(TIME_SHORTCUT)
  if (!match?.[1]) return ''
  const hour = match[1].padStart(2, '0')
  const minute = match[2] ?? match[3] ?? '00'
  return `${hour}:${minute.padStart(2, '0')}`
}

function cleanTitle(value: string) {
  return value
    .replace(DATE_WORD_SHORTCUT, ' ')
    .replace(SLASH_DATE_SHORTCUT, ' ')
    .replace(ISO_DATE_SHORTCUT, ' ')
    .replace(TIME_SHORTCUT, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function isInlineMetadata(value: string) {
  return (
    DATE_WORD_SHORTCUT.test(value) ||
    SLASH_DATE_SHORTCUT.test(value) ||
    ISO_DATE_SHORTCUT.test(value) ||
    TIME_SHORTCUT.test(value)
  )
}

function buildDateTime(date: string, time: string) {
  return new Date(`${date}T${time}:00`).toISOString()
}

function addMinutesToDateTime(date: string, time: string, minutes: number) {
  const value = new Date(`${date}T${time}:00`)
  value.setMinutes(value.getMinutes() + minutes)
  return {
    date: toDateInputValue(value),
    time: `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(
      2,
      '0',
    )}`,
  }
}

function formatTimeLabel(time: string) {
  const [hour, minute] = time.split(':')
  const date = new Date()
  date.setHours(Number(hour), Number(minute), 0, 0)
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function canWriteCalendar(calendar: GoogleCalendar) {
  return !calendar.accessRole || calendar.accessRole === 'owner' || calendar.accessRole === 'writer'
}

function resolveDefaultCalendar(
  calendars: GoogleCalendar[],
  preferredCalendarId: string,
): string {
  const writableCalendars = calendars.filter(canWriteCalendar)
  return (
    writableCalendars.find((calendar) => calendar.id === preferredCalendarId)?.id ??
    writableCalendars.find((calendar) => calendar.primary)?.id ??
    writableCalendars[0]?.id ??
    (preferredCalendarId || 'primary')
  )
}

export function CalendarEventCapture() {
  const {
    calendarEventCaptureOpen,
    calendarEventCaptureDate,
    setCalendarEventCaptureOpen,
  } = useUI()
  const { toast } = useToast()
  const { calendars } = useGoogleCalendars()
  const { prefs, update } = usePreferences()
  const titleRef = useRef<HTMLInputElement>(null)
  const selectedDate = calendarEventCaptureDate ?? toDateInputValue(new Date())
  const writableCalendars = useMemo(() => calendars.filter(canWriteCalendar), [calendars])
  const duration = prefs.defaultCalendarEventDurationMinutes
  const preferredCalendarId = prefs.defaultCalendarId

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [allDay, setAllDay] = useState(false)
  const [date, setDate] = useState(selectedDate)
  const [endDate, setEndDate] = useState(selectedDate)
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState(addMinutesToDateTime(selectedDate, '09:00', duration).time)
  const [calendarId, setCalendarId] = useState(resolveDefaultCalendar(calendars, preferredCalendarId))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!calendarEventCaptureOpen) return
    const nextCalendarId = resolveDefaultCalendar(calendars, preferredCalendarId)
    const nextEnd = addMinutesToDateTime(selectedDate, '09:00', duration)
    setTitle('')
    setDescription('')
    setAllDay(false)
    setDate(selectedDate)
    setEndDate(nextEnd.date)
    setStartTime('09:00')
    setEndTime(nextEnd.time)
    setCalendarId(nextCalendarId)
    requestAnimationFrame(() => titleRef.current?.focus())
  }, [calendarEventCaptureOpen, calendars, duration, preferredCalendarId, selectedDate])

  if (!calendarEventCaptureOpen) return null

  function close() {
    setCalendarEventCaptureOpen(false)
  }

  function applyTitleShortcuts(value: string) {
    setTitle(value)
    const inlineDate = parseInlineDate(value)
    const inlineTime = parseInlineTime(value)
    const nextDate = inlineDate || date
    if (inlineDate) {
      setDate(inlineDate)
      if (endDate < inlineDate) setEndDate(inlineDate)
    }
    if (inlineTime) {
      const nextEnd = addMinutesToDateTime(nextDate, inlineTime, duration)
      setStartTime(inlineTime)
      setEndDate(nextEnd.date)
      setEndTime(nextEnd.time)
      setAllDay(false)
    }
  }

  function handleStartTimeChange(nextTime: string) {
    const nextEnd = addMinutesToDateTime(date, nextTime, duration)
    setStartTime(nextTime)
    setEndDate(nextEnd.date)
    setEndTime(nextEnd.time)
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const parsedTitle = cleanTitle(title)
    if (!parsedTitle) return

    setSaving(true)
    try {
      const saved: CalendarEvent = await createCalendarEvent({
        title: parsedTitle,
        description,
        calendarId,
        allDay,
        start: allDay ? date : buildDateTime(date, startTime),
        end: allDay ? endDate : buildDateTime(endDate, endTime),
      })
      toast(`Evento criado: ${saved.title}`, 'success')
      close()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao criar evento.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end bg-navy-900/35 p-3 backdrop-blur-sm sm:items-center sm:justify-center"
      role="dialog"
      aria-modal="true"
      onClick={(clickEvent) => {
        if (clickEvent.target === clickEvent.currentTarget) close()
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="flex max-h-[calc(100dvh-1.5rem)] w-full flex-col overflow-hidden rounded-2xl border border-ui-border bg-white shadow-cool-lg sm:max-w-lg"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-ui-border-soft px-4 py-4">
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-bold uppercase tracking-wide text-brand-600">
              Google Calendar
            </p>
            <h2 className="mt-1 text-xl font-bold text-navy-900">Novo evento</h2>
          </div>
          <button
            type="button"
            onClick={close}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-navy-400 hover:bg-surface-soft hover:text-navy-700"
            aria-label="Fechar evento"
          >
            x
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 text-[14px] text-navy-700">
          {writableCalendars.length > 0 ? (
            <label className="block">
              <span className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-wide text-navy-300">
                Calendario
              </span>
              <select
                value={calendarId}
                onChange={(inputEvent) => {
                  const next = inputEvent.target.value
                  setCalendarId(next)
                  update({ defaultCalendarId: next })
                }}
                className="h-10 w-full rounded-lg border border-ui-border bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-brand-100"
              >
                {writableCalendars.map((calendar) => (
                  <option key={calendar.id} value={calendar.id}>
                    {calendar.summary}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="block">
            <span className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-wide text-navy-300">
              Titulo
            </span>
            <input
              ref={titleRef}
              value={title}
              onChange={(inputEvent) => applyTitleShortcuts(inputEvent.target.value)}
              placeholder="Evento hoje as 14h"
              className="h-10 w-full rounded-lg border border-ui-border px-3 text-sm outline-none focus:ring-2 focus:ring-brand-100"
              autoFocus
            />
            <div className="mt-1 flex min-h-5 flex-wrap gap-1">
              {title.split(INLINE_METADATA_PATTERN).map((part, index) => {
                if (!part || !isInlineMetadata(part)) return null
                return (
                  <span
                    key={`${part}-${index}`}
                    className="rounded-md bg-surface-soft px-1.5 py-0.5 font-mono text-[10px] font-semibold text-brand-700"
                  >
                    {part.trim()}
                  </span>
                )
              })}
            </div>
          </label>

          <label className="flex items-center gap-2 font-mono text-[11px] font-semibold text-navy-500">
            <input
              type="checkbox"
              checked={allDay}
              onChange={(inputEvent) => setAllDay(inputEvent.target.checked)}
              className="h-4 w-4 rounded border-ui-border"
            />
            Dia todo
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-wide text-navy-300">
                Inicio
              </span>
              <input
                type="date"
                value={date}
                onChange={(inputEvent) => {
                  const nextDate = inputEvent.target.value
                  setDate(nextDate)
                  if (endDate < nextDate) setEndDate(nextDate)
                }}
                className="h-10 w-full rounded-lg border border-ui-border px-3 text-sm outline-none focus:ring-2 focus:ring-brand-100"
              />
            </label>
            <label className="block">
              <span className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-wide text-navy-300">
                Fim
              </span>
              <input
                type="date"
                value={endDate}
                min={date}
                onChange={(inputEvent) => setEndDate(inputEvent.target.value)}
                className="h-10 w-full rounded-lg border border-ui-border px-3 text-sm outline-none focus:ring-2 focus:ring-brand-100"
              />
            </label>
          </div>

          {!allDay ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-wide text-navy-300">
                  Hora inicio
                </span>
                <input
                  type="time"
                  value={startTime}
                  onChange={(inputEvent) => handleStartTimeChange(inputEvent.target.value)}
                  className="h-10 w-full rounded-lg border border-ui-border px-3 text-sm outline-none focus:ring-2 focus:ring-brand-100"
                />
              </label>
              <label className="block">
                <span className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-wide text-navy-300">
                  Hora fim
                </span>
                <input
                  type="time"
                  value={endTime}
                  onChange={(inputEvent) => setEndTime(inputEvent.target.value)}
                  className="h-10 w-full rounded-lg border border-ui-border px-3 text-sm outline-none focus:ring-2 focus:ring-brand-100"
                />
              </label>
              <div className="sm:col-span-2">
                <div className="grid grid-cols-4 gap-1">
                  {TIME_SUGGESTIONS.map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => handleStartTimeChange(time)}
                      className={`h-8 rounded-lg text-[12px] font-semibold transition-colors ${
                        startTime === time
                          ? 'bg-brand-600 text-white'
                          : 'bg-surface-soft text-navy-500 hover:bg-surface-selected'
                      }`}
                    >
                      {formatTimeLabel(time)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          <label className="block">
            <span className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-wide text-navy-300">
              Descricao
            </span>
            <textarea
              value={description}
              onChange={(inputEvent) => setDescription(inputEvent.target.value)}
              rows={3}
              className="w-full resize-y rounded-lg border border-ui-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-100"
            />
          </label>
        </div>

        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-ui-border bg-surface-soft px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <span className="font-mono text-[10px] font-bold uppercase tracking-wide text-navy-300">
            {duration} min
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={close}
              disabled={saving}
              className="h-10 rounded-lg border border-ui-border bg-white px-3 text-sm font-semibold text-navy-500 transition-colors hover:bg-surface-soft disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || !cleanTitle(title)}
              className="h-10 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
            >
              {saving ? 'Criando...' : 'Criar'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
