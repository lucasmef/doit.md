'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useItems } from '@/hooks/use-items'
import { ItemList } from '@/components/items/item-list'
import { CalendarBoard } from '@/components/calendar/calendar-board'
import { CardTitle, GlassCard, MetricCard } from '@/components/ui/bento'
import type { Item } from '@doit/types'
import { toLocalDateKey } from '@doit/core'

function getGroup(item: Item): string {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  const endOfWeek = new Date(today)
  endOfWeek.setDate(today.getDate() + (7 - today.getDay()))

  const endOfNextWeek = new Date(endOfWeek)
  endOfNextWeek.setDate(endOfWeek.getDate() + 7)

  const d = item.dueDate ?? item.scheduledDate
  if (!d) return ''

  if (d === toLocalDateKey(tomorrow)) return 'Amanha'
  if (d <= toLocalDateKey(endOfWeek)) return 'Esta semana'
  if (d <= toLocalDateKey(endOfNextWeek)) return 'Proxima semana'
  return 'Mais tarde'
}

const GROUP_ORDER = ['Amanha', 'Esta semana', 'Proxima semana', 'Mais tarde']

export default function UpcomingPage() {
  const { items, isLoading } = useItems()
  const router = useRouter()
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const touchStartRef = useRef<{ x: number; y: number } | null>(null)

  const todayStr = toLocalDateKey()
  const future = items.filter(
    (i) =>
      i.status !== 'archived' &&
      i.status !== 'done' &&
      ((i.dueDate && i.dueDate > todayStr) || (i.scheduledDate && i.scheduledDate > todayStr)),
  )

  const grouped = GROUP_ORDER.reduce<Record<string, Item[]>>((acc, key) => {
    acc[key] = future.filter((i) => getGroup(i) === key)
    return acc
  }, {})

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    setView(params.get('view') === 'calendar' ? 'calendar' : 'list')
    const openCalendar = () => setView('calendar')
    window.addEventListener('doit:open-calendar-view', openCalendar)
    return () => window.removeEventListener('doit:open-calendar-view', openCalendar)
  }, [])

  function setViewMode(nextView: 'list' | 'calendar') {
    setView(nextView)
    router.replace(nextView === 'calendar' ? '/upcoming?view=calendar' : '/upcoming')
  }

  const ViewSwitch = (
    <div className="fixed bottom-20 right-4 z-40 rounded-full border border-white/55 bg-white/58 p-1 shadow-cool-lg backdrop-blur-2xl lg:bottom-5">
      <div className="flex rounded-full bg-white/32 p-1">
        <button
          type="button"
          onClick={() => setViewMode('list')}
          className={`rounded-full px-4 py-2 text-[12px] font-bold transition-colors ${
            view === 'list'
              ? 'bg-white text-brand-700 shadow-cool-sm'
              : 'text-navy-600 hover:bg-white/70'
          }`}
        >
          Lista
        </button>
        <button
          type="button"
          onClick={() => setViewMode('calendar')}
          className={`rounded-full px-4 py-2 text-[12px] font-bold transition-colors ${
            view === 'calendar'
              ? 'bg-white text-brand-700 shadow-cool-sm'
              : 'text-navy-600 hover:bg-white/70'
          }`}
        >
          Calendario
        </button>
      </div>
    </div>
  )

  function handleListTouchEnd(event: React.TouchEvent<HTMLDivElement>) {
    const start = touchStartRef.current
    const touch = event.changedTouches[0]
    touchStartRef.current = null
    if (!start || !touch) return

    const deltaX = touch.clientX - start.x
    const deltaY = touch.clientY - start.y
    if (deltaX < -60 && Math.abs(deltaY) < 50) {
      setViewMode('calendar')
    }
  }

  if (view === 'calendar') {
    return (
      <div className="flex h-full min-h-0 w-full flex-col">
        {ViewSwitch}
        <CalendarBoard items={future} />
      </div>
    )
  }

  return (
    <div
      className="mx-auto flex min-h-full w-full max-w-6xl flex-col px-4 pb-28 pt-4 sm:px-6 lg:pb-8"
      onTouchStart={(event) => {
        const touch = event.touches[0]
        if (touch) touchStartRef.current = { x: touch.clientX, y: touch.clientY }
      }}
      onTouchEnd={handleListTouchEnd}
    >
      {ViewSwitch}

      <div className="mb-5">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-brand-700">
          Linha do tempo
        </p>
        <h1 className="mt-1 text-4xl font-black leading-none tracking-normal text-navy-950">
          Proximos
        </h1>
        <p className="mt-2 max-w-xl text-sm text-navy-600">
          Itens com data futura agrupados por janela, com calendario a um toque.
        </p>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <MetricCard label="Futuros" value={isLoading ? '...' : future.length} detail="itens ativos" />
        <MetricCard label="Amanha" value={grouped.Amanha?.length ?? 0} detail="proxima janela" />
        <MetricCard label="Semana" value={grouped['Esta semana']?.length ?? 0} detail="ainda esta semana" />
      </div>

      {isLoading ? (
        <GlassCard className="p-4">
          <ItemList items={[]} isLoading variant="glass" />
        </GlassCard>
      ) : null}

      {!isLoading &&
        GROUP_ORDER.map((group) => {
          const groupItems = grouped[group] ?? []
          if (groupItems.length === 0) return null
          return (
            <GlassCard key={group} className="mb-4 p-4">
              <div className="mb-3">
                <CardTitle>
                  {group} / {groupItems.length}
                </CardTitle>
              </div>
              <ItemList items={groupItems} variant="glass" />
            </GlassCard>
          )
        })}

      {!isLoading && future.length === 0 && (
        <GlassCard className="p-4">
          <div className="rounded-[22px] border border-dashed border-white/70 bg-white/38 px-5 py-10 text-center">
            <p className="text-[15px] font-bold text-navy-900">Nenhum item futuro</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-navy-600">
              Itens com prazo ou agendamento depois de hoje aparecerao aqui.
            </p>
          </div>
        </GlassCard>
      )}
    </div>
  )
}
