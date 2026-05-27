'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { Item } from '@doit/types'
import { ItemRow } from './item-row'
import { DONE_FEEDBACK_MS } from './completion-feedback'
import { useUI } from '@/store/ui'

type Props = {
  items: Item[]
  isLoading?: boolean
  emptyMessage?: string
  emptySlot?: React.ReactNode
  hideDoneAfterDelay?: boolean
  variant?: 'plain' | 'glass'
}

export function ItemList({
  items,
  isLoading,
  emptyMessage = 'Nenhum item.',
  emptySlot,
  hideDoneAfterDelay = true,
  variant = 'plain',
}: Props) {
  const { selectedItemId, selectedItemIds } = useUI()
  const [recentlyDoneIds, setRecentlyDoneIds] = useState<Record<string, number>>({})
  const previousStatuses = useRef<Record<string, Item['status']>>({})
  const visibleItems = useMemo(() => {
    if (!hideDoneAfterDelay) return items
    return items.filter((item) => {
      if (item.status !== 'done') return true
      if (recentlyDoneIds[item.id]) return true

      const previous = previousStatuses.current[item.id]
      return Boolean(previous && previous !== 'done')
    })
  }, [hideDoneAfterDelay, items, recentlyDoneIds])
  const visibleItemIds = useMemo(() => visibleItems.map((item) => item.id), [visibleItems])

  useEffect(() => {
    if (!hideDoneAfterDelay) {
      previousStatuses.current = Object.fromEntries(items.map((item) => [item.id, item.status]))
      return
    }

    const now = Date.now()
    const transitions = items.filter((item) => {
      const previous = previousStatuses.current[item.id]
      return previous && previous !== 'done' && item.status === 'done'
    })

    previousStatuses.current = Object.fromEntries(items.map((item) => [item.id, item.status]))
    if (transitions.length === 0) return

    setRecentlyDoneIds((current) => {
      const next = { ...current }
      for (const item of transitions) next[item.id] = now
      return next
    })
  }, [hideDoneAfterDelay, items])

  useEffect(() => {
    const timers = Object.entries(recentlyDoneIds).map(([id, startedAt]) => {
      const delay = Math.max(0, DONE_FEEDBACK_MS - (Date.now() - startedAt))
      return setTimeout(() => {
        setRecentlyDoneIds((current) => {
          const next = { ...current }
          delete next[id]
          return next
        })
      }, delay)
    })
    return () => timers.forEach(clearTimeout)
  }, [recentlyDoneIds])

  if (isLoading) {
    return (
      <div className={variant === 'glass' ? 'space-y-2' : 'space-y-px'}>
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className={
              variant === 'glass'
                ? 'flex items-center gap-3 rounded-[20px] border border-white/45 bg-white/42 px-3 py-3'
                : 'flex items-center gap-3 border-b border-ui-border-soft px-1 py-3'
            }
          >
            <div className="h-[18px] w-[18px] shrink-0 animate-pulse rounded-md bg-navy-100/80" />
            <div className="flex-1 space-y-1.5">
              <div
                className="h-3.5 animate-pulse rounded bg-navy-100/80"
                style={{ width: `${60 + (i * 17) % 35}%` }}
              />
              <div className="h-2.5 w-16 animate-pulse rounded bg-navy-50/80" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (visibleItems.length === 0) {
    if (emptySlot) return <>{emptySlot}</>
    return (
      <div className="rounded-[22px] border border-dashed border-white/60 bg-white/34 px-4 py-8 text-center font-mono text-sm text-navy-400">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className={variant === 'glass' ? 'space-y-2' : 'pt-1'}>
      {visibleItems.map((item, index) => (
        <ItemRow
          key={item.id}
          item={item}
          active={item.id === selectedItemId}
          selected={selectedItemIds.includes(item.id)}
          orderedIds={visibleItemIds}
          index={index}
          variant={variant}
        />
      ))}
    </div>
  )
}
