'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useItems } from '@/hooks/use-items'
import { usePreferences } from '@/hooks/use-preferences'
import { ItemList } from '@/components/items/item-list'
import { isLooseInboxItem, sortForcedItemOrder } from '@/lib/item-order'
import { EmptyInbox } from '@/components/ui/empty-inbox'

export default function InboxPage() {
  const router = useRouter()
  const { prefs } = usePreferences()
  const { items, isLoading } = useItems()

  useEffect(() => {
    if (!prefs.showInbox) router.replace('/today')
  }, [prefs.showInbox, router])

  if (!prefs.showInbox) return null

  const inboxItems = sortForcedItemOrder(items.filter((item) => {
    if (item.status === 'archived') return false
    if (item.status === 'done') return false
    return isLooseInboxItem(item)
  }))

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
