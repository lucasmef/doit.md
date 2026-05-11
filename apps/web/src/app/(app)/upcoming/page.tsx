'use client'

import { useState } from 'react'
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
  const [view, setView] = useState<'list' | 'calendar'>('list')

  const todayStr = toLocalDateKey()
  const future = items.filter(
    (i) =>
      i.status !== 'archived' &&
      i.status !== 'done' &&
      ((i.dueDate && i.dueDate > todayStr) ||
        (i.scheduledDate && i.scheduledDate > todayStr)),
  )

  const grouped = GROUP_ORDER.reduce<Record<string, Item[]>>((acc, key) => {
    acc[key] = future.filter((i) => getGroup(i) === key)
    return acc
  }, {})

  const Toolbar = (
    <div className="flex shrink-0 items-center justify-between gap-3 border-b border-ui-border bg-white px-5 py-3 lg:border-none lg:bg-transparent lg:px-0 lg:py-0">
      <div className={`min-w-0 ${view === 'list' ? 'lg:hidden' : ''}`}>
        <h1 className="truncate text-[15px] font-bold text-navy-900">Proximos</h1>
        <p className="font-mono text-[10px] text-navy-300">
          {view === 'calendar' ? 'Calendario' : 'Lista'} / {future.length}
        </p>
      </div>
      <div className="flex rounded-lg bg-surface-soft p-1">
        <button
          type="button"
          onClick={() => setView('list')}
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
          onClick={() => setView('calendar')}
          className={`rounded-md px-3 py-1.5 text-[12px] font-semibold transition-colors ${
            view === 'calendar'
              ? 'bg-white text-brand-600 shadow-cool-sm'
              : 'text-navy-500 hover:bg-white'
          }`}
        >
          Calendario
        </button>
      </div>
    </div>
  )

  if (view === 'calendar') {
    return (
      <div className="flex h-full min-h-0 w-full flex-col pb-24 lg:pb-0">
        {Toolbar}
        <CalendarBoard items={future} />
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col px-0 pb-24 pt-0 lg:px-5 lg:pb-4 lg:pt-3">
      <div className="lg:mb-3 lg:flex lg:justify-end">{Toolbar}</div>

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
