'use client'

import type { CalendarEvent, Item } from '@doit/types'
import { toLocalDateKey } from '@doit/core'
import { CalendarBoard } from '@/components/calendar/calendar-board'
import { useCalendarEvents } from '@/hooks/use-calendar-events'
import { useItems } from '@/hooks/use-items'
import { useUI } from '@/store/ui'

function timeLabel(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function todayRange() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setHours(23, 59, 59, 999)
  return { from: start.toISOString(), to: end.toISOString(), key: toLocalDateKey(start) }
}

function activeTodayItems(items: Item[], todayKey: string) {
  return items
    .filter((item) => item.status !== 'archived' && item.status !== 'done')
    .filter((item) => item.dueDate === todayKey || item.scheduledDate === todayKey)
    .slice(0, 5)
}

function nextItems(items: Item[], todayKey: string) {
  return items
    .filter((item) => item.status !== 'archived' && item.status !== 'done')
    .filter((item) => item.dueDate && item.dueDate > todayKey)
    .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))
    .slice(0, 5)
}

function TodayAgenda({
  items,
  events,
  onItemClick,
}: {
  items: Item[]
  events: CalendarEvent[]
  onItemClick: (id: string) => void
}) {
  const hasContent = items.length > 0 || events.length > 0

  return (
    <div className="space-y-2">
      {events.slice(0, 4).map((event) => (
        <div
          key={event.id}
          className="rounded-[16px] border border-white/60 bg-white/52 px-3 py-2 shadow-sm"
        >
          <div className="flex items-center justify-between gap-3">
            <p className="min-w-0 truncate text-[13px] font-semibold text-navy-800">{event.title}</p>
            <span className="shrink-0 font-mono text-[10px] font-semibold uppercase tracking-wide text-teal-700">
              {event.allDay ? 'Dia todo' : timeLabel(event.start)}
            </span>
          </div>
          {event.googleCalendarId ? (
            <p className="mt-0.5 truncate text-[11px] text-slate-500">
              Google Calendar
            </p>
          ) : null}
        </div>
      ))}

      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onItemClick(item.id)}
          className="block w-full rounded-[16px] border border-white/60 bg-white/52 px-3 py-2 text-left shadow-sm transition-colors hover:bg-white/80"
        >
          <p className="truncate text-[13px] font-semibold text-navy-800">{item.title}</p>
          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wide text-slate-400">
            {item.complexity === 'note' ? 'Nota' : 'Item'}
          </p>
        </button>
      ))}

      {!hasContent ? (
        <div className="rounded-[16px] border border-white/60 bg-white/46 px-3 py-4 text-center text-[12px] text-slate-500">
          Sem itens ou eventos para hoje.
        </div>
      ) : null}
    </div>
  )
}

function MiniMetric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[18px] border border-white/60 bg-white/52 p-3 shadow-sm">
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-2xl font-black tracking-tight text-navy-900">{value}</p>
    </div>
  )
}

export default function CalendarPage() {
  const { from, to, key: todayKey } = todayRange()
  const { items } = useItems()
  const { events } = useCalendarEvents(from, to)
  const { setSelectedItemId, openCalendarEventCapture } = useUI()
  const todayItems = activeTodayItems(items, todayKey)
  const upcomingItems = nextItems(items, todayKey)
  const activeItems = items.filter((item) => item.status !== 'archived' && item.status !== 'done')
  const doneToday = items.filter((item) => item.status === 'done' && item.updatedAt?.startsWith(todayKey)).length

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 bg-transparent p-3 lg:p-4">
      <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-brand-700">
            Calendar.md
          </p>
          <h1 className="mt-1 text-3xl font-black tracking-tight text-navy-900 sm:text-4xl">
            Calendario
          </h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => openCalendarEventCapture(todayKey)}
            className="inline-flex h-10 items-center rounded-full bg-navy-900 px-4 text-[13px] font-semibold text-white shadow-cool-md transition-colors hover:bg-navy-800"
          >
            Novo evento
          </button>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event('doit:open-calendar-filters'))}
            className="inline-flex h-10 items-center rounded-full border border-white/65 bg-white/56 px-4 text-[13px] font-semibold text-navy-700 shadow-cool-sm backdrop-blur transition-colors hover:bg-white/80"
          >
            Filtros
          </button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-12 lg:grid-rows-[150px_minmax(0,1fr)]">
        <section className="min-h-[620px] overflow-hidden rounded-[28px] border border-white/55 bg-white/40 shadow-[0_24px_60px_rgba(15,35,66,.12)] backdrop-blur-xl lg:col-span-8 lg:row-span-2 lg:min-h-0">
          <CalendarBoard items={items} fullscreen />
        </section>

        <section className="grid gap-3 lg:col-span-4 lg:grid-cols-2">
          <MiniMetric label="Hoje" value={todayItems.length + events.length} />
          <MiniMetric label="Feitos" value={doneToday} />
        </section>

        <aside className="min-h-0 space-y-4 overflow-y-auto lg:col-span-4">
          <section className="rounded-[28px] border border-white/60 bg-white/64 p-4 shadow-cool-sm backdrop-blur-xl">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Agenda
                </p>
                <h2 className="text-[15px] font-bold text-navy-900">Hoje</h2>
              </div>
              <span className="rounded-full bg-teal-50 px-2.5 py-1 font-mono text-[10px] font-bold text-teal-700">
                {events.length} eventos
              </span>
            </div>
            <TodayAgenda items={todayItems} events={events} onItemClick={setSelectedItemId} />
          </section>

          <section className="rounded-[28px] border border-white/60 bg-navy-900/86 p-4 text-white shadow-cool-md backdrop-blur-xl">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-white/45">
                  Proximos
                </p>
                <h2 className="text-[15px] font-bold">Carga da semana</h2>
              </div>
              <span className="rounded-full bg-white/12 px-2.5 py-1 font-mono text-[10px] font-bold text-white/80">
                {activeItems.length} ativos
              </span>
            </div>
            <div className="space-y-2">
              {upcomingItems.length > 0 ? (
                upcomingItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedItemId(item.id)}
                    className="block w-full rounded-[16px] border border-white/10 bg-white/8 px-3 py-2 text-left transition-colors hover:bg-white/14"
                  >
                    <p className="truncate text-[13px] font-semibold">{item.title}</p>
                    <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wide text-white/45">
                      {item.dueDate}
                    </p>
                  </button>
                ))
              ) : (
                <p className="rounded-[16px] border border-white/10 bg-white/8 px-3 py-4 text-center text-[12px] text-white/55">
                  Nada futuro com data.
                </p>
              )}
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
