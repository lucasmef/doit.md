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
  monthSelector?: ReactNode
  hideMonthControls?: boolean
  hideMobileNav?: boolean
  googleLike?: boolean
  calendarColors?: Map<string, string | undefined>
  weekStartsOn?: 'monday' | 'sunday'
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfWeek(year: number, month: number, weekStartsOn: 'monday' | 'sunday') {
  const day = new Date(year, month, 1).getDay()
  if (weekStartsOn === 'sunday') return day
  return day === 0 ? 6 : day - 1
}

const WEEKDAYS_MONDAY = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom']
const WEEKDAYS_SUNDAY = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']
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
  monthSelector,
  hideMonthControls = false,
  hideMobileNav = false,
  googleLike = false,
  calendarColors,
  weekStartsOn = 'monday',
}: Props) {
  const today = new Date()
  const [yearState, setYearState] = useState(today.getFullYear())
  const [monthState, setMonthState] = useState(today.getMonth())
  const year = yearProp ?? yearState
  const month = monthProp ?? monthState
  const setYear = onYearChange ?? setYearState
  const setMonth = onMonthChange ?? setMonthState

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfWeek(year, month, weekStartsOn)
  const todayStr = toLocalDateKey(today)
  const weekdays = weekStartsOn === 'sunday' ? WEEKDAYS_SUNDAY : WEEKDAYS_MONDAY

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

  function dateKey(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
      date.getDate(),
    ).padStart(2, '0')}`
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

  type CalendarCell = { date: Date; day: number; outside: boolean } | null
  const cells: CalendarCell[] = googleLike
    ? Array.from({ length: 42 }, (_, i) => {
        const date = new Date(year, month, 1 - firstDay + i)
        return { date, day: date.getDate(), outside: date.getMonth() !== month }
      })
    : [
        ...Array(firstDay).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => ({
          date: new Date(year, month, i + 1),
          day: i + 1,
          outside: false,
        })),
      ]
  const weekRows = googleLike ? 6 : Math.ceil(cells.length / 7)
  while (cells.length < weekRows * 7) cells.push(null)

  const cellHeight = compact ? 'h-9' : fillHeight ? '' : 'h-20 lg:h-24 xl:h-28'

  const containerClass = fillHeight
    ? googleLike
      ? 'flex h-full min-w-0 min-h-0 w-full select-none flex-col overflow-hidden bg-surface-panel'
      : 'flex flex-1 min-w-0 min-h-0 w-full select-none flex-col overflow-hidden rounded-none border-y border-ui-border bg-white p-2 shadow-cool-sm lg:rounded-xl lg:border lg:p-3'
    : 'min-w-0 w-full select-none overflow-hidden rounded-xl border border-ui-border bg-white p-3 shadow-cool-sm'

  const gridClass = fillHeight
    ? googleLike
      ? 'grid min-w-0 w-full flex-1 min-h-0 grid-cols-7 gap-px overflow-hidden border-t border-ui-border bg-ui-border'
      : 'grid min-w-0 w-full flex-1 min-h-0 grid-cols-7 gap-px overflow-hidden rounded-lg border border-ui-border bg-ui-border'
    : 'grid min-w-0 w-full grid-cols-7 gap-px overflow-hidden rounded-lg border border-ui-border bg-ui-border'

  const gridStyle = fillHeight
    ? { gridTemplateRows: `repeat(${weekRows}, minmax(0, 1fr))` }
    : undefined

  return (
    <div className={containerClass}>
      <div
        className={`flex shrink-0 items-center gap-2 ${
          googleLike ? 'h-14 border-b border-ui-border bg-surface-window px-2 sm:px-4' : 'mb-3 flex-wrap items-start justify-between'
        }`}
      >
        <div
          className={`flex min-w-0 items-center ${
            googleLike ? 'order-1 flex-1 gap-2' : 'gap-3'
          }`}
        >
          {googleLike && headerControls ? (
            <div className="flex shrink-0">{headerControls}</div>
          ) : null}
          {googleLike && monthSelector ? (
            <div className="min-w-0 flex-1">{monthSelector}</div>
          ) : (
            <h2
              className={`${compact ? 'text-[14px]' : googleLike ? 'truncate text-[18px] font-normal sm:text-[22px]' : 'text-lg font-bold'} text-navy-900`}
            >
              {MONTHS[month]} {year}
            </h2>
          )}
          {!googleLike && headerControls ? (
            <div className={googleLike ? 'flex shrink-0' : 'mt-1 flex flex-wrap gap-1.5'}>
              {headerControls}
            </div>
          ) : null}
        </div>
        {!hideMonthControls ? (
          <div
            className={`items-center gap-1 ${googleLike ? 'order-2 shrink-0' : 'rounded-lg bg-surface-soft p-1'} ${
              hideMobileNav ? 'hidden lg:flex' : 'flex'
            }`}
          >
            <button
              onClick={prevMonth}
              className={`rounded-md px-2 py-1 text-navy-500 transition-colors hover:bg-surface-soft ${
                googleLike ? 'text-lg leading-none' : 'font-mono text-[11px] font-medium'
              }`}
              aria-label="Mes anterior"
            >
              {googleLike || compact ? '<' : 'Anterior'}
            </button>
            <button
              onClick={() => {
                setYear(today.getFullYear())
                setMonth(today.getMonth())
              }}
              className={`rounded-md px-3 py-1 transition-colors hover:bg-surface-soft ${
                googleLike
                  ? 'border border-ui-border text-[13px] font-medium text-navy-700'
                  : 'font-mono text-[11px] font-medium text-navy-500 hover:bg-white'
              }`}
            >
              Hoje
            </button>
            <button
              onClick={nextMonth}
              className={`rounded-md px-2 py-1 text-navy-500 transition-colors hover:bg-surface-soft ${
                googleLike ? 'text-lg leading-none' : 'font-mono text-[11px] font-medium'
              }`}
              aria-label="Proximo mes"
            >
              {googleLike || compact ? '>' : 'Proximo'}
            </button>
          </div>
        ) : null}
      </div>

      <div className={`${googleLike ? 'grid border-b border-ui-border bg-surface-panel' : 'mb-2 grid'} shrink-0 grid-cols-7`}>
        {weekdays.map((d) => (
          <div
            key={d}
            className={`py-1.5 text-center text-[10px] font-medium uppercase text-navy-400 ${
              googleLike ? '' : 'font-mono font-bold tracking-wide'
            }`}
          >
            {compact ? d.slice(0, 1) : d.toUpperCase()}
          </div>
        ))}
      </div>

      <div className={gridClass} style={gridStyle}>
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} className={`${cellHeight} bg-white`} />

          const ds = googleLike ? dateKey(day.date) : dayStr(day.day)
          const dayItems = googleLike || day.outside ? [] : itemsForDay(day.day)
          const dayEvents = googleLike
            ? (events || [])
                .filter((e) => e.start.slice(0, 10) === ds)
                .sort((a, b) => a.start.localeCompare(b.start))
            : eventsForDay(day.day)
          const isToday = ds === todayStr
          const isSelected = ds === selectedDate

          const entries: Array<
            | { kind: 'item'; id: string; title: string; complexity?: Item['complexity'] }
            | {
                kind: 'event'
                id: string
                title: string
                start: string
                end: string
                allDay: boolean
                googleCalendarId?: string
              }
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
              end: ev.end,
              allDay: ev.allDay,
              googleCalendarId: ev.googleCalendarId,
            })),
          ]

          const visibleLimit = googleLike && entries.length > 3 ? 3 : googleLike ? 3 : fillHeight ? 5 : 3
          const visible = compact ? [] : entries.slice(0, visibleLimit)
          const hidden = entries.length - visible.length
          const desktopHidden = googleLike && entries.length > 3 ? entries.length - 2 : hidden
          const mobileHidden = hidden

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
              className={`relative flex ${cellHeight} min-h-0 flex-col items-start overflow-hidden ${
                googleLike ? 'bg-surface-panel px-0.5 py-0.5 sm:p-1' : 'bg-white p-1.5'
              } text-left transition-colors hover:bg-surface-soft ${
                isSelected && !googleLike ? 'z-10 ring-2 ring-inset ring-brand-400' : ''
              } ${day.outside ? 'text-navy-300' : ''}`}
            >
              <span
                className={`${compact ? 'h-6 w-6 text-[11px]' : googleLike ? 'mb-0.5 h-6 w-6 text-[12px]' : 'mb-1 h-7 w-7 text-[13px]'} flex shrink-0 items-center justify-center rounded-full font-medium ${
                  isToday
                    ? 'bg-brand-600 text-white'
                    : day.outside
                      ? 'text-navy-300'
                      : 'text-navy-700'
                }`}
              >
                {day.day}
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
                <div className="flex w-full min-h-0 flex-1 flex-col gap-px overflow-hidden sm:gap-0.5">
                  {visible.map((entry, entryIndex) => {
                    if (entry.kind === 'event') {
                      const time = formatEventTime(entry.start, entry.allDay)
                      const isPast =
                        new Date(entry.end || entry.start).getTime() < new Date().getTime()
                      const eventColor = entry.googleCalendarId
                        ? calendarColors?.get(entry.googleCalendarId)
                        : undefined
                      return (
                        <button
                          type="button"
                          key={`event-${entry.id}`}
                          onClick={(event) => {
                            event.stopPropagation()
                            const calendarEvent = dayEvents.find((ev) => ev.id === entry.id)
                            if (calendarEvent) onEventClick?.(calendarEvent)
                          }}
                          className={`flex w-full items-center truncate rounded-md px-1.5 py-0.5 text-left font-medium transition-opacity ${
                            googleLike
                              ? `min-h-4 bg-brand-600 px-1 py-0 text-[9px] leading-4 text-white hover:brightness-95 sm:min-h-5 sm:px-1 sm:py-0 sm:text-[11px] ${entryIndex >= 2 ? 'lg:hidden' : ''}`
                              : 'gap-1 bg-brand-100 text-[10px] text-navy-700'
                          } ${isPast ? 'opacity-35 grayscale' : ''}`}
                          style={googleLike && eventColor ? { backgroundColor: eventColor } : undefined}
                          title={entry.title}
                        >
                          {time && !googleLike && (
                            <span
                              className={`font-mono text-[9px] ${
                                googleLike ? 'text-white/85' : 'text-navy-500'
                              }`}
                            >
                              {time}
                            </span>
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
                        className={`w-full truncate rounded-md px-1 py-0 text-left text-[9px] font-medium leading-4 sm:px-1.5 sm:py-0.5 sm:text-[10px] ${googleLike && entryIndex >= 2 ? 'lg:hidden' : ''} ${badgeClass}`}
                        title={entry.title}
                      >
                        {entry.title}
                      </div>
                    )
                  })}
                  {(googleLike ? desktopHidden > 0 : hidden > 0) && (
                    <span className="px-1 font-mono text-[9px] font-medium leading-4 text-navy-300 sm:text-[10px]">
                      {googleLike ? (
                        <>
                          <span className="lg:hidden">mais {mobileHidden}</span>
                          <span className="hidden lg:inline">mais {desktopHidden}</span>
                        </>
                      ) : (
                        `+ ${hidden} ${hidden === 1 ? 'item' : 'itens'}`
                      )}
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
