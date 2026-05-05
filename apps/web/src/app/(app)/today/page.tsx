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
    <div className="flex items-center gap-4 py-2 group">
      <div className="w-1 h-10 rounded-full bg-brand-500 shrink-0" />
      <div className="w-14 shrink-0">
        <span className="text-[14px] font-medium text-slate-600">
          {allDay ? 'Dia todo' : fmt(start)}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[16px] font-medium text-slate-900 truncate">{title}</p>
        {!allDay && (
          <p className="text-[12px] text-slate-500 truncate">Termina às {fmt(end)}</p>
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

  const tasks = todayItems.filter((i) => i.complexity === 'task' || i.complexity === 'capture')
  const notes = todayItems.filter((i) => i.complexity !== 'task' && i.complexity !== 'capture')

  // Eventos do dia ordenados por hora
  const todayEvents = events.filter((e) => {
    const d = e.start.slice(0, 10)
    return d === today
  }).sort((a, b) => a.start.localeCompare(b.start))

  return (
    <div className="p-6 max-w-3xl mx-auto pb-24 lg:pb-6">
      <div className="flex items-baseline justify-between mb-8 border-b border-ui-border-soft pb-4">
        <h1 className="text-[28px] font-bold text-slate-900">Hoje</h1>
        <p className="text-[14px] text-slate-500 font-medium capitalize">{todayLabel}</p>
      </div>

      {/* Eventos Google */}
      {todayEvents.length > 0 && (
        <section className="mb-6">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Eventos · {todayEvents.length}
          </h2>
          <div className="space-y-2">
            {todayEvents.map((e) => (
              <EventCard key={e.id} title={e.title} start={e.start} end={e.end} allDay={e.allDay} />
            ))}
          </div>
        </section>
      )}

      {/* Tarefas */}
      <section className="mb-6">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Tarefas · {tasks.length}
        </h2>
        <ItemList items={tasks} isLoading={isLoading} emptyMessage="Nenhuma tarefa para hoje." />
      </section>

      {notes.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Notas · {notes.length}
          </h2>
          <ItemList items={notes} emptyMessage="" />
        </section>
      )}
    </div>
  )
}
