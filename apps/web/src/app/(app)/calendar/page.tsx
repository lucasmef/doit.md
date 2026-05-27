'use client'

import { useEffect, useMemo, useState } from 'react'
import type { CalendarEvent, Item } from '@doit/types'
import { toLocalDateKey } from '@doit/core'
import { BentoGrid, CardTitle, DarkGlowCard, GlassCard } from '@/components/ui/bento'
import { useCalendarEvents } from '@/hooks/use-calendar-events'
import { useItems } from '@/hooks/use-items'
import { useUI } from '@/store/ui'

const WEEKDAY_PT = ['domingo', 'segunda-feira', 'terca-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sabado']
const MONTH_PT = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ']
const MONTH_LONG = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const DOW_SHORT = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB']

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

function MonthCard({
  cursorYear,
  cursorMonth,
  todayKey,
  events,
  items,
  onPrev,
  onNext,
  onToday,
}: {
  cursorYear: number
  cursorMonth: number
  todayKey: string
  events: CalendarEvent[]
  items: Item[]
  onPrev: () => void
  onNext: () => void
  onToday: () => void
}) {
  const cells = useMemo(() => buildMonthCells(cursorYear, cursorMonth), [cursorYear, cursorMonth])
  const eventsMap = useMemo(() => eventsByDay(events), [events])
  const itemsMap = useMemo(() => itemsByDay(items), [items])
  const weekNumber = useMemo(() => {
    const firstThursday = new Date(cursorYear, 0, 4)
    const offset = (firstThursday.getDay() + 6) % 7
    const start = addDays(firstThursday, -offset)
    const today = new Date(todayKey + 'T12:00:00')
    return Math.max(1, Math.floor((today.getTime() - start.getTime()) / (7 * 86400 * 1000)) + 1)
  }, [cursorYear, todayKey])

  return (
    <GlassCard className="flex flex-col p-6 lg:col-span-8 lg:row-span-3">
      <div className="mb-3 flex items-center justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <h2 className="text-[34px] font-black leading-none -tracking-[.04em] text-navy-900">
            {MONTH_LONG[cursorMonth]}
          </h2>
          <span className="font-mono text-[11px] font-bold tracking-wider text-navy-500">
            {cursorYear} · SEMANA {weekNumber}
          </span>
          <div className="ml-4 inline-flex items-center gap-1.5">
            <button
              type="button"
              onClick={onPrev}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-navy-900/[0.04] text-navy-500 hover:bg-navy-900/[0.10] hover:text-navy-900"
              aria-label="Mes anterior"
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
              aria-label="Proximo mes"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 6 6 6-6 6" />
              </svg>
            </button>
          </div>
        </div>
        <div className="inline-flex items-center gap-px rounded-full border border-white/55 bg-white/55 p-1 font-mono text-[10px] font-bold tracking-wider text-navy-500 shadow-cool-sm">
          {(['DIA', 'SEM', 'MES', 'ANO'] as const).map((label) => (
            <span
              key={label}
              className={`rounded-full px-2.5 py-1 ${label === 'MES' ? 'bg-white text-navy-900 shadow-cool-sm' : 'hover:text-navy-900'}`}
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="grid flex-1 grid-cols-7 gap-1.5">
        {DOW_SHORT.map((dow) => (
          <div key={dow} className="pb-1 text-center font-mono text-[10px] font-bold tracking-wider text-navy-500">
            {dow}
          </div>
        ))}
        {cells.map((date, i) => {
          const key = toLocalDateKey(date)
          const inMonth = date.getMonth() === cursorMonth
          const isToday = key === todayKey
          const isWeekend = date.getDay() === 0 || date.getDay() === 6
          const dayEvents = eventsMap.get(key) ?? []
          const dayItems = itemsMap.get(key) ?? []
          const total = dayEvents.length + dayItems.length
          const visible = dayEvents.slice(0, 2)
          const visibleItems = dayItems.slice(0, Math.max(0, 2 - visible.length))
          const more = total - visible.length - visibleItems.length
          return (
            <div
              key={i}
              className={`relative flex min-h-[58px] flex-col gap-0.5 overflow-hidden rounded-[10px] p-1.5 ${
                isToday
                  ? 'border-[1.5px] border-navy-900 bg-white/92 shadow-[0_6px_16px_-8px_rgba(15,35,66,.30)]'
                  : isWeekend
                    ? 'bg-white/35'
                    : ''
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
                  className={`truncate rounded px-1.5 py-0.5 text-[10.5px] font-semibold leading-tight ${toneClass(eventTone(idx))}`}
                  title={event.title}
                >
                  {event.title}
                </span>
              ))}
              {visibleItems.map((item, idx) => (
                <span
                  key={item.id}
                  className={`truncate rounded px-1.5 py-0.5 text-[10.5px] font-semibold leading-tight ${toneClass(eventTone(idx + visible.length))}`}
                  title={item.title}
                >
                  {item.title}
                </span>
              ))}
              {more > 0 ? (
                <span className="mt-auto font-mono text-[9.5px] text-navy-500">+{more} mais</span>
              ) : null}
            </div>
          )
        })}
      </div>
    </GlassCard>
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
}: {
  events: CalendarEvent[]
  items: Item[]
  now: Date
  onItemClick: (id: string) => void
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
  }, [events, items, nowMs, onItemClick])

  return (
    <GlassCard className="flex flex-col p-6 lg:col-span-4 lg:row-span-2">
      <div className="mb-3 flex items-center justify-between">
        <CardTitle>agenda de hoje</CardTitle>
        <span className="rounded-full bg-navy-900/[0.05] px-2 py-0.5 font-mono text-[10px] text-navy-500">{rows.length} itens</span>
      </div>
      {rows.length === 0 ? (
        <div className="grid flex-1 place-items-center font-mono text-[11px] text-navy-500">
          sem agenda hoje
        </div>
      ) : (
        <div className="relative flex-1 overflow-hidden pl-14">
          <div className="absolute bottom-1 left-14 top-1 w-px bg-navy-900/10" aria-hidden="true" />
          <div className="flex flex-col gap-1.5">
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
                  className="relative flex items-start gap-3 py-1.5 pl-4 text-left"
                >
                  <span className="absolute -left-[60px] top-2 w-10 text-right font-mono text-[10.5px] tracking-wider text-navy-500">{row.hour}</span>
                  <span className={`absolute -left-1 top-3 h-[9px] w-[9px] rounded-full border-2 ${dotTone}`} aria-hidden="true" />
                  <div
                    className={`flex-1 rounded-[10px] border border-navy-900/[0.06] bg-white/60 px-3 py-2 [border-left-width:3px] ${
                      row.tone === 'blue' ? '[border-left-color:#2F6BFF]' : ''
                    } ${row.tone === 'teal' ? 'bg-[rgba(40,199,183,.07)] [border-left-color:#28C7B7]' : ''} ${
                      row.tone === 'violet' ? 'bg-[rgba(123,91,255,.07)] [border-left-color:#7B5BFF]' : ''
                    } ${row.tone === 'pink' ? 'bg-[rgba(255,111,174,.07)] [border-left-color:#FF6FAE]' : ''} ${
                      row.tone === 'amber' ? 'bg-[rgba(245,165,36,.08)] [border-left-color:#F5A524]' : ''
                    } ${row.done ? 'opacity-65' : ''}`}
                  >
                    <div className={`text-[13px] font-semibold leading-tight -tracking-[.01em] ${row.done ? 'text-navy-500 line-through' : 'text-navy-900'}`}>
                      {row.title}
                    </div>
                    <div className="mt-0.5 font-mono text-[10.5px] text-navy-500">{row.meta}</div>
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
    <DarkGlowCard className="flex flex-col p-6 lg:col-span-4 lg:row-span-2">
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
    </DarkGlowCard>
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
  const [cursor, setCursor] = useState<{ year: number; month: number }>(() => {
    const d = new Date()
    return { year: d.getFullYear(), month: d.getMonth() }
  })
  const { items } = useItems()
  const { setSelectedItemId } = useUI()

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30000)
    return () => window.clearInterval(id)
  }, [])

  const monthRange = useMemo(() => {
    const start = new Date(cursor.year, cursor.month, -7)
    const end = new Date(cursor.year, cursor.month + 1, 7, 23, 59, 59)
    return { from: start.toISOString(), to: end.toISOString() }
  }, [cursor])

  const { events } = useCalendarEvents(monthRange.from, monthRange.to)

  const todayKey = toLocalDateKey(now)
  const todayEvents = useMemo(
    () => events.filter((event) => toLocalDateKey(new Date(event.start)) === todayKey).sort((a, b) => a.start.localeCompare(b.start)),
    [events, todayKey],
  )
  const todayItems = useMemo(
    () =>
      items.filter((item) => {
        const key = item.dueDate ?? item.scheduledDate
        return key === todayKey && item.status !== 'archived'
      }),
    [items, todayKey],
  )

  const upcomingEvent = useMemo(() => {
    const nowMs = now.getTime()
    return events
      .filter((event) => new Date(event.start).getTime() > nowMs)
      .sort((a, b) => a.start.localeCompare(b.start))[0] ?? null
  }, [events, now])

  const weekStart = useMemo(() => {
    const d = startOfDay(now)
    return addDays(d, -d.getDay())
  }, [now])
  const weekEnd = useMemo(() => addDays(weekStart, 7), [weekStart])
  const weekEvents = useMemo(
    () =>
      events.filter((event) => {
        const t = new Date(event.start).getTime()
        return t >= weekStart.getTime() && t < weekEnd.getTime()
      }),
    [events, weekStart, weekEnd],
  )

  const prev = () =>
    setCursor((current) => {
      const m = current.month - 1
      if (m < 0) return { year: current.year - 1, month: 11 }
      return { year: current.year, month: m }
    })
  const next = () =>
    setCursor((current) => {
      const m = current.month + 1
      if (m > 11) return { year: current.year + 1, month: 0 }
      return { year: current.year, month: m }
    })
  const goToday = () => {
    const d = new Date()
    setCursor({ year: d.getFullYear(), month: d.getMonth() })
  }

  return (
    <div className="px-4 pb-12 pt-3 lg:px-8 lg:pt-4">
      <BentoGrid className="lg:auto-rows-[140px]">
        <MonthCard
          cursorYear={cursor.year}
          cursorMonth={cursor.month}
          todayKey={todayKey}
          events={events}
          items={items}
          onPrev={prev}
          onNext={next}
          onToday={goToday}
        />
        <NowCard now={now} />
        <AgendaCard events={todayEvents} items={todayItems} now={now} onItemClick={setSelectedItemId} />
        <UpNextCard event={upcomingEvent} now={now} />
        <WeekLoadCard events={weekEvents} weekStart={weekStart} />
        <FocusBlocksCard events={weekEvents} weekStart={weekStart} />
      </BentoGrid>
    </div>
  )
}
