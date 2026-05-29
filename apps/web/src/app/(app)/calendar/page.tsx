'use client'

import { useEffect, useMemo, useState } from 'react'
import type { CalendarEvent, Item } from '@doit/types'
import { toLocalDateKey } from '@doit/core'
import { BentoGrid, CardTitle, VividBlueCard, GlassCard } from '@/components/ui/bento'
import { useCalendarEvents } from '@/hooks/use-calendar-events'
import { useItems } from '@/hooks/use-items'
import { useUI } from '@/store/ui'
import { useEscapeClose } from '@/hooks/use-escape-close'
import { EventSheet } from '@/components/calendar/calendar-board'

const WEEKDAY_PT = ['domingo', 'segunda-feira', 'terca-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sabado']
const MONTH_PT = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ']
const MONTH_LONG = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const DOW_SHORT = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB']

const VIEW_MODES = ['DIA', 'SEM', 'MES', 'ANO'] as const
type ViewMode = (typeof VIEW_MODES)[number]

const EVENT_TONES = ['blue', 'teal', 'violet', 'pink', 'amber'] as const
type EventTone = typeof EVENT_TONES[number]

function eventTone(idx: number): EventTone {
  return EVENT_TONES[idx % EVENT_TONES.length] ?? 'blue'
}

function toneClass(tone: EventTone): string {
  switch (tone) {
    case 'blue':
      return 'bg-[rgba(47,107,255,.14)] text-brand-600'
    case 'teal':
      return 'bg-[rgba(40,199,183,.18)] text-teal-600'
    case 'violet':
      return 'bg-[rgba(123,91,255,.16)] text-violet-500'
    case 'pink':
      return 'bg-[rgba(255,111,174,.18)] text-pink-600'
    case 'amber':
      return 'bg-[rgba(245,165,36,.18)] text-[#B47410]'
  }
}

function startOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

function startOfWeek(date: Date): Date {
  const d = startOfDay(date)
  return addDays(d, -d.getDay())
}

function buildMonthCells(year: number, month: number): Date[] {
  const first = new Date(year, month, 1)
  const startDow = first.getDay()
  const start = addDays(first, -startDow)
  const cells: Date[] = []
  for (let i = 0; i < 42; i += 1) cells.push(addDays(start, i))
  return cells
}

function eventsByDay(events: CalendarEvent[]): Map<string, CalendarEvent[]> {
  const map = new Map<string, CalendarEvent[]>()
  for (const event of events) {
    const start = new Date(event.start)
    const key = toLocalDateKey(start)
    const arr = map.get(key) ?? []
    arr.push(event)
    map.set(key, arr)
  }
  return map
}

function itemsByDay(items: Item[]): Map<string, Item[]> {
  const map = new Map<string, Item[]>()
  for (const item of items) {
    if (item.status === 'archived') continue
    const key = item.dueDate ?? item.scheduledDate
    if (!key) continue
    const arr = map.get(key) ?? []
    arr.push(item)
    map.set(key, arr)
  }
  return map
}

function formatHM(iso: string, allDay?: boolean): string {
  if (allDay) return 'dia todo'
  const d = new Date(iso)
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function durationMinutes(event: CalendarEvent): number {
  if (event.allDay) return 0
  const start = new Date(event.start).getTime()
  const end = new Date(event.end ?? event.start).getTime()
  return Math.max(0, Math.round((end - start) / 60000))
}

function sortByStart(events: CalendarEvent[]): CalendarEvent[] {
  return [...events].sort((a, b) => a.start.localeCompare(b.start))
}

function MiniMonth({
  year,
  month,
  eventsMap,
  itemsMap,
  todayKey,
  onClick,
}: {
  year: number
  month: number
  eventsMap: Map<string, CalendarEvent[]>
  itemsMap: Map<string, Item[]>
  todayKey: string
  onClick: () => void
}) {
  const cells = useMemo(() => buildMonthCells(year, month), [year, month])
  const isCurrentMonth = todayKey.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`)
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col rounded-[12px] border p-2.5 text-left transition-colors ${
        isCurrentMonth
          ? 'border-navy-900/15 bg-white/80 shadow-cool-sm'
          : 'border-white/45 bg-white/45 hover:bg-white/70'
      }`}
    >
      <span className="mb-1.5 font-mono text-[12px] font-bold tracking-wider text-navy-700">
        {MONTH_LONG[month]}
      </span>
      <div className="grid grid-cols-7 gap-px">
        {DOW_SHORT.map((d) => (
          <span key={d} className="text-center font-mono text-[7px] font-bold text-navy-300">
            {d.charAt(0)}
          </span>
        ))}
        {cells.map((date, i) => {
          const key = toLocalDateKey(date)
          const inMonth = date.getMonth() === month
          const isToday = key === todayKey
          const has = (eventsMap.get(key)?.length ?? 0) + (itemsMap.get(key)?.length ?? 0) > 0
          return (
            <span
              key={i}
              className={`flex h-3.5 items-center justify-center rounded-[3px] text-[8px] font-semibold ${
                isToday
                  ? 'bg-navy-900 text-white'
                  : has
                    ? 'bg-brand-500/25 text-navy-900'
                    : inMonth
                      ? 'text-navy-500'
                      : 'text-navy-300/60'
              }`}
            >
              {date.getDate()}
            </span>
          )
        })}
      </div>
    </button>
  )
}

