'use client'

import type { Item } from '@doit/types'
import { ItemRow } from './item-row'
import { useUI } from '@/store/ui'

type Props = {
  items: Item[]
  isLoading?: boolean
  emptyMessage?: string
  emptySlot?: React.ReactNode
}

export function ItemList({ items, isLoading, emptyMessage = 'Nenhum item.', emptySlot }: Props) {
  const { selectedItemId } = useUI()

  if (isLoading) {
    return (
      <div className="space-y-1">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg">
            <div className="w-4 h-4 shrink-0 rounded-full bg-slate-200 animate-pulse" />
            <div className="flex-1 space-y-1.5">
              <div
                className="h-3.5 bg-slate-200 rounded animate-pulse"
                style={{ width: `${60 + (i * 17) % 35}%` }}
              />
              <div className="h-2.5 w-16 bg-slate-100 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    if (emptySlot) return <>{emptySlot}</>
    return (
      <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="space-y-3 pt-4">
      {items.map((item, index) => (
        <ItemRow key={item.id} item={item} active={item.id === selectedItemId} index={index} />
      ))}
    </div>
  )
}
