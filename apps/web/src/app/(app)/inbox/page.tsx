'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useItems } from '@/hooks/use-items'
import { usePreferences } from '@/hooks/use-preferences'
import { ItemList } from '@/components/items/item-list'
import { ReorderableItemList, ReorderToggle } from '@/components/items/reorderable-list'
import { EmptyInbox } from '@/components/ui/empty-inbox'

export default function InboxPage() {
  const router = useRouter()
  const { prefs } = usePreferences()
  const { items, isLoading } = useItems()
  const [reorderMode, setReorderMode] = useState(false)

  useEffect(() => {
    if (!prefs.showInbox) router.replace('/today')
  }, [prefs.showInbox, router])

  if (!prefs.showInbox) return null

  const inboxItems = items.filter((item) => {
    if (item.status === 'archived') return false
    if (item.status === 'done') return false
    return !item.folderId && !item.dueDate && !item.scheduledDate
  })

  return (
    <div className="mx-auto w-full max-w-[760px] px-5 pb-24 pt-3 lg:pb-4">
      {inboxItems.length > 0 && (
        <div className="mb-1 flex justify-end">
          <ReorderToggle enabled={reorderMode} onToggle={() => setReorderMode((v) => !v)} />
        </div>
      )}
      {reorderMode ? (
        <ReorderableItemList items={inboxItems} />
      ) : (
        <ItemList
          items={inboxItems}
          isLoading={isLoading}
          emptyMessage=""
          emptySlot={<EmptyInbox />}
        />
      )}
    </div>
  )
}
