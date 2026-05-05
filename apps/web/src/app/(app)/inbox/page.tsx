'use client'

import { useItems } from '@/hooks/use-items'
import { ItemList } from '@/components/items/item-list'
import { EmptyInbox } from '@/components/ui/empty-inbox'

export default function InboxPage() {
  const { items, isLoading } = useItems({ status: 'inbox' })

  return (
    <div className="p-6 max-w-3xl mx-auto pb-24 lg:pb-6">
      <div className="flex items-baseline justify-between mb-8 border-b border-ui-border-soft pb-4">
        <h1 className="text-[28px] font-bold text-slate-900">Inbox</h1>
        <p className="text-[14px] text-slate-500 font-medium capitalize">{items.length} itens</p>
      </div>
      <ItemList
        items={items}
        isLoading={isLoading}
        emptyMessage=""
        emptySlot={<EmptyInbox />}
      />
    </div>
  )
}