function CalendarCard({
  anchor,
  todayKey,
  selectedKey,
  events,
  items,
  onPrev,
  onNext,
  onToday,
  onDayClick,
  onEventClick,
  onItemClick,
  onToggleExpand,
  expanded,
  onPickMonth,
  viewMode,
  setViewMode,
}: {
  anchor: Date
  todayKey: string
  selectedKey: string
  events: CalendarEvent[]
  items: Item[]
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  onDayClick: (key: string) => void
  onEventClick: (event: CalendarEvent) => void
  onItemClick: (id: string) => void
  onToggleExpand: () => void
  expanded: boolean
  onPickMonth: (year: number, month: number) => void
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void
}) {
  const cursorYear = anchor.getFullYear()
  const cursorMonth = anchor.getMonth()
  const eventsMap = useMemo(() => eventsByDay(events), [events])
  const itemsMap = useMemo(() => itemsByDay(items), [items])
  const monthCells = useMemo(() => buildMonthCells(cursorYear, cursorMonth), [cursorYear, cursorMonth])
  const weekStart = useMemo(() => startOfWeek(anchor), [anchor])
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])

  const weekNumber = useMemo(() => {
    const firstThursday = new Date(cursorYear, 0, 4)
    const offset = (firstThursday.getDay() + 6) % 7
    const start = addDays(firstThursday, -offset)
    const today = new Date(todayKey + 'T12:00:00')
    return Math.max(1, Math.floor((today.getTime() - start.getTime()) / (7 * 86400 * 1000)) + 1)
  }, [cursorYear, todayKey])

  const header = useMemo(() => {
    if (viewMode === 'ANO') return { big: String(cursorYear), small: 'ano' }
    if (viewMode === 'SEM') {
      const weekEnd = addDays(weekStart, 6)
      const range =
        weekStart.getMonth() === weekEnd.getMonth()
          ? `${weekStart.getDate()}–${weekEnd.getDate()}`
          : `${weekStart.getDate()}/${weekStart.getMonth() + 1}–${weekEnd.getDate()}/${weekEnd.getMonth() + 1}`
      return { big: range, small: `${MONTH_LONG[weekStart.getMonth()]} ${weekStart.getFullYear()} · semana` }
    }
    if (viewMode === 'DIA') {
      const dow = WEEKDAY_PT[anchor.getDay()] ?? ''
      return { big: String(anchor.getDate()), small: `${dow} · ${MONTH_LONG[cursorMonth]} ${cursorYear}` }
    }
    return { big: MONTH_LONG[cursorMonth] ?? '', small: `${cursorYear} · SEMANA ${weekNumber}` }
  }, [viewMode, cursorYear, cursorMonth, anchor, weekStart, weekNumber])

  const navLabels: Record<ViewMode, { prev: string; next: string }> = {
    DIA: { prev: 'Dia anterior', next: 'Proximo dia' },
    SEM: { prev: 'Semana anterior', next: 'Proxima semana' },
    MES: { prev: 'Mes anterior', next: 'Proximo mes' },
    ANO: { prev: 'Ano anterior', next: 'Proximo ano' },
  }

  const dayKey = toLocalDateKey(anchor)
  const dayEvents = useMemo(() => sortByStart(eventsMap.get(dayKey) ?? []), [eventsMap, dayKey])
  const dayItems = itemsMap.get(dayKey) ?? []

  return (
    <GlassCard className={`flex flex-col p-3 sm:p-5 lg:p-6 ${expanded ? 'h-full min-h-0 flex-1' : 'lg:col-span-8 lg:row-span-3'}`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <h2 className="text-[34px] font-black leading-none -tracking-[.04em] text-navy-900">
            {header.big}
          </h2>
          <span className="font-mono text-[11px] font-bold tracking-wider text-navy-500">
            {header.small}
          </span>
          <div className="ml-4 inline-flex items-center gap-1.5">
            <button
              type="button"
              onClick={onPrev}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-navy-900/[0.04] text-navy-500 hover:bg-navy-900/[0.10] hover:text-navy-900"
              aria-label={navLabels[viewMode].prev}
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 6-6 6 6 6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={onToday}
              className="rounded-full bg-navy-900/[0.04] px-3 py-1 font-mono text-[11px] font-semibold text-navy-700 hover:bg-navy-900/[0.10]"
            >
              hoje
            </button>
            <button
              type="button"
              onClick={onNext}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-navy-900/[0.04] text-navy-500 hover:bg-navy-900/[0.10] hover:text-navy-900"
              aria-label={navLabels[viewMode].next}
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 6 6 6-6 6" />
              </svg>
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-px rounded-full border border-white/55 bg-white/55 p-1 font-mono text-[10px] font-bold tracking-wider text-navy-500 shadow-cool-sm">
            {VIEW_MODES.map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => setViewMode(label)}
                className={`rounded-full px-2.5 py-1 transition-colors ${label === viewMode ? 'bg-white text-navy-900 shadow-cool-sm' : 'hover:text-navy-900'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <button onClick={onToggleExpand} className="hidden h-8 w-8 items-center justify-center rounded-full border border-white/55 bg-white/55 text-navy-500 shadow-cool-sm transition-colors hover:bg-white hover:text-navy-900 lg:inline-flex" title={expanded ? 'Minimizar calendário' : 'Maximizar calendário'}>
            {expanded ? (
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 14h6v6" />
                <path d="M20 10h-6V4" />
                <path d="M14 10l7-7" />
                <path d="M3 21l7-7" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h6v6" />
                <path d="M9 21H3v-6" />
                <path d="M21 3l-7 7" />
                <path d="M3 21l7-7" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {viewMode === 'MES' ? (
        <div className="grid flex-1 grid-cols-7 grid-rows-[22px_repeat(6,minmax(0,1fr))] gap-1.5 min-h-0">
          {DOW_SHORT.map((dow) => (
            <div key={dow} className="pb-1 text-center font-mono text-[10px] font-bold tracking-wider text-navy-500">
              {dow}
            </div>
          ))}
          {monthCells.map((date, i) => {
            const key = toLocalDateKey(date)
            const inMonth = date.getMonth() === cursorMonth
            const isToday = key === todayKey
            const isWeekend = date.getDay() === 0 || date.getDay() === 6
            const cellEvents = eventsMap.get(key) ?? []
            const cellItems = itemsMap.get(key) ?? []
            const total = cellEvents.length + cellItems.length
            const visible = cellEvents.slice(0, 2)
            const visibleItems = cellItems.slice(0, Math.max(0, 2 - visible.length))
            const more = total - visible.length - visibleItems.length
            return (
              <div
                key={i}
                onClick={() => onDayClick(key)}
                className={`flex min-h-0 flex-col gap-0.5 overflow-hidden p-1 lg:gap-1 lg:p-1.5 transition-colors cursor-pointer ${
                  isToday
                    ? 'border-[1.5px] border-navy-900 bg-white/92 shadow-[0_6px_16px_-8px_rgba(15,35,66,.30)]'
                    : key === selectedKey
                    ? 'border-[1.5px] border-brand-500 bg-white/80 shadow-[0_4px_12px_rgba(47,107,255,.2)]'
                    : isWeekend
                      ? 'bg-white/35 hover:bg-white/50'
                      : 'hover:bg-white/70'
                } ${!inMonth ? 'opacity-50' : ''}`}
              >
                {isToday ? (
                  <span className="mb-0.5 inline-flex h-[22px] w-[22px] items-center justify-center self-start rounded-full bg-navy-900 text-[12px] font-extrabold text-white">
                    {date.getDate()}
                  </span>
                ) : (
                  <span className={`mb-0.5 text-[13px] font-bold leading-none -tracking-[.01em] ${inMonth ? 'text-navy-900' : 'text-navy-300'}`}>
                    {date.getDate()}
                  </span>
                )}
                {visible.map((event, idx) => (
                  <span
                    key={event.id}
                    onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
                    className={`block truncate rounded px-1 py-0.5 text-[9.5px] font-semibold leading-tight cursor-pointer hover:opacity-80 lg:px-1.5 lg:text-[10.5px] lg:leading-tight ${toneClass(eventTone(idx))}`}
                    title={event.title}
                  >
                    {event.title}
                  </span>
                ))}
                {visibleItems.map((item, idx) => (
                  <span
                    key={item.id}
                    onClick={(e) => { e.stopPropagation(); onItemClick(item.id); }}
                    className={`block truncate rounded px-1 py-0.5 text-[9.5px] font-semibold leading-tight cursor-pointer hover:opacity-80 lg:px-1.5 lg:text-[10.5px] lg:leading-tight ${toneClass(eventTone(idx + visible.length))}`}
                    title={item.title}
                  >
                    {item.title}
                  </span>
                ))}
                {more > 0 ? (
                  <span className="mt-auto block rounded bg-navy-900/[0.06] px-1.5 py-0.5 text-center font-mono text-[10px] font-bold text-navy-600 lg:text-[9.5px]">+{more} mais</span>
                ) : null}
              </div>
            )
          })}
        </div>
      ) : null}

      {viewMode === 'SEM' ? (
        // Mobile: faixa rolável horizontal com ~3 dias por vez (swipe); desktop: 7 colunas (ID 014).
        <div className="flex min-h-0 flex-1 snap-x snap-mandatory gap-1.5 overflow-x-auto pb-1 lg:grid lg:grid-cols-7 lg:overflow-x-visible lg:pb-0">
          {weekDays.map((date) => {
            const key = toLocalDateKey(date)
            const isToday = key === todayKey
            const isWeekend = date.getDay() === 0 || date.getDay() === 6
            const colEvents = sortByStart(eventsMap.get(key) ?? [])
            const colItems = itemsMap.get(key) ?? []
            return (
              <div
                key={key}
                onClick={() => onDayClick(key)}
                className={`flex min-h-0 w-[30%] shrink-0 snap-start cursor-pointer flex-col rounded-[12px] border p-2 transition-colors lg:w-auto lg:shrink ${
                  isToday
                    ? 'border-[1.5px] border-navy-900 bg-white/85'
                    : key === selectedKey
                      ? 'border-[1.5px] border-brand-500 bg-white/70'
                      : isWeekend
                        ? 'border-white/40 bg-white/30 hover:bg-white/50'
                        : 'border-white/40 bg-white/45 hover:bg-white/70'
                }`}
              >
                <div className="mb-1.5 flex shrink-0 items-center justify-between">
                  <span className="font-mono text-[9px] font-bold tracking-wider text-navy-500">
                    {DOW_SHORT[date.getDay()]}
                  </span>
                  <span
                    className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-extrabold ${
                      isToday ? 'bg-navy-900 text-white' : 'text-navy-900'
                    }`}
                  >
                    {date.getDate()}
                  </span>
                </div>
                <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-auto pr-0.5">
                  {colEvents.map((event, idx) => (
                    <span
                      key={event.id}
                      onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
                      className={`line-clamp-2 whitespace-normal break-words rounded px-1.5 py-1 text-[11px] font-semibold leading-[1.25] cursor-pointer hover:opacity-80 lg:line-clamp-none lg:truncate lg:py-0.5 lg:text-[10px] lg:leading-tight ${toneClass(eventTone(idx))}`}
                      title={event.title}
                    >
                      {event.allDay ? '' : formatHM(event.start) + ' '}
                      {event.title}
                    </span>
                  ))}
                  {colItems.map((item, idx) => (
                    <span
                      key={item.id}
                      onClick={(e) => { e.stopPropagation(); onItemClick(item.id); }}
                      className={`line-clamp-2 whitespace-normal break-words rounded px-1.5 py-1 text-[11px] font-semibold leading-[1.25] cursor-pointer hover:opacity-80 lg:line-clamp-none lg:truncate lg:py-0.5 lg:text-[10px] lg:leading-tight ${toneClass(eventTone(idx + colEvents.length))}`}
                      title={item.title}
                    >
                      {item.title}
                    </span>
                  ))}
                  {colEvents.length + colItems.length === 0 ? (
                    <span className="mt-1 text-center font-mono text-[9px] text-navy-300">livre</span>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      ) : null}

      {viewMode === 'DIA' ? (
        <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-auto pr-1">
          {dayEvents.length === 0 && dayItems.length === 0 ? (
            <div className="grid flex-1 place-items-center font-mono text-[12px] text-navy-500">
              sem agenda neste dia
            </div>
          ) : (
            <>
              {dayEvents.map((event, idx) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => onEventClick(event)}
                  className="flex items-center gap-3 rounded-[12px] border border-navy-900/[0.06] bg-white/65 px-3 py-2.5 text-left transition-colors hover:bg-white/85"
                >
                  <span className={`h-9 w-1.5 shrink-0 rounded-full ${toneClass(eventTone(idx))}`} />
                  <span className="w-24 shrink-0 font-mono text-[11.5px] font-semibold text-navy-500">
                    {event.allDay ? 'dia todo' : `${formatHM(event.start)} - ${formatHM(event.end ?? event.start)}`}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold text-navy-900">{event.title}</span>
                  </span>
                </button>
              ))}
              {dayItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onItemClick(item.id)}
                  className="flex items-center gap-3 rounded-[12px] border border-navy-900/[0.06] bg-white/55 px-3 py-2.5 text-left transition-colors hover:bg-white/80"
                >
                  <span className="h-9 w-1.5 shrink-0 rounded-full bg-teal-500/40" />
                  <span className="w-24 shrink-0 font-mono text-[11.5px] font-semibold text-navy-500">
                    {item.dueTime ?? 'item'}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold text-navy-900">{item.title}</span>
                    <span className="mt-0.5 block font-mono text-[10.5px] text-navy-500">
                      {item.complexity === 'note' ? 'nota' : 'tarefa'}
                    </span>
                  </span>
                </button>
              ))}
            </>
          )}
        </div>
      ) : null}

      {viewMode === 'ANO' ? (
        <div className="grid flex-1 grid-cols-2 gap-3 overflow-auto min-h-0 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 12 }, (_, m) => (
            <MiniMonth
              key={m}
              year={cursorYear}
              month={m}
              eventsMap={eventsMap}
              itemsMap={itemsMap}
              todayKey={todayKey}
              onClick={() => onPickMonth(cursorYear, m)}
            />
          ))}
        </div>
      ) : null}
    </GlassCard>
  )
}

