'use client'

import { useState } from 'react'
import { useItems } from '@/hooks/use-items'
import { updateItem } from '@/hooks/use-items'
import { useCalendarEvents } from '@/hooks/use-calendar-events'
import { usePreferences } from '@/hooks/use-preferences'
import { ItemList } from '@/components/items/item-list'
import { EventSheet } from '@/components/calendar/calendar-board'
import { CardTitle, GlassCard, MetricCard } from '@/components/ui/bento'
import { isLooseInboxItem, sortTodayWithInboxBelow } from '@/lib/item-order'
import { isToday, isOverdue, toLocalDateKey } from '@doit/core'
import { useToast } from '@/components/ui/toast'
import type { CalendarEvent } from '@doit/types'

function EventCard({
  event,
  isPast,
  dayLabel,
  onClick,
}: {
  event: CalendarEvent
  isPast: boolean
  dayLabel?: string
  onClick: () => void
}) {
  function fmt(dt: string) {
    if (event.allDay) return ''
    return new Date(dt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group flex min-h-14 w-full items-center gap-3 rounded-[18px] border border-white/45 bg-white/45 px-3 py-2 text-left shadow-cool-sm transition-colors hover:bg-white/72 ${
        isPast ? 'opacity-50 grayscale' : ''
      }`}
    >
      <div className={`h-8 w-1 shrink-0 rounded-full ${isPast ? 'bg-navy-200' : 'bg-brand-500'}`} />
      <div className="w-14 shrink-0">
        <span className="font-mono text-[10px] font-semibold text-navy-500">
          {event.allDay ? 'Dia todo' : fmt(event.start)}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-navy-900">{event.title}</p>
        {dayLabel ? (
          <span className="block truncate font-mono text-[10px] font-semibold uppercase tracking-wide text-navy-400">
            {dayLabel}
          </span>
        ) : null}
        {!event.allDay && <span className="sr-only">Termina as {fmt(event.end)}</span>}
      </div>
    </button>
  )
}

export default function TodayPage() {
  const { items, isLoading } = useItems()
  const [rescheduling, setRescheduling] = useState(false)
  const [openEvent, setOpenEvent] = useState<CalendarEvent | null>(null)
  const { toast } = useToast()
  const { prefs } = usePreferences()
  const today = toLocalDateKey()
  const now = new Date()
  const tomorrowDate = new Date(now)
  tomorrowDate.setDate(now.getDate() + 1)
  const tomorrow = toLocalDateKey(tomorrowDate)
  const { events } = useCalendarEvents(today + 'T00:00:00Z', tomorrow + 'T23:59:59Z')

  const datedTodayItems = items.filter((i) => {
    if (i.status === 'archived') return false
    if (isToday(i) || isOverdue(i)) return true
    return false
  })
  const hiddenInboxItems = prefs.showInbox
    ? []
    : items.filter((i) => {
        if (i.status === 'archived') return false
        if (i.status === 'done') return false
        return isLooseInboxItem(i)
      })
  const todayItems = sortTodayWithInboxBelow(datedTodayItems, hiddenInboxItems)
  const overdueItems = datedTodayItems.filter(
    (item) =>
      item.dueDate && item.dueDate < today && item.status !== 'done' && item.status !== 'archived',
  )

  function currentTimeIsAfter(time: string) {
    const [hourText, minuteText] = time.split(':')
    const hour = Number(hourText)
    const minute = Number(minuteText)
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return false
    return now.getHours() * 60 + now.getMinutes() >= hour * 60 + minute
  }

  function shouldHidePastEvent(end: string, allDay: boolean) {
    if (allDay) return false
    const endTime = new Date(end).getTime()
    if (Number.isNaN(endTime)) return false
    const graceMs = prefs.todayCalendarHidePastAfterHours * 60 * 60 * 1000
    return now.getTime() - endTime >= graceMs
  }

  const showTomorrowEvents = currentTimeIsAfter(prefs.todayCalendarShowTomorrowAfterTime)

  const todayEvents = events
    .filter((e) => {
      const d = e.start.slice(0, 10)
      if (d !== today && !(showTomorrowEvents && d === tomorrow)) return false
      return !shouldHidePastEvent(e.end, e.allDay)
    })
    .sort((a, b) => a.start.localeCompare(b.start))

  async function handleRescheduleOverdue() {
    if (overdueItems.length === 0) return
    setRescheduling(true)
    try {
      const snapshot = overdueItems.map((item) => ({ id: item.id, dueDate: item.dueDate }))
      await Promise.all(overdueItems.map((item) => updateItem(item.id, { dueDate: today })))
      toast(`${overdueItems.length} tarefa(s) reagendada(s) para hoje.`, 'success', {
        label: 'Desfazer',
        onClick: () => {
          void Promise.all(
            snapshot.map((item) => updateItem(item.id, { dueDate: item.dueDate })),
          ).then(
            () => toast('Reagendamento desfeito.', 'success'),
            () => toast('Erro ao desfazer reagendamento.', 'error'),
          )
        },
      })
    } catch {
      toast('Erro ao reagendar tarefas.', 'error')
    } finally {
      setRescheduling(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-28 pt-4 sm:px-6 lg:pb-8">
      <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-brand-700">
            Foco do dia
          </p>
          <h1 className="mt-1 text-4xl font-black leading-none tracking-normal text-navy-950">
            Hoje
          </h1>
          <p className="mt-2 max-w-xl text-sm text-navy-600">
            Tarefas vencidas, itens de hoje e eventos aparecem no mesmo painel de trabalho.
          </p>
        </div>
        {overdueItems.length > 0 ? (
          <button
            type="button"
            onClick={handleRescheduleOverdue}
            disabled={rescheduling}
            className="inline-flex h-11 items-center justify-center rounded-full border border-amber-200 bg-amber-50/86 px-4 text-[13px] font-bold text-amber-800 shadow-cool-sm transition-colors hover:bg-amber-100 disabled:opacity-50"
          >
            {rescheduling ? 'Reagendando...' : `Reagendar atrasadas (${overdueItems.length})`}
          </button>
        ) : null}
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <MetricCard label="Itens" value={isLoading ? '...' : todayItems.length} detail="na lista de hoje" />
        <MetricCard label="Atrasados" value={overdueItems.length} detail="pendentes" />
        <MetricCard label="Eventos" value={todayEvents.length} detail="agenda visivel" />
      </div>

      {todayEvents.length > 0 && (
        <GlassCard className="mb-4 p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <CardTitle>Eventos / {todayEvents.length}</CardTitle>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {todayEvents.map((e) => (
              <EventCard
                key={e.id}
                event={e}
                isPast={!e.allDay && new Date(e.end).getTime() < Date.now()}
                dayLabel={e.start.slice(0, 10) === tomorrow ? 'Amanha' : undefined}
                onClick={() => setOpenEvent(e)}
              />
            ))}
          </div>
        </GlassCard>
      )}
      {openEvent ? (
        <EventSheet
          event={openEvent}
          onSaved={setOpenEvent}
          onDeleted={() => setOpenEvent(null)}
          onClose={() => setOpenEvent(null)}
        />
      ) : null}

      <GlassCard className="p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <CardTitle>Itens{isLoading ? '' : ` / ${todayItems.length}`}</CardTitle>
        </div>
        <ItemList
          items={todayItems}
          isLoading={isLoading}
          variant="glass"
          emptySlot={
            <div className="rounded-[22px] border border-dashed border-white/70 bg-white/38 px-5 py-10 text-center">
              <p className="text-[15px] font-bold text-navy-900">Nada para hoje</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-navy-600">
                Tarefas com vencimento para hoje e atrasadas aparecerao aqui.
              </p>
              <button
                type="button"
                onClick={() => window.dispatchEvent(new Event('doit:focus-search'))}
                className="mt-4 rounded-full border border-white/65 bg-white/58 px-4 py-2 text-[13px] font-bold text-navy-700 shadow-cool-sm hover:bg-white"
              >
                Buscar itens
              </button>
            </div>
          }
        />
      </GlassCard>
    </div>
  )
}
