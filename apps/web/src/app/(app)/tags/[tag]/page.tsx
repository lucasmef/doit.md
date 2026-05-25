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
    <div className="mx-auto max-w-3xl px-5 pb-24 pt-3 lg:pb-4">
      <ItemList items={tagItems} isLoading={isLoading} emptyMessage="Nenhum item com esta tag." />
    </div>
  )
}
