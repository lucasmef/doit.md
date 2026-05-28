'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useItems } from '@/hooks/use-items'
import { usePreferences } from '@/hooks/use-preferences'
import { ItemList } from '@/components/items/item-list'
import { CardTitle, GlassCard, MetricCard } from '@/components/ui/bento'
import { isLooseInboxItem, sortForcedItemOrder } from '@/lib/item-order'
import { EmptyInbox } from '@/components/ui/empty-inbox'

export default function InboxPage() {
  const router = useRouter()
  const { prefs } = usePreferences()
  const { items, isLoading } = useItems()

  useEffect(() => {
    if (!prefs.showInbox) router.replace('/itens')
  }, [prefs.showInbox, router])

  if (!prefs.showInbox) return null

  const inboxItems = sortForcedItemOrder(
    items.filter((item) => {
      if (item.status === 'archived') return false
      if (item.status === 'done') return false
      return isLooseInboxItem(item)
    }),
  )
  const noteCount = inboxItems.filter((item) => item.complexity === 'note').length
  const captureCount = inboxItems.filter((item) => item.complexity === 'capture').length

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-28 pt-4 sm:px-6 lg:pb-8">
      <div className="mb-5">
        <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-brand-700">
          Entrada rapida
        </p>
        <h1 className="mt-1 text-4xl font-black leading-none tracking-normal text-navy-950">
          Inbox
        </h1>
        <p className="mt-2 max-w-xl text-sm text-navy-600">
          Capturas soltas, notas novas e itens ainda sem pasta visual ficam aqui ate serem tratados.
        </p>
      </div>

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <MetricCard label="Capturas" value={isLoading ? '...' : inboxItems.length} detail="pendentes" />
        <MetricCard label="Notas" value={noteCount} detail="sem organizacao" />
        <MetricCard label="Rapidas" value={captureCount} detail="capturas brutas" />
      </div>

      <GlassCard className="p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <CardTitle>Itens soltos{isLoading ? '' : ` / ${inboxItems.length}`}</CardTitle>
        </div>
        <ItemList
          items={inboxItems}
          isLoading={isLoading}
          emptyMessage=""
          emptySlot={<EmptyInbox />}
          variant="glass"
        />
      </GlassCard>
    </div>
  )
}