function DayPopup({
  date,
  events,
  items,
  onEventClick,
  onItemClick,
  onClose,
}: {
  date: string
  events: CalendarEvent[]
  items: Item[]
  onEventClick: (event: CalendarEvent) => void
  onItemClick: (id: string) => void
  onClose: () => void
}) {
  const heading = useMemo(() => {
    const d = new Date(date + 'T12:00:00')
    return d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  }, [date])

  // Esc fecha o popup do dia mesmo sem foco interno (ID 010).
  useEscapeClose(true, onClose)

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end bg-navy-900/45 p-0 backdrop-blur-sm sm:items-center sm:justify-center sm:p-3"
      role="dialog"
      aria-modal="true"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section className="flex max-h-[min(680px,calc(100vh-2rem))] w-full flex-col rounded-2xl border border-white/55 bg-white/95 p-5 shadow-cool-lg backdrop-blur-xl sm:max-w-lg">
        <div className="mb-3 flex shrink-0 items-start justify-between gap-3 border-b border-navy-900/10 pb-3">
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-bold uppercase tracking-wide text-brand-600">
              Eventos do dia
            </p>
            <h2 className="mt-1 text-xl font-bold capitalize text-navy-900">{heading}</h2>
            <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-wide text-navy-300">
              {events.length} evento(s) · {items.length} item(ns)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-navy-400 hover:bg-surface-soft hover:text-navy-700"
            aria-label="Fechar eventos do dia"
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
          {events.length === 0 && items.length === 0 ? (
            <p className="rounded-lg border border-dashed border-navy-900/15 px-3 py-4 text-[13px] text-navy-300">
              Nenhum evento ou item para este dia.
            </p>
          ) : (
            <>
              {events.map((event, idx) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => onEventClick(event)}
                  className="flex w-full items-center gap-3 rounded-lg border border-navy-900/[0.06] bg-white px-3 py-2.5 text-left shadow-cool-sm transition-colors hover:bg-surface-soft"
                >
                  <span className={`h-10 w-1.5 shrink-0 rounded-full ${toneClass(eventTone(idx))}`} />
                  <span className="w-20 shrink-0 font-mono text-[11px] font-semibold text-navy-500">
                    {formatHM(event.start, event.allDay)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold text-navy-900">{event.title}</span>
                    {!event.allDay ? (
                      <span className="block truncate font-mono text-[11px] text-navy-300">
                        Termina {formatHM(event.end ?? event.start)}
                      </span>
                    ) : null}
                  </span>
                </button>
              ))}
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onItemClick(item.id)}
                  className="flex w-full items-center gap-3 rounded-lg border border-navy-900/[0.06] bg-white px-3 py-2.5 text-left shadow-cool-sm transition-colors hover:bg-surface-soft"
                >
                  <span className="h-10 w-1.5 shrink-0 rounded-full bg-teal-500/50" />
                  <span className="w-20 shrink-0 font-mono text-[11px] font-semibold text-navy-500">
                    {item.dueTime ?? 'item'}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold text-navy-900">{item.title}</span>
                    <span className="block truncate font-mono text-[11px] text-navy-300">
                      {item.complexity === 'note' ? 'nota' : 'tarefa'}
                    </span>
                  </span>
                </button>
              ))}
            </>
          )}
        </div>
      </section>
    </div>
  )
}

