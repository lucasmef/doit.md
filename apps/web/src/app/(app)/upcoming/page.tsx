'use client'

import { useItems } from '@/hooks/use-items'
import { ItemList } from '@/components/items/item-list'
import type { Item } from '@clarity/types'

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

  if (d === tomorrow.toISOString().slice(0, 10)) return 'Amanhã'
  if (d <= endOfWeek.toISOString().slice(0, 10)) return 'Esta semana'
  if (d <= endOfNextWeek.toISOString().slice(0, 10)) return 'Próxima semana'
  return 'Mais tarde'
}

const GROUP_ORDER = ['Amanhã', 'Esta semana', 'Próxima semana', 'Mais tarde', 'Sem data']

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
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold text-slate-900 mb-6">Próximos</h1>

      {isLoading && (
        <div className="space-y-1">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading &&
        GROUP_ORDER.map((group) => {
          const groupItems = grouped[group] ?? []
          if (groupItems.length === 0) return null
          return (
            <section key={group} className="mb-6">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                {group} · {groupItems.length}
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
