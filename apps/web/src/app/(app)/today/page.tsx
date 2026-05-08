'use client'

import { useItems } from '@/hooks/use-items'
import { useCalendarEvents } from '@/hooks/use-calendar-events'
import { ItemList } from '@/components/items/item-list'
import { isToday, isOverdue } from '@doit/core'

function EventCard({ title, start, end, allDay }: { title: string; start: string; end: string; allDay: boolean }) {
  function fmt(dt: string) {
    if (allDay) return ''
    return new Date(dt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="group flex items-center gap-3 border-b border-ui-border-soft py-2">
      <div className="h-8 w-1 shrink-0 rounded-full bg-brand-500" />
      <div className="w-14 shrink-0">
        <span className="font-mono text-[12px] font-medium text-navy-500">
          {allDay ? 'Dia todo' : fmt(start)}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="truncate text-[14px] font-medium text-navy-900">{title}</p>
        {!allDay && (
          <p className="truncate font-mono text-[11px] text-navy-300">Termina as {fmt(end)}</p>
        )}
      </div>
    </div>
  )
}

export default function TodayPage() {
  const { items, isLoading } = useItems()
  const today = new Date().toISOString().slice(0, 10)
  const { events } = useCalendarEvents(today + 'T00:00:00Z', today + 'T23:59:59Z')

  const todayLabel = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })

  const todayItems = items.filter(
    (i) => (isToday(i) || isOverdue(i)) && i.status !== 'archived',
  )

  const todayEvents = events.filter((e) => {
    const d = e.start.slice(0, 10)
    return d === today
  }).sort((a, b) => a.start.localeCompare(b.start))

  return (
    <div className="mx-auto w-full max-w-[760px] px-5 py-8 pb-24 lg:pb-8">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="mb-1 font-mono text-[12px] text-navy-300">doit.md / today</p>
          <h1 className="text-[36px] font-extrabold leading-tight tracking-normal text-navy-900">Hoje</h1>
        </div>
        <p className="font-mono text-[12px] font-medium capitalize text-navy-500">{todayLabel}</p>
      </div>

      {todayEvents.length > 0 && (
        <section className="mb-6 rounded-xl border border-ui-border bg-white p-4 shadow-cool-sm">
          <h2 className="mb-2 font-mono text-[10px] font-bold uppercase tracking-wide text-navy-300">
            Eventos / {todayEvents.length}
          </h2>
          <div className="space-y-1">
            {todayEvents.map((e) => (
              <EventCard key={e.id} title={e.title} start={e.start} end={e.end} allDay={e.allDay} />
            ))}
          </div>
        </section>
      )}

      <section className="mb-4">
        <h2 className="mb-2 font-mono text-[10px] font-bold uppercase tracking-wide text-navy-300">
          Itens / {todayItems.length}
        </h2>
        <ItemList items={todayItems} isLoading={isLoading} emptyMessage="Nenhum item para hoje." />
      </section>
    </div>
  )
}
