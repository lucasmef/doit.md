'use client'

import { useState, type ReactNode } from 'react'
import type { Item, CalendarEvent } from '@doit/types'
import { toLocalDateKey } from '@doit/core'

type Props = {
  items: Item[]
  events?: CalendarEvent[]
  onDayClick?: (date: string) => void
  selectedDate?: string
  compact?: boolean
  fillHeight?: boolean
  year?: number
  month?: number
  onYearChange?: (year: number) => void
  onMonthChange?: (month: number) => void
  onEventClick?: (event: CalendarEvent) => void
  headerControls?: ReactNode
  hideMobileNav?: boolean
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfWeek(year: number, month: number) {
  const day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1
}

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom']
const MONTHS = [
  'Janeiro',
  'Fevereiro',
  'Marco',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
]

export function CalendarGrid({
  items,
  events = [],
  onDayClick,
  selectedDate,
  compact = false,
  fillHeight = false,
  year: yearProp,
  month: monthProp,
  onYearChange,
  onMonthChange,
  onEventClick,
  headerControls,
  hideMobileNav = false,
}: Props) {
  const today = new Date()
  const [yearState, setYearState] = useState(today.getFullYear())
  const [monthState, setMonthState] = useState(today.getMonth())
  const year = yearProp ?? yearState
  const month = monthProp ?? monthState
  const setYear = onYearChange ?? setYearState
  const setMonth = onMonthChange ?? setMonthState

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfWeek(year, month)
  const todayStr = toLocalDateKey(today)

  function prevMonth() {
    if (month === 0) {
      setYear(year - 1)
      setMonth(11)
    } else setMonth(month - 1)
  }

  function nextMonth() {
    if (month === 11) {
      setYear(year + 1)
      setMonth(0)
    } else setMonth(month + 1)
  }

  function dayStr(d: number) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }

  function itemsForDay(d: number) {
    const ds = dayStr(d)
    return (items || []).filter(
      (i) =>
        i &&
        i.status !== 'archived' &&
        i.status !== 'done' &&
        (i.dueDate === ds || i.scheduledDate === ds),
    )
  }

  function eventsForDay(d: number) {
    const ds = dayStr(d)
    return (events || [])
      .filter((e) => e.start.slice(0, 10) === ds)
      .sort((a, b) => a.start.localeCompare(b.start))
  }

  function formatEventTime(dt: string, allDay: boolean) {
    if (allDay) return ''
    return new Date(dt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  const cells = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  const weekRows = Math.ceil(cells.length / 7)
  while (cells.length < weekRows * 7) cells.push(null)

  const cellHeight = compact ? 'h-9' : fillHeight ? '' : 'h-20 lg:h-24 xl:h-28'

  const containerClass = fillHeight
    ? 'flex flex-1 min-h-0 select-none flex-col rounded-none border-y border-ui-border bg-white p-2 shadow-cool-sm lg:rounded-xl lg:border lg:p-3'
    : 'select-none rounded-xl border border-ui-border bg-white p-3 shadow-cool-sm'

  const gridClass = fillHeight
    ? 'grid flex-1 min-h-0 grid-cols-7 gap-px overflow-hidden rounded-lg border border-ui-border bg-ui-border'
    : 'grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-ui-border bg-ui-border'

  const gridStyle = fillHeight
    ? { gridTemplateRows: `repeat(${weekRows}, minmax(0, 1fr))` }
    : undefined

  return (
    <div className={containerClass}>
      <div className="mb-3 flex shrink-0 flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className={`${compact ? 'text-[14px]' : 'text-lg'} font-bold text-navy-900`}>
            {MONTHS[month]} {year}
          </h2>
          {headerControls ? (
            <div className="mt-1 flex flex-wrap gap-1.5">{headerControls}</div>
          ) : null}
        </div>
        <div
          className={`items-center gap-1 rounded-lg bg-surface-soft p-1 ${
            hideMobileNav ? 'hidden lg:flex' : 'flex'
          }`}
        >
          <button
            onClick={prevMonth}
            className="rounded-md px-2 py-1 font-mono text-[11px] font-medium text-navy-500 transition-colors hover:bg-white"
          >
            {compact ? '<' : 'Anterior'}
          </button>
          <button
            onClick={() => {
              setYear(today.getFullYear())
              setMonth(today.getMonth())
            }}
            className="rounded-md px-2 py-1 font-mono text-[11px] font-medium text-navy-500 transition-colors hover:bg-white"
          >
            Hoje
          </button>
          <button
            onClick={nextMonth}
            className="rounded-md px-2 py-1 font-mono text-[11px] font-medium text-navy-500 transition-colors hover:bg-white"
          >
            {compact ? '>' : 'Proximo'}
          </button>
        </div>
      </div>

      <div className="mb-2 grid shrink-0 grid-cols-7">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="py-1.5 text-center font-mono text-[10px] font-bold uppercase tracking-wide text-navy-300"
          >
            {compact ? d.slice(0, 1) : d.toUpperCase()}
          </div>
        ))}
      </div>

      <div className={gridClass} style={gridStyle}>
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} className={`${cellHeight} bg-white`} />

          const ds = dayStr(day)
          const dayItems = itemsForDay(day)
          const dayEvents = eventsForDay(day)
          const isToday = ds === todayStr
          const isSelected = ds === selectedDate

          const entries: Array<
            | { kind: 'item'; id: string; title: string; complexity?: Item['complexity'] }
            | { kind: 'event'; id: string; title: string; start: string; allDay: boolean }
          > = [
            ...dayItems.map((it) => ({
              kind: 'item' as const,
              id: it.id,
              title: it.title,
              complexity: it.complexity,
            })),
            ...dayEvents.map((ev) => ({
              kind: 'event' as const,
              id: ev.id,
              title: ev.title,
              start: ev.start,
              allDay: ev.allDay,
            })),
          ]

          const visible = compact ? [] : entries.slice(0, fillHeight ? 5 : 3)
          const hidden = entries.length - visible.length

          return (
            <div
              key={ds}
              onClick={() => onDayClick?.(ds)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onDayClick?.(ds)
                }
              }}
              className={`relative flex ${cellHeight} min-h-0 flex-col items-start overflow-hidden bg-white p-1.5 text-left transition-colors hover:bg-surface-soft ${isSelected ? 'z-10 ring-2 ring-inset ring-brand-400' : ''}`}
            >
              <span
                className={`${compact ? 'h-6 w-6 text-[11px]' : 'mb-1 h-7 w-7 text-[13px]'} flex shrink-0 items-center justify-center rounded-full font-medium ${
                  isToday ? 'bg-brand-600 text-white' : 'text-navy-700'
                }`}
              >
                {day}
              </span>

              {compact ? (
                <div className="absolute bottom-1 left-0 flex w-full justify-center">
                  {entries.slice(0, 3).map((entry) => (
                    <span
                      key={`${entry.kind}-${entry.id}`}
                      className={`mx-0.5 h-1 w-1 rounded-full ${entry.kind === 'event' ? 'bg-brand-500' : 'bg-teal-500'}`}
                      title={entry.title}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex w-full min-h-0 flex-1 flex-col gap-1 overflow-hidden">
                  {visible.map((entry) => {
                    if (entry.kind === 'event') {
                      const time = formatEventTime(entry.start, entry.allDay)
                      return (
                        <button
                          type="button"
                          key={`event-${entry.id}`}
                          onClick={(event) => {
                            event.stopPropagation()
                            const calendarEvent = dayEvents.find((ev) => ev.id === entry.id)
                            if (calendarEvent) onEventClick?.(calendarEvent)
                          }}
                          className="flex w-full items-center gap-1 truncate rounded-md bg-brand-100 px-1.5 py-0.5 text-left text-[10px] font-medium text-navy-700"
                          title={entry.title}
                        >
                          {time && (
                            <span className="font-mono text-[9px] text-navy-500">{time}</span>
                          )}
                          <span className="truncate">{entry.title}</span>
                        </button>
                      )
                    }

                    let badgeClass = 'bg-navy-50 text-navy-500'
                    if (entry.complexity === 'task') badgeClass = 'bg-brand-50 text-navy-700'
                    if (entry.complexity === 'note') badgeClass = 'bg-teal-50 text-navy-700'
                    if (entry.complexity === 'project') badgeClass = 'bg-brand-100 text-navy-700'
                    if (entry.complexity === 'document') badgeClass = 'bg-teal-100 text-navy-700'

                    return (
                      <div
                        key={`item-${entry.id}`}
                        className={`w-full truncate rounded-md px-1.5 py-0.5 text-left text-[10px] font-medium ${badgeClass}`}
                        title={entry.title}
                      >
                        {entry.title}
                      </div>
                    )
                  })}
                  {hidden > 0 && (
                    <span className="px-1 font-mono text-[10px] font-medium text-navy-300">
                      + {hidden} {hidden === 1 ? 'item' : 'itens'}
                    </span>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