function NowCard({ now }: { now: Date }) {
  const day = now.getDate()
  const dow = WEEKDAY_PT[now.getDay()] ?? ''
  const dowLabel = dow.charAt(0).toUpperCase() + dow.slice(1)
  const month = MONTH_PT[now.getMonth()] ?? ''
  const time = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone

  return (
    <GlassCard className="flex flex-col p-6 lg:col-span-4 lg:row-span-1">
      <div className="flex h-full items-center gap-5">
        <div className="text-[64px] font-black leading-none -tracking-[.05em] text-navy-900">{day}</div>
        <div className="flex flex-col gap-1">
          <div className="text-[16px] font-bold leading-tight -tracking-[.01em] text-navy-900">{dowLabel}</div>
          <div className="font-mono text-[11px] tracking-wider text-navy-500">{month} · {now.getFullYear()}</div>
        </div>
        <div className="ml-auto text-right">
          <div className="bg-[linear-gradient(120deg,#2F6BFF,#7B5BFF_50%,#28C7B7)] bg-clip-text font-mono text-[26px] font-bold leading-none -tracking-[.02em] text-transparent">
            {time}
          </div>
          <div className="mt-1 font-mono text-[10px] tracking-wider text-navy-500">{tz}</div>
        </div>
      </div>
    </GlassCard>
  )
}

