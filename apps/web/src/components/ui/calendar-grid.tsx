'use client'

import { useState } from 'react'
import type { Item } from '@doit/types'
import { toLocalDateKey } from '@doit/core'

type Props = {
  items: Item[]
  onDayClick?: (date: string) => void
  selectedDate?: string
  compact?: boolean
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

export function CalendarGrid({ items, onDayClick, selectedDate, compact = false }: Props) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfWeek(year, month)
  const todayStr = toLocalDateKey(today)

  function prevMonth() {
    if (month === 0) {
      setYear((y) => y - 1)
      setMonth(11)
    } else setMonth((m) => m - 1)
  }

  function nextMonth() {
    if (month === 11) {
      setYear((y) => y + 1)
      setMonth(0)
    } else setMonth((m) => m + 1)
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

  const cells = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  const cellHeight = compact ? 'h-9' : 'h-20 lg:h-24 xl:h-28'

  return (
    <div className="select-none rounded-xl border border-ui-border bg-white p-3 shadow-cool-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className={`${compact ? 'text-[14px]' : 'text-lg'} font-bold text-navy-900`}>
          {MONTHS[month]} {year}
        </h2>
        <div className="flex items-center gap-1 rounded-lg bg-surface-soft p-1">
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

      <div className="mb-2 grid grid-cols-7">
        {WEEKDAYS.map((d) => (
          <div
            key={d}
            className="py-1.5 text-center font-mono text-[10px] font-bold uppercase tracking-wide text-navy-300"
          >
            {compact ? d.slice(0, 1) : d.toUpperCase()}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-ui-border bg-ui-border">
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} className={`${cellHeight} bg-white`} />

          const ds = dayStr(day)
          const dayItems = itemsForDay(day)
          const isToday = ds === todayStr
          const isSelected = ds === selectedDate

          return (
            <button
              key={ds}
              onClick={() => onDayClick?.(ds)}
              className={`relative flex ${cellHeight} flex-col items-start bg-white p-1.5 transition-colors hover:bg-surface-soft ${isSelected ? 'z-10 ring-2 ring-inset ring-brand-400' : ''}`}
            >
              <span
                className={`${compact ? 'h-6 w-6 text-[11px]' : 'mb-1 h-7 w-7 text-[13px]'} flex items-center justify-center rounded-full font-medium ${
                  isToday ? 'bg-brand-600 text-white' : 'text-navy-700'
                }`}
              >
                {day}
              </span>

              <div
                className={`w-full overflow-hidden ${compact ? 'absolute bottom-1 left-0 flex justify-center' : 'flex flex-col gap-1'}`}
              >
                {dayItems.slice(0, 3).map((item) => {
                  if (compact) {
                    return (
                      <span
                        key={item.id}
                        className="mx-0.5 h-1 w-1 rounded-full bg-teal-500"
                        title={item.title}
                      />
                    )
                  }

                  let badgeClass = 'bg-navy-50 text-navy-500'
                  if (item.complexity === 'task') badgeClass = 'bg-brand-50 text-navy-700'
                  if (item.complexity === 'note') badgeClass = 'bg-teal-50 text-navy-700'
                  if (item.complexity === 'project') badgeClass = 'bg-brand-100 text-navy-700'
                  if (item.complexity === 'document') badgeClass = 'bg-teal-100 text-navy-700'

                  return (
                    <div
                      key={item.id}
                      className={`w-full truncate rounded-md px-1.5 py-0.5 text-left text-[10px] font-medium ${badgeClass}`}
                      title={item.title}
                    >
                      {item.title}
                    </div>
                  )
                })}
                {!compact && dayItems.length > 3 && (
                  <span className="px-1 font-mono text-[10px] font-medium text-navy-300">
                    + {dayItems.length - 3} itens
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
