'use client'

import { useItems } from '@/hooks/use-items'
import { ItemList } from '@/components/items/item-list'
import { EmptyInbox } from '@/components/ui/empty-inbox'

export default function InboxPage() {
  const { items, isLoading } = useItems()
  const inboxItems = items.filter((item) => {
    if (item.status === 'archived') return false
    if (item.status === 'inbox') return true
    if (item.complexity === 'note') return !item.projectId
    return !item.projectId && !item.dueDate && !item.scheduledDate
  })

  return (
    <div className="mx-auto w-full max-w-[760px] px-5 py-8 pb-24 lg:pb-8">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="mb-1 font-mono text-[12px] text-navy-300">doit.md / inbox</p>
          <h1 className="text-[36px] font-extrabold leading-tight tracking-normal text-navy-900">Inbox</h1>
        </div>
        <p className="font-mono text-[12px] font-medium text-navy-500">{inboxItems.length} itens</p>
      </div>
      <ItemList
        items={inboxItems}
        isLoading={isLoading}
        emptyMessage=""
        emptySlot={<EmptyInbox />}
      />
    </div>
  )
}