function AgendaCard({
  events,
  items,
  now,
  onItemClick,
  onEventClick,
}: {
  events: CalendarEvent[]
  items: Item[]
  now: Date
  onItemClick: (id: string) => void
  onEventClick: (event: CalendarEvent) => void
}) {
  const nowMs = now.getTime()
  const rows = useMemo(() => {
    type Row = {
      key: string
      hour: string
      title: string
      meta: string
      tone: EventTone
      done: boolean
      isNow: boolean
      starts: number
      onClick?: () => void
    }
    const list: Row[] = []
    events.forEach((event, i) => {
      const startMs = new Date(event.start).getTime()
      const endMs = new Date(event.end ?? event.start).getTime()
      const done = endMs < nowMs
      const isNow = startMs <= nowMs && nowMs <= endMs
      list.push({
        key: `event-${event.id}`,
        hour: formatHM(event.start, event.allDay),
        title: event.title,
        meta: event.allDay
          ? 'dia todo'
          : `${formatHM(event.start)} - ${formatHM(event.end ?? event.start)}`,
        tone: eventTone(i),
        done,
        isNow,
        starts: startMs,
        onClick: () => onEventClick(event),
      })
    })
    items.forEach((item, i) => {
      const t = item.dueTime ?? '12:00'
      list.push({
        key: `item-${item.id}`,
        hour: t,
        title: item.title,
        meta: 'item · ' + (item.complexity === 'note' ? 'nota' : 'tarefa'),
        tone: eventTone(i + events.length),
        done: item.status === 'done',
        isNow: false,
        starts: Date.now(),
        onClick: () => onItemClick(item.id),
      })
    })
    return list.sort((a, b) => a.starts - b.starts).slice(0, 6)
  }, [events, items, nowMs, onItemClick, onEventClick])

  return (
    <GlassCard className="flex flex-col p-6 lg:col-span-4 lg:row-span-2">
      <div className="mb-3 flex items-center justify-between">
        <CardTitle>agenda de hoje</CardTitle>
        <span className="rounded-full bg-navy-900/[0.05] px-2 py-0.5 font-mono text-[10px] text-navy-500">hoje · {rows.length} itens</span>
      </div>
      {rows.length === 0 ? (
        <div className="grid flex-1 place-items-center font-mono text-[11px] text-navy-500">
          sem agenda hoje
        </div>
      ) : (
        <div className="relative flex-1 overflow-hidden pl-14">
          <div className="absolute bottom-1 left-14 top-1 w-px bg-navy-900/10" aria-hidden="true" />
          <div className="flex flex-col gap-1">
            {rows.map((row) => {
              const dotTone = row.isNow
                ? 'bg-navy-900 border-navy-900 shadow-[0_0_0_4px_rgba(15,35,66,.10)]'
                : row.done
                  ? 'bg-teal-500 border-teal-500 shadow-[0_0_0_4px_rgba(40,199,183,.18)]'
                  : 'bg-white border-navy-200'
              const Tag = row.onClick ? 'button' : 'div'
              return (
                <Tag
                  key={row.key}
                  type={row.onClick ? 'button' : undefined}
                  onClick={row.onClick}
                  className="relative flex items-start gap-3 py-1 pl-4 text-left"
                >
                  <span className="absolute -left-[60px] top-[7px] w-10 text-right font-mono text-[10px] tracking-wider text-navy-500">{row.hour}</span>
                  <span className={`absolute -left-1 top-2.5 h-[9px] w-[9px] rounded-full border-2 ${dotTone}`} aria-hidden="true" />
                  <div
                    className={`flex-1 rounded-[10px] border border-navy-900/[0.06] bg-white/60 px-2.5 py-1.5 [border-left-width:3px] ${
                      row.tone === 'blue' ? '[border-left-color:#2F6BFF]' : ''
                    } ${row.tone === 'teal' ? 'bg-[rgba(40,199,183,.07)] [border-left-color:#28C7B7]' : ''} ${
                      row.tone === 'violet' ? 'bg-[rgba(123,91,255,.07)] [border-left-color:#7B5BFF]' : ''
                    } ${row.tone === 'pink' ? 'bg-[rgba(255,111,174,.07)] [border-left-color:#FF6FAE]' : ''} ${
                      row.tone === 'amber' ? 'bg-[rgba(245,165,36,.08)] [border-left-color:#F5A524]' : ''
                    } ${row.done ? 'opacity-65' : ''}`}
                  >
                    <div className={`text-[12px] font-semibold leading-tight -tracking-[.01em] ${row.done ? 'text-navy-500 line-through' : 'text-navy-900'}`}>
                      {row.title}
                    </div>
                    <div className="mt-0.5 font-mono text-[10px] text-navy-500">{row.meta}</div>
                  </div>
                </Tag>
              )
            })}
          </div>
        </div>
      )}
    </GlassCard>
  )
}

