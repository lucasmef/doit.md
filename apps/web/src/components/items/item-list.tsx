'use client'

import type { Item } from '@clarity/types'
import { ItemRow } from './item-row'
import { useUI } from '@/store/ui'

type Props = {
  items: Item[]
  isLoading?: boolean
  emptyMessage?: string
}

export function ItemList({ items, isLoading, emptyMessage = 'Nenhum item.' }: Props) {
  const { selectedItemId } = useUI()

  if (isLoading) {
    return (
      <div className="space-y-1">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="space-y-0.5">
      {items.map((item) => (
        <ItemRow key={item.id} item={item} active={item.id === selectedItemId} />
      ))}
    </div>
  )
}
