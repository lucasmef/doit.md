'use client'

import { useMemo, useState } from 'react'
import type { Item } from '@doit/types'
import { useCalendarEvents } from '@/hooks/use-calendar-events'
import { CalendarGrid } from '@/components/ui/calendar-grid'

type Props = {
  items: Item[]
  compactSide?: boolean
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

  return (
    <div
      className={`flex flex-1 min-h-0 flex-col gap-3 overflow-hidden ${compactSide ? 'p-4' : 'p-4 lg:p-5'}`}
    >
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