function UpNextCard({ event, now }: { event: CalendarEvent | null; now: Date }) {
  const countdown = useMemo(() => {
    if (!event) return { h: 0, m: 0, label: 'nenhum proximo' }
    const ms = new Date(event.start).getTime() - now.getTime()
    if (ms <= 0) return { h: 0, m: 0, label: 'comecou' }
    const total = Math.round(ms / 60000)
    return { h: Math.floor(total / 60), m: total % 60, label: 'comeca em' }
  }, [event, now])

  return (
    <VividBlueCard className="flex flex-col p-6 lg:col-span-4 lg:row-span-2">
      <div className="mb-3 flex items-center justify-between">
        <CardTitle className="text-white/85">proximo</CardTitle>
        <span className="rounded-full bg-white/10 px-2 py-0.5 font-mono text-[10px] text-white/80">
          {event ? 'agendado' : 'livre'}
        </span>
      </div>
      <div className="inline-flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-wider text-white/70">
        <span className="h-[7px] w-[7px] animate-pulse rounded-full bg-teal-400 shadow-[0_0_10px_rgba(40,199,183,.9)]" />
        {event ? `${countdown.label} · ${String(countdown.h).padStart(2, '0')}H ${String(countdown.m).padStart(2, '0')}M` : 'sem eventos proximos'}
      </div>
      {event ? (
        <>
          <h3 className="mb-1.5 mt-3 text-[26px] font-black leading-tight -tracking-[.02em] text-white">
            {event.title}
          </h3>
          <div className="mb-3 font-mono text-[11.5px] text-teal-300">
            {formatHM(event.start, event.allDay)} - {formatHM(event.end ?? event.start, event.allDay)}
          </div>
          <div className="mt-auto flex items-end gap-3 border-t border-white/10 pt-3">
            <div>
              <div className="bg-[linear-gradient(120deg,#B7C9FF,#5BE3D4)] bg-clip-text font-mono text-[38px] font-bold leading-none -tracking-[.03em] text-transparent">
                {String(countdown.h).padStart(2, '0')}:{String(countdown.m).padStart(2, '0')}
              </div>
              <div className="mt-1 font-mono text-[10.5px] tracking-wider text-white/65">horas : minutos</div>
            </div>
            <div className="ml-auto inline-flex items-center gap-1.5 font-mono text-[10.5px] text-white/70">
              {event.linkedItemIds.length > 0 ? (
                <span>{event.linkedItemIds.length} {event.linkedItemIds.length === 1 ? 'item ligado' : 'itens ligados'}</span>
              ) : (
                <span>{event.source === 'google' ? 'google calendar' : 'local'}</span>
              )}
            </div>
          </div>
        </>
      ) : (
        <div className="mt-3 flex flex-1 items-center font-mono text-[12px] text-white/70">
          Aproveita esse tempo livre para um bloco de foco
        </div>
      )}
    </VividBlueCard>
  )
}

