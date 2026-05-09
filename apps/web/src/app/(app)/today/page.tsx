'use client'

import { useState } from 'react'
import { useItems } from '@/hooks/use-items'
import { updateItem } from '@/hooks/use-items'
import { useCalendarEvents } from '@/hooks/use-calendar-events'
import { ItemList } from '@/components/items/item-list'
import { isToday, isOverdue, toLocalDateKey } from '@doit/core'
import { useToast } from '@/components/ui/toast'

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
  const [rescheduling, setRescheduling] = useState(false)
  const { toast } = useToast()
  const today = toLocalDateKey()
  const { events } = useCalendarEvents(today + 'T00:00:00Z', today + 'T23:59:59Z')

  const todayItems = items.filter(
    (i) => (isToday(i) || isOverdue(i)) && i.status !== 'archived',
  )
  const overdueItems = todayItems.filter(
    (item) => item.dueDate && item.dueDate < today && item.status !== 'done' && item.status !== 'archived',
  )

  const todayEvents = events.filter((e) => {
    const d = e.start.slice(0, 10)
    return d === today
  }).sort((a, b) => a.start.localeCompare(b.start))

  async function handleRescheduleOverdue() {
    if (overdueItems.length === 0) return
    setRescheduling(true)
    try {
      await Promise.all(overdueItems.map((item) => updateItem(item.id, { dueDate: today })))
      toast(`${overdueItems.length} tarefa(s) reagendada(s) para hoje.`, 'success')
    } catch {
      toast('Erro ao reagendar tarefas.', 'error')
    } finally {
      setRescheduling(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-[760px] px-5 pb-24 pt-3 lg:pb-4">
      {todayEvents.length > 0 && (
        <section className="mb-4 rounded-xl border border-ui-border bg-white p-4 shadow-cool-sm">
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
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="font-mono text-[10px] font-bold uppercase tracking-wide text-navy-300">
            Itens / {todayItems.length}
          </h2>
          {overdueItems.length > 0 && (
            <button
              type="button"
              onClick={handleRescheduleOverdue}
              disabled={rescheduling}
              className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-[12px] font-semibold text-amber-700 transition-colors hover:bg-amber-100 disabled:opacity-50"
            >
              {rescheduling ? 'Reagendando...' : `Reagendar atrasadas (${overdueItems.length})`}
            </button>
          )}
        </div>
        <ItemList items={todayItems} isLoading={isLoading} emptyMessage="Nenhum item para hoje." />
      </section>
    </div>
  )
}
