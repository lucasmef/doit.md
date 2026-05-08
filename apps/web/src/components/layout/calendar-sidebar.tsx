'use client'

import { useState } from 'react'
import { useItems } from '@/hooks/use-items'
import { useCalendarEvents } from '@/hooks/use-calendar-events'
import { useUI } from '@/store/ui'
import { CalendarGrid } from '@/components/ui/calendar-grid'
import { DayAgenda } from '@/components/ui/day-agenda'

function CloseIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  )
}

function formatTime(dt: string, allDay: boolean) {
  if (allDay) return 'Dia todo'
  return new Date(dt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function CalendarPanel({ onClose }: { onClose: () => void }) {
  const today = new Date().toISOString().slice(0, 10)
  const [selectedDate, setSelectedDate] = useState(today)
  const { items } = useItems()
  const { events } = useCalendarEvents(`${selectedDate}T00:00:00Z`, `${selectedDate}T23:59:59Z`)
  const activeItems = (items || []).filter((i) => i && i.status !== 'archived')
  const dayEvents = events
    .filter((event) => event.start.slice(0, 10) === selectedDate)
    .sort((a, b) => a.start.localeCompare(b.start))

  return (
    <>
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-ui-border px-4">
        <div>
          <h2 className="text-[14px] font-bold text-navy-900">Calendario</h2>
          <p className="font-mono text-[10px] text-navy-300">Shift+C</p>
        </div>
        <button
          onClick={onClose}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-navy-300 transition-colors hover:bg-surface-soft hover:text-navy-700"
          title="Fechar calendario"
        >
          <CloseIcon />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <CalendarGrid
          items={activeItems}
          selectedDate={selectedDate}
          onDayClick={setSelectedDate}
          compact
        />

        <section className="mt-5">
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
                <div key={event.id} className="rounded-lg border border-ui-border bg-white px-3 py-2 shadow-cool-sm">
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
    </>
  )
}

export function CalendarSidebar() {
  const ui = useUI()
  const calendarOpen = ui?.calendarOpen
  const setCalendarOpen = ui?.setCalendarOpen

  if (!calendarOpen) return null

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-navy-900/40 lg:hidden"
        onClick={() => setCalendarOpen?.(false)}
      />

      <aside className="fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-ui-border bg-white shadow-cool-lg sm:w-[360px] lg:static lg:z-auto lg:w-[320px] lg:shrink-0 lg:shadow-none">
        <CalendarPanel onClose={() => setCalendarOpen?.(false)} />
      </aside>
    </>
  )
}