function WeekLoadCard({ events, weekStart }: { events: CalendarEvent[]; weekStart: Date }) {
  const totals = useMemo(() => {
    const days: number[] = Array(7).fill(0)
    for (const event of events) {
      if (event.allDay) continue
      const start = new Date(event.start)
      const diff = Math.floor((startOfDay(start).getTime() - startOfDay(weekStart).getTime()) / 86400000)
      if (diff < 0 || diff > 6) continue
      const hours = durationMinutes(event) / 60
      days[diff] = (days[diff] ?? 0) + hours
    }
    return days
  }, [events, weekStart])
  const totalScheduled = totals.reduce((acc, h) => acc + h, 0)
  const max = Math.max(1, ...totals)

  const todayIdx = Math.floor((startOfDay(new Date()).getTime() - startOfDay(weekStart).getTime()) / 86400000)

  return (
    <GlassCard className="flex flex-col p-6 lg:col-span-5 lg:row-span-2">
      <div className="mb-3 flex items-center justify-between">
        <CardTitle>carga da semana</CardTitle>
        <span className="font-mono text-[11px] text-navy-500">
          <b className="text-[13px] font-bold text-navy-900">{totalScheduled.toFixed(1)}h</b> agendadas
        </span>
      </div>
      <div className="grid flex-1 grid-cols-7 gap-2">
        {totals.map((hours, i) => {
          const heightPct = Math.round((hours / max) * 100)
          const isToday = i === todayIdx
          const isWeekend = i === 0 || i === 6
          return (
            <div key={i} className="flex h-full min-h-0 flex-col items-center gap-1.5">
              <div
                className={`relative flex w-full flex-1 flex-col justify-end overflow-hidden rounded-md ${
                  isToday ? 'bg-navy-900/[0.06] ring-[1.5px] ring-navy-900' : 'bg-navy-900/[0.03]'
                } ${isWeekend ? 'opacity-50' : ''}`}
              >
                <div
                  className="w-full rounded bg-[linear-gradient(180deg,#2F6BFF,#28C7B7)]"
                  style={{ height: `${heightPct}%` }}
                />
              </div>
              <div className={`font-mono text-[10px] font-semibold tracking-wider ${isToday ? 'text-navy-900' : 'text-navy-500'}`}>
                {DOW_SHORT[i]}
              </div>
              <div className="font-mono text-[9.5px] text-navy-500">{hours.toFixed(1)}h</div>
            </div>
          )
        })}
      </div>
      <div className="mt-3 flex gap-4 font-mono text-[10.5px] text-navy-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-[9px] w-[9px] rounded-sm bg-brand-600" />
          eventos
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-[9px] w-[9px] rounded-sm bg-teal-500" />
          foco
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-[9px] w-[9px] rounded-sm bg-violet-500" />
          revisao
        </span>
      </div>
    </GlassCard>
  )
}

function FocusBlocksCard({ events, weekStart }: { events: CalendarEvent[]; weekStart: Date }) {
  const grid = useMemo(() => {
    const cells: number[] = Array(14).fill(0)
    for (const event of events) {
      if (event.allDay) continue
      const start = new Date(event.start)
      const diff = Math.floor((startOfDay(start).getTime() - startOfDay(weekStart).getTime()) / 86400000)
      if (diff < 0 || diff > 6) continue
      const slot = start.getHours() < 12 ? 0 : 1
      cells[diff + slot * 7] = (cells[diff + slot * 7] ?? 0) + 1
    }
    return cells
  }, [events, weekStart])
  const totalFocusHours = useMemo(() => {
    let sum = 0
    for (const event of events) {
      if (event.allDay) continue
      sum += durationMinutes(event)
    }
    return Math.round((sum / 60) * 10) / 10
  }, [events])

  return (
    <article className="flex flex-col rounded-[28px] border border-white/40 bg-[linear-gradient(160deg,#2F6BFF_0%,#4F4BE9_50%,#28C7B7_100%)] p-6 text-white shadow-[0_24px_60px_rgba(15,35,66,.28)] lg:col-span-3 lg:row-span-2">
      <div className="mb-3 flex items-center justify-between">
        <CardTitle className="text-white/85">blocos de foco</CardTitle>
        <span className="rounded-full bg-white/14 px-2 py-0.5 font-mono text-[10px] text-white/85">esta semana</span>
      </div>
      <div className="text-[44px] font-black leading-none -tracking-[.04em] [text-shadow:0_2px_12px_rgba(15,35,66,.25)]">
        {totalFocusHours}
      </div>
      <div className="mt-1 font-mono text-[11px] opacity-85">horas em blocos · semana atual</div>
      <div className="mt-auto grid grid-cols-7 gap-1">
        {grid.map((count, i) => {
          const level = count >= 4 ? 'l4' : count >= 2 ? 'l3' : count >= 1 ? 'l2' : count > 0 ? 'l1' : ''
          const cls = level === 'l4'
            ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,.6)]'
            : level === 'l3'
              ? 'bg-white/85'
              : level === 'l2'
                ? 'bg-white/55'
                : level === 'l1'
                  ? 'bg-white/32'
                  : 'bg-white/20'
          return <div key={i} className={`aspect-square rounded ${cls}`} />
        })}
      </div>
      <div className="mt-2 flex justify-between font-mono text-[10px] tracking-wider text-white/75">
        {DOW_SHORT.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
    </article>
  )
}

