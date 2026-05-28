'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { CalendarEvent, GoogleCalendar } from '@doit/types'
import { toLocalDateKey } from '@doit/core'
import { createCalendarEvent, useGoogleCalendars } from '@/hooks/use-calendar-events'
import { usePreferences } from '@/hooks/use-preferences'
import { useToast } from '@/components/ui/toast'
import { useUI } from '@/store/ui'
import { CaptureModeTabs, createCaptureSwipeHandlers } from '@/components/capture/capture-mode-tabs'

const DATE_WORD_SHORTCUT =
  /(?:^|\s)(hoje|amanh(?:a|\u00e3)|depois de amanh(?:a|\u00e3)|fim de semana|final de semana|semana que vem|segunda(?:-feira)?|ter(?:c|\u00e7)a(?:-feira)?|quarta(?:-feira)?|quinta(?:-feira)?|sexta(?:-feira)?|s(?:a|\u00e1)bado|domingo)(?=$|\s|[,.!?])/iu
const SLASH_DATE_SHORTCUT = /(?:^|\s)(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/u
const ISO_DATE_SHORTCUT = /(?:^|\s)(\d{4}-\d{2}-\d{2})\b/u
const TIME_SHORTCUT = /(?:^|\s)(?:as\s+|\u00e0s\s+)?([01]?\d|2[0-3])(?::([0-5]\d)|h([0-5]\d)?)\b/iu
const INLINE_METADATA_PATTERN =
  /((?:^|\s)(?:hoje|amanh(?:a|\u00e3)|depois de amanh(?:a|\u00e3)|fim de semana|final de semana|semana que vem|segunda(?:-feira)?|ter(?:c|\u00e7)a(?:-feira)?|quarta(?:-feira)?|quinta(?:-feira)?|sexta(?:-feira)?|s(?:a|\u00e1)bado|domingo)(?=$|\s|[,.!?])|\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b|\b\d{4}-\d{2}-\d{2}\b|\b(?:as\s+|\u00e0s\s+)?(?:[01]?\d|2[0-3])(?::[0-5]\d|h[0-5]\d?)\b)/giu

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
    openCapture,
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
  const [expanded, setExpanded] = useState(false)
  const swipeHandlers = createCaptureSwipeHandlers({
    mode: 'event',
    onExpand: () => setExpanded(true),
    onModeChange: (nextMode) => openCapture(nextMode, date),
  })

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
    setExpanded(false)
    requestAnimationFrame(() => titleRef.current?.focus())
  }, [calendarEventCaptureOpen, calendars, duration, preferredCalendarId, selectedDate])

  if (!calendarEventCaptureOpen) return null

  function close() {
    setCalendarEventCaptureOpen(false)
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key !== 'Escape') return
    event.preventDefault()
    close()
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
      className="fixed inset-0 z-[220] flex items-end justify-center bg-navy-900/32 p-0 backdrop-blur-md sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      onClick={(clickEvent) => {
        if (clickEvent.target === clickEvent.currentTarget) close()
      }}
      onKeyDown={handleKeyDown}
      {...swipeHandlers}
    >
      <div
        className={
          expanded
            ? 'w-full overflow-hidden border border-white/65 bg-white shadow-[0_30px_80px_-20px_rgba(15,35,66,.30),0_14px_30px_-10px_rgba(15,35,66,.18)] max-h-[calc(100dvh-1rem)] max-w-[560px] rounded-t-[24px] sm:max-h-none sm:overflow-visible sm:rounded-[24px]'
            : 'w-full max-w-[500px] overflow-hidden bg-white/92 backdrop-blur-[24px] p-3 rounded-t-[30px] border border-white/76 shadow-[0_-28px_70px_-36px_rgba(15,35,66,0.64)] sm:rounded-[28px] sm:shadow-[0_34px_90px_-42px_rgba(15,35,66,0.58),0_10px_26px_rgba(15,35,66,0.1),0_1px_0_rgba(255,255,255,0.76)_inset]'
        }
      >
        <form
          onSubmit={handleSubmit}
          className={`flex flex-col sm:max-h-none ${expanded ? 'max-h-[calc(100dvh-1rem)]' : ''}`}
        >
          {!expanded ? (
            <div className="w-full">
              <div className="mb-3 flex items-center justify-between">
                <CaptureModeTabs mode="event" onModeChange={(nextMode) => openCapture(nextMode, date)} />
              </div>

              <div className="flex items-center gap-2 rounded-[20px] border border-white/70 bg-white/76 p-1.5 shadow-cool-sm backdrop-blur-md">
                <input
                  ref={titleRef}
                  value={title}
                  onChange={(inputEvent) => applyTitleShortcuts(inputEvent.target.value)}
                  placeholder="Evento hoje as 14h"
                  className="min-w-0 flex-1 border-none bg-transparent px-2.5 py-1.5 text-[15px] font-medium leading-5 text-navy-900 outline-none placeholder:text-navy-300"
                />
                <button
                  type="button"
                  onClick={() => setExpanded(true)}
                  className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl bg-white/60 text-navy-500 shadow-sm transition-colors hover:bg-white hover:text-navy-900"
                  aria-label="Expandir"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                </button>
                <button
                  type="submit"
                  disabled={saving || !cleanTitle(title)}
                  className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[14px] bg-brand-600 text-white shadow-[0_4px_12px_-4px_rgba(47,107,255,0.6)] transition-colors hover:bg-brand-700 disabled:opacity-40"
                  aria-label="Criar"
                  title="Criar"
                >
                  <IconPlus className="h-5 w-5" />
                </button>
              </div>

              {date && (
                <div className="mt-[7px] mx-[5px] flex min-h-[18px] items-center gap-[6px] font-mono text-[10.5px] leading-[1.35] text-slate-500">
                  <span className="h-[5px] w-[5px] rounded-full bg-[#28C7B7] shadow-[0_0_7px_rgba(40,199,183,0.85)]"></span>
                  <span>
                    Data do evento: <b className="font-[850] text-navy-900">{date}</b>
                    {!allDay && startTime && <> · <b className="font-[850] text-navy-900">{startTime}</b></>}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="shrink-0 border-b border-navy-900/[0.04] bg-white px-4 pb-3 pt-3">
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <CaptureModeTabs mode="event" onModeChange={(nextMode) => openCapture(nextMode, date)} />
                  </div>
                </div>
              </div>
        <div className={`${expanded ? 'block' : 'hidden sm:block'} min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-3 text-[14px] text-navy-700`}>
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
              rows={2}
              className="w-full resize-y rounded-lg border border-ui-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-100"
            />
          </label>
        </div>

        <div className={`${expanded ? 'flex' : 'hidden sm:flex'} shrink-0 items-center justify-between gap-2 border-t border-navy-900/[0.06] bg-[#F4F6FA] px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]`}>
          <div className="min-w-0 flex flex-1 items-center gap-2">
            {writableCalendars.length > 0 ? (
              <select
                value={calendarId}
                onChange={(inputEvent) => {
                  const next = inputEvent.target.value
                  setCalendarId(next)
                  update({ defaultCalendarId: next })
                }}
                aria-label="Calendario"
                className="h-10 min-w-0 max-w-[220px] rounded-lg border border-ui-border bg-white px-2 text-sm outline-none focus:ring-2 focus:ring-brand-100"
              >
                {writableCalendars.map((calendar) => (
                  <option key={calendar.id} value={calendar.id}>
                    {calendar.summary}
                  </option>
                ))}
              </select>
            ) : null}
            <span className="hidden font-mono text-[10px] font-bold uppercase tracking-wide text-navy-300 sm:inline">
              {duration} min
            </span>
          </div>
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
            </>
          )}
        </form>
      </div>
    </div>
  )
}

function IconPlus({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  )
}
