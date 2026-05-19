'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useItems } from '@/hooks/use-items'
import { ItemList } from '@/components/items/item-list'
import { CalendarBoard } from '@/components/calendar/calendar-board'
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
    <div className="fixed bottom-20 right-4 z-40 rounded-xl border border-ui-border bg-white p-1 shadow-cool-lg lg:bottom-5">
      <div className="flex rounded-lg bg-surface-soft p-1">
        <button
          type="button"
          onClick={() => setViewMode('list')}
          className={`rounded-md px-3 py-1.5 text-[12px] font-semibold transition-colors ${
            view === 'list'
              ? 'bg-white text-brand-600 shadow-cool-sm'
              : 'text-navy-500 hover:bg-white'
          }`}
        >
          Lista
        </button>
        <button
          type="button"
          onClick={() => setViewMode('calendar')}
          className={`rounded-md px-3 py-1.5 text-[12px] font-semibold transition-colors ${
            view === 'calendar'
              ? 'bg-white text-brand-600 shadow-cool-sm'
              : 'text-navy-500 hover:bg-white'
          }`}
        >
          Calendário
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
      className="mx-auto flex min-h-full w-full max-w-[760px] flex-col px-0 pb-24 pt-0 lg:px-5 lg:pb-4 lg:pt-3"
      onTouchStart={(event) => {
        const touch = event.touches[0]
        if (touch) touchStartRef.current = { x: touch.clientX, y: touch.clientY }
      }}
      onTouchEnd={handleListTouchEnd}
    >
      {ViewSwitch}

      <div className="px-5 lg:px-0">
        {isLoading && (
          <div className="space-y-1">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-navy-50" />
            ))}
          </div>
        )}

        {!isLoading &&
          GROUP_ORDER.map((group) => {
            const groupItems = grouped[group] ?? []
            if (groupItems.length === 0) return null
            return (
              <section key={group} className="mb-4">
                <h2 className="mb-2 font-mono text-[10px] font-bold uppercase tracking-wide text-navy-300">
                  {group} / {groupItems.length}
                </h2>
                <ItemList items={groupItems} />
              </section>
            )
          })}

        {!isLoading && future.length === 0 && (
          <div className="rounded-lg border border-dashed border-ui-border-strong px-4 py-8 text-center font-mono text-sm text-navy-300">
            Nenhum item futuro.
          </div>
        )}
      </div>
    </div>
  )
}
