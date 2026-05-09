'use client'

import { useState } from 'react'
import type { Item } from '@doit/types'
import { toLocalDateKey } from '@doit/core'
import { useCalendarEvents } from '@/hooks/use-calendar-events'
import { CalendarGrid } from '@/components/ui/calendar-grid'
import { DayAgenda } from '@/components/ui/day-agenda'

type Props = {
  items: Item[]
  compactSide?: boolean
}

function formatTime(dt: string, allDay: boolean) {
  if (allDay) return 'Dia todo'
  return new Date(dt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function CalendarBoard({ items, compactSide = false }: Props) {
  const today = toLocalDateKey()
  const [selectedDate, setSelectedDate] = useState(today)
  const { events } = useCalendarEvents(`${selectedDate}T00:00:00Z`, `${selectedDate}T23:59:59Z`)
  const activeItems = (items || []).filter(
    (item) => item.status !== 'archived' && item.status !== 'done',
  )
  const dayEvents = events
    .filter((event) => event.start.slice(0, 10) === selectedDate)
    .sort((a, b) => a.start.localeCompare(b.start))

  return (
    <div
      className={`flex flex-1 min-h-0 flex-col gap-4 overflow-hidden ${compactSide ? 'p-4' : 'p-4 lg:p-5'} lg:flex-row`}
    >
      <div className="flex-1 min-w-0 overflow-y-auto">
        <CalendarGrid
          items={activeItems}
          selectedDate={selectedDate}
          onDayClick={setSelectedDate}
        />
      </div>

      <div className="w-full shrink-0 overflow-y-auto border-t border-ui-border pt-4 lg:w-[300px] lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
        <section>
          <h3 className="mb-2 font-mono text-[10px] font-bold uppercase tracking-wide text-navy-300">
            Eventos
          </h3>
          {dayEvents.length === 0 ? (
            <p className="rounded-lg border border-dashed border-ui-border-strong px-3 py-3 font-mono text-[11px] text-navy-300">
              Nenhum evento nesta data.
            </p>
          ) : (
            <div className="space-y-1.5">
              {dayEvents.map((event) => (
                <div
                  key={event.id}
                  className="rounded-lg border border-ui-border bg-white px-3 py-2 shadow-cool-sm"
                >
                  <p className="truncate text-[13px] font-semibold text-navy-900">{event.title}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-navy-300">
                    {formatTime(event.start, event.allDay)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <DayAgenda date={selectedDate} items={activeItems} compact />
      </div>
    </div>
  )
}
