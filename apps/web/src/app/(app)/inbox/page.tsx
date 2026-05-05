'use client'

import { useItems } from '@/hooks/use-items'
import { ItemList } from '@/components/items/item-list'

export default function InboxPage() {
  const { items, isLoading } = useItems({ status: 'inbox' })

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Inbox</h1>
        <span className="text-sm text-slate-400">{items.length} itens</span>
      </div>
      <ItemList
        items={items}
        isLoading={isLoading}
        emptyMessage="Inbox limpo. Use ⌘K para capturar algo."
      />
    </div>
  )
}
