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
    <div className="flex items-center gap-3 py-1.5 group">
      <div className="w-1 h-8 rounded-full bg-brand-500 shrink-0" />
      <div className="w-14 shrink-0">
        <span className="text-[13px] font-medium text-slate-600">
          {allDay ? 'Dia todo' : fmt(start)}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-medium text-slate-900 truncate">{title}</p>
        {!allDay && (
          <p className="text-[11px] text-slate-500 truncate">Termina as {fmt(end)}</p>
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
    <div className="p-3 max-w-3xl mx-auto pb-24 lg:pb-4">
      <div className="flex items-baseline justify-between mb-4 border-b border-ui-border-soft pb-3">
        <h1 className="text-[26px] font-bold text-slate-900">Hoje</h1>
        <p className="text-[13px] text-slate-500 font-medium capitalize">{todayLabel}</p>
      </div>

      {todayEvents.length > 0 && (
        <section className="mb-4">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Eventos - {todayEvents.length}
          </h2>
          <div className="space-y-1">
            {todayEvents.map((e) => (
              <EventCard key={e.id} title={e.title} start={e.start} end={e.end} allDay={e.allDay} />
            ))}
          </div>
        </section>
      )}

      <section className="mb-4">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Itens - {todayItems.length}
        </h2>
        <ItemList items={todayItems} isLoading={isLoading} emptyMessage="Nenhum item para hoje." />
      </section>
    </div>
  )
}
