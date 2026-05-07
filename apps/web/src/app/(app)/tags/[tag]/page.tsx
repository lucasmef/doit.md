'use client'

import { use } from 'react'
import { useItems } from '@/hooks/use-items'
import { ItemList } from '@/components/items/item-list'

export default function TagDetailPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag: encodedTag } = use(params)
  const tag = decodeURIComponent(encodedTag)
  const { items, isLoading } = useItems()
  const tagItems = items.filter((item) => item.status !== 'archived' && item.tags?.includes(tag))

  return (
    <div className="p-3 max-w-3xl mx-auto pb-24 lg:pb-4">
      <div className="flex items-baseline justify-between mb-4 border-b border-ui-border-soft pb-3">
        <h1 className="text-[26px] font-bold text-slate-900">@{tag}</h1>
        <p className="text-[13px] text-slate-500 font-medium">{tagItems.length} itens</p>
      </div>

      <ItemList items={tagItems} isLoading={isLoading} emptyMessage="Nenhum item com esta tag." />
    </div>
  )
}
