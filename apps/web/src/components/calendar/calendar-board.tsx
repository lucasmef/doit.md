'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { Item } from '@doit/types'
import { useCalendarEvents } from '@/hooks/use-calendar-events'
import { CalendarGrid } from '@/components/ui/calendar-grid'

type Props = {
  items: Item[]
  compactSide?: boolean
}

const MONTH_SHORT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const MONTH_RANGE = 24

function buildMonthList(baseYear: number, baseMonth: number) {
  const list: Array<{ year: number; month: number; key: string }> = []
  for (let offset = -MONTH_RANGE; offset <= MONTH_RANGE; offset++) {
    const d = new Date(baseYear, baseMonth + offset, 1)
    list.push({
      year: d.getFullYear(),
      month: d.getMonth(),
      key: `${d.getFullYear()}-${d.getMonth()}`,
    })
  }
  return list
}

export function CalendarBoard({ items, compactSide = false }: Props) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [showItems, setShowItems] = useState(true)
  const [showEvents, setShowEvents] = useState(true)

  const { from, to } = useMemo(() => {
    const start = new Date(year, month, 1)
    const end = new Date(year, month + 1, 0, 23, 59, 59)
    return { from: start.toISOString(), to: end.toISOString() }
  }, [year, month])

  const { events } = useCalendarEvents(from, to)

  const activeItems = (items || []).filter(
    (item) => item.status !== 'archived' && item.status !== 'done',
  )

  const todayYear = today.getFullYear()
  const todayMonth = today.getMonth()
  const monthList = useMemo(() => buildMonthList(todayYear, todayMonth), [todayYear, todayMonth])
  const stripRef = useRef<HTMLDivElement | null>(null)
  const monthRefs = useRef<Map<string, HTMLButtonElement>>(new Map())

  function scrollToMonth(year: number, month: number, behavior: ScrollBehavior = 'smooth') {
    const el = monthRefs.current.get(`${year}-${month}`)
    const container = stripRef.current
    if (!el || !container) return
    const offset = el.offsetLeft - container.clientWidth / 2 + el.clientWidth / 2
    container.scrollTo({ left: offset, behavior })
  }

  useEffect(() => {
    scrollToMonth(year, month, 'auto')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    scrollToMonth(year, month)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month])

  function goToToday() {
    setYear(todayYear)
    setMonth(todayMonth)
    scrollToMonth(todayYear, todayMonth)
  }

  function selectMonth(y: number, m: number) {
    setYear(y)
    setMonth(m)
    scrollToMonth(y, m)
  }

  return (
    <div
      className={`flex flex-1 min-h-0 flex-col gap-3 overflow-hidden ${compactSide ? 'p-4' : 'p-4 lg:p-5'}`}
    >
      {!compactSide && (
        <div className="flex shrink-0 items-center gap-2 lg:hidden">
          <button
            onClick={goToToday}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ui-border bg-white text-navy-700 shadow-cool-sm transition-colors hover:bg-surface-soft"
            title="Voltar para hoje"
            aria-label="Voltar para hoje"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path strokeLinecap="round" d="M3 9h18M8 3v4M16 3v4" />
              <circle cx="12" cy="14" r="1.5" fill="currentColor" stroke="none" />
            </svg>
          </button>
          <div
            ref={stripRef}
            className="flex flex-1 items-center gap-1.5 overflow-x-auto scroll-smooth pb-1 [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarWidth: 'none' }}
          >
            {monthList.map((m) => {
              const isCurrent = m.year === todayYear && m.month === todayMonth
              const isSelected = m.year === year && m.month === month
              return (
                <button
                  key={m.key}
                  ref={(el) => {
                    if (el) monthRefs.current.set(m.key, el)
                    else monthRefs.current.delete(m.key)
                  }}
                  onClick={() => selectMonth(m.year, m.month)}
                  className={`flex shrink-0 flex-col items-center justify-center rounded-lg border px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wide transition-colors ${
                    isSelected
                      ? 'border-brand-500 bg-brand-600 text-white'
                      : isCurrent
                        ? 'border-brand-300 bg-brand-50 text-navy-900'
                        : 'border-ui-border bg-white text-navy-500 hover:text-navy-900'
                  }`}
                >
                  <span className="text-[9px] opacity-70">{m.year}</span>
                  <span className="text-[12px]">{MONTH_SHORT[m.month]}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <button
          onClick={() => setShowItems((v) => !v)}
          className={`rounded-md border px-3 py-1.5 font-mono text-[11px] font-medium transition-colors ${
            showItems
              ? 'border-brand-200 bg-brand-50 text-navy-900'
              : 'border-ui-border bg-white text-navy-300 hover:text-navy-700'
          }`}
        >
          Tarefas e notas
        </button>
        <button
          onClick={() => setShowEvents((v) => !v)}
          className={`rounded-md border px-3 py-1.5 font-mono text-[11px] font-medium transition-colors ${
            showEvents
              ? 'border-teal-200 bg-teal-50 text-navy-900'
              : 'border-ui-border bg-white text-navy-300 hover:text-navy-700'
          }`}
        >
          Eventos do Google
        </button>
      </div>

      <div className="flex flex-1 min-h-0">
        <CalendarGrid
          items={showItems ? activeItems : []}
          events={showEvents ? events : []}
          year={year}
          month={month}
          onYearChange={setYear}
          onMonthChange={setMonth}
          compact={compactSide}
          fillHeight={!compactSide}
        />
      </div>
    </div>
  )
}
