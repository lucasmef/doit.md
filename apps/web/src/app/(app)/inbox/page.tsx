'use client'

import { useItems } from '@/hooks/use-items'
import { ItemList } from '@/components/items/item-list'
import { EmptyInbox } from '@/components/ui/empty-inbox'

export default function InboxPage() {
  const { items, isLoading } = useItems()
  const inboxItems = items.filter((item) => {
    if (item.status === 'archived') return false
    if (item.status === 'inbox') return true
    if (item.complexity === 'note') return !item.folderId
    return !item.folderId && !item.dueDate && !item.scheduledDate
  })

  return (
    <div className="mx-auto w-full max-w-[760px] px-5 pb-24 pt-3 lg:pb-4">
      <ItemList
        items={inboxItems}
        isLoading={isLoading}
        emptyMessage=""
        emptySlot={<EmptyInbox />}
      />
    </div>
  )
}