export default function CalendarPage() {
  const [now, setNow] = useState<Date>(() => new Date())
  const [anchor, setAnchor] = useState<Date>(() => new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('MES')
  const { items } = useItems()
  const { setSelectedItemId } = useUI()

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30000)
    return () => window.clearInterval(id)
  }, [])

  const todayKey = toLocalDateKey(now)

  // Events for the area currently shown in the calendar card (month / week / day / year).
  const eventsRange = useMemo(() => {
    if (viewMode === 'ANO') {
      return {
        from: new Date(anchor.getFullYear(), 0, 1).toISOString(),
        to: new Date(anchor.getFullYear(), 11, 31, 23, 59, 59).toISOString(),
      }
    }
    const start = new Date(anchor.getFullYear(), anchor.getMonth(), -7)
    const end = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 7, 23, 59, 59)
    return { from: start.toISOString(), to: end.toISOString() }
  }, [anchor, viewMode])

  const { events } = useCalendarEvents(eventsRange.from, eventsRange.to)

  // Stable window around today so the "today"/week cards stay populated regardless of navigation.
  const homeRange = useMemo(() => {
    const base = new Date(todayKey + 'T12:00:00')
    const ws = startOfWeek(base)
    return { from: startOfDay(addDays(ws, -1)).toISOString(), to: addDays(ws, 21).toISOString() }
  }, [todayKey])
  const { events: homeEvents } = useCalendarEvents(homeRange.from, homeRange.to)

  const [selectedDate, setSelectedDate] = useState<string>(todayKey)
  const [openDayKey, setOpenDayKey] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [openEvent, setOpenEvent] = useState<CalendarEvent | null>(null)

  // On phones the calendar opens directly maximized (like the Google Calendar app),
  // keeping the doit chrome; the maximize/minimize toggle is desktop-only.
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  const showExpanded = expanded || isMobile

  const todayEvents = useMemo(
    () => sortByStart(homeEvents.filter((event) => toLocalDateKey(new Date(event.start)) === todayKey)),
    [homeEvents, todayKey],
  )
  const todayItems = useMemo(
    () =>
      items.filter((item) => {
        const key = item.dueDate ?? item.scheduledDate
        return key === todayKey && item.status !== 'archived'
      }),
    [items, todayKey],
  )

  const popupEvents = useMemo(
    () =>
      openDayKey
        ? sortByStart(events.filter((event) => toLocalDateKey(new Date(event.start)) === openDayKey))
        : [],
    [events, openDayKey],
  )
  const popupItems = useMemo(
    () =>
      openDayKey
        ? items.filter((item) => {
            const key = item.dueDate ?? item.scheduledDate
            return key === openDayKey && item.status !== 'archived'
          })
        : [],
    [items, openDayKey],
  )

  const upcomingEvent = useMemo(() => {
    const nowMs = now.getTime()
    return homeEvents
      .filter((event) => new Date(event.start).getTime() > nowMs)
      .sort((a, b) => a.start.localeCompare(b.start))[0] ?? null
  }, [homeEvents, now])

  const weekStart = useMemo(() => startOfWeek(now), [now])
  const weekEnd = useMemo(() => addDays(weekStart, 7), [weekStart])
  const weekEvents = useMemo(
    () =>
      homeEvents.filter((event) => {
        const t = new Date(event.start).getTime()
        return t >= weekStart.getTime() && t < weekEnd.getTime()
      }),
    [homeEvents, weekStart, weekEnd],
  )

  const prev = () =>
    setAnchor((current) => {
      if (viewMode === 'DIA') return addDays(current, -1)
      if (viewMode === 'SEM') return addDays(current, -7)
      if (viewMode === 'ANO') return new Date(current.getFullYear() - 1, current.getMonth(), 1)
      return new Date(current.getFullYear(), current.getMonth() - 1, 1)
    })
  const next = () =>
    setAnchor((current) => {
      if (viewMode === 'DIA') return addDays(current, 1)
      if (viewMode === 'SEM') return addDays(current, 7)
      if (viewMode === 'ANO') return new Date(current.getFullYear() + 1, current.getMonth(), 1)
      return new Date(current.getFullYear(), current.getMonth() + 1, 1)
    })
  const goToday = () => setAnchor(new Date())

  const handleDayClick = (key: string) => {
    setSelectedDate(key)
    setOpenDayKey(key)
  }

  const handlePickMonth = (year: number, month: number) => {
    setAnchor(new Date(year, month, 1))
    setViewMode('MES')
  }

  const calendarCard = (
    <CalendarCard
      anchor={anchor}
      todayKey={todayKey}
      selectedKey={selectedDate}
      events={events}
      items={items}
      onPrev={prev}
      onNext={next}
      onToday={goToday}
      onDayClick={handleDayClick}
      onEventClick={setOpenEvent}
      onItemClick={setSelectedItemId}
      onToggleExpand={() => setExpanded((value) => !value)}
      expanded={showExpanded}
      onPickMonth={handlePickMonth}
      viewMode={viewMode}
      setViewMode={setViewMode}
    />
  )

  return (
    <div
      className={
        showExpanded
          ? 'flex h-[calc(100dvh-5.5rem)] flex-col px-4 pb-3 pt-3 lg:h-[calc(100vh-8rem)] lg:px-8 lg:pt-0'
          : 'px-4 pb-12 pt-3 lg:px-8 lg:pt-0'
      }
    >
      {showExpanded ? (
        calendarCard
      ) : (
        <BentoGrid className="lg:auto-rows-[240px]">
          {calendarCard}
          <NowCard now={now} />
          <AgendaCard events={todayEvents} items={todayItems} now={now} onItemClick={setSelectedItemId} onEventClick={setOpenEvent} />
          <UpNextCard event={upcomingEvent} now={now} />
          <WeekLoadCard events={weekEvents} weekStart={weekStart} />
          <FocusBlocksCard events={weekEvents} weekStart={weekStart} />
        </BentoGrid>
      )}

      {openDayKey && (
        <DayPopup
          date={openDayKey}
          events={popupEvents}
          items={popupItems}
          onEventClick={(event) => {
            setOpenDayKey(null)
            setOpenEvent(event)
          }}
          onItemClick={(id) => {
            setOpenDayKey(null)
            setSelectedItemId(id)
          }}
          onClose={() => setOpenDayKey(null)}
        />
      )}

      {openEvent && (
        <EventSheet
          event={openEvent}
          onSaved={() => setOpenEvent(null)}
          onDeleted={() => setOpenEvent(null)}
          onClose={() => setOpenEvent(null)}
        />
      )}
    </div>
  )
}
