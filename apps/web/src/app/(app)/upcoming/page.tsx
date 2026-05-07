'use client'

import { useItems } from '@/hooks/use-items'
import { ItemList } from '@/components/items/item-list'
import type { Item } from '@doit/types'

function getGroup(item: Item): string {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + 1)

  const endOfWeek = new Date(today)
  endOfWeek.setDate(today.getDate() + (7 - today.getDay()))

  const endOfNextWeek = new Date(endOfWeek)
  endOfNextWeek.setDate(endOfWeek.getDate() + 7)

  const d = item.dueDate ?? item.scheduledDate
  if (!d) return 'Sem data'

  if (d === tomorrow.toISOString().slice(0, 10)) return 'Amanha'
  if (d <= endOfWeek.toISOString().slice(0, 10)) return 'Esta semana'
  if (d <= endOfNextWeek.toISOString().slice(0, 10)) return 'Proxima semana'
  return 'Mais tarde'
}

const GROUP_ORDER = ['Amanha', 'Esta semana', 'Proxima semana', 'Mais tarde', 'Sem data']

export default function UpcomingPage() {
  const { items, isLoading } = useItems()

  const todayStr = new Date().toISOString().slice(0, 10)
  const future = items.filter(
    (i) =>
      i.status !== 'archived' &&
      i.status !== 'done' &&
      ((i.dueDate && i.dueDate > todayStr) ||
        (i.scheduledDate && i.scheduledDate > todayStr) ||
        (!i.dueDate && !i.scheduledDate)),
  )

  const grouped = GROUP_ORDER.reduce<Record<string, Item[]>>((acc, key) => {
    acc[key] = future.filter((i) => getGroup(i) === key)
    return acc
  }, {})

  return (
    <div className="p-3 max-w-3xl mx-auto pb-24 lg:pb-4">
      <div className="flex items-baseline justify-between mb-4 border-b border-ui-border-soft pb-3">
        <h1 className="text-[26px] font-bold text-slate-900">Proximos</h1>
      </div>

      {isLoading && (
        <div className="space-y-1">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading &&
        GROUP_ORDER.map((group) => {
          const groupItems = grouped[group] ?? []
          if (groupItems.length === 0) return null
          return (
            <section key={group} className="mb-4">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                {group} - {groupItems.length}
              </h2>
              <ItemList items={groupItems} />
            </section>
          )
        })}

      {!isLoading && future.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">
          Nenhum item futuro.
        </div>
      )}
    </div>
  )
}
