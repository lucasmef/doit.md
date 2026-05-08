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
    <div className="mx-auto w-full max-w-[760px] px-5 py-8 pb-24 lg:pb-8">
      <div className="mb-6">
        <p className="mb-1 font-mono text-[12px] text-navy-300">doit.md / upcoming</p>
        <h1 className="text-[36px] font-extrabold leading-tight tracking-normal text-navy-900">Proximos</h1>
      </div>

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
            <section key={group} className="mb-6">
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
  )
}
