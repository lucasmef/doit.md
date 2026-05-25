'use client'

import { useMemo, useRef, useState } from 'react'
import type { Item } from '@doit/types'
import { reorderItems } from '@/hooks/use-items'
import { useToast } from '@/components/ui/toast'

type Props = {
  items: Item[]
  emptyMessage?: string
}

type DragState = {
  itemId: string
  pointerId: number | null
  startX: number
  startY: number
  overId: string | null
  activated: boolean
}

const ORDER_STEP = 1000
const ACTIVATION_THRESHOLD_PX = 4

function recomputeOrders(items: Item[]) {
  return items.map((item, index) => ({ id: item.id, order: (index + 1) * ORDER_STEP }))
}

function moveItem(items: Item[], sourceId: string, targetId: string) {
  if (sourceId === targetId) return items
  const sourceIndex = items.findIndex((item) => item.id === sourceId)
  const targetIndex = items.findIndex((item) => item.id === targetId)
  if (sourceIndex < 0 || targetIndex < 0) return items

  const reordered = [...items]
  const [moved] = reordered.splice(sourceIndex, 1)
  if (!moved) return items
  reordered.splice(targetIndex, 0, moved)
  return reordered
}

function nudgeItem(items: Item[], itemId: string, direction: -1 | 1) {
  const index = items.findIndex((item) => item.id === itemId)
  const targetIndex = index + direction
  if (index < 0 || targetIndex < 0 || targetIndex >= items.length) return items

  const reordered = [...items]
  const [moved] = reordered.splice(index, 1)
  if (!moved) return items
  reordered.splice(targetIndex, 0, moved)
  return reordered
}

function findReorderTarget(clientX: number, clientY: number) {
  const el = document.elementFromPoint(clientX, clientY)
  const row = el?.closest('[data-reorder-id]')
  return row instanceof HTMLElement ? row.dataset['reorderId'] ?? null : null
}

function DragHandleIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M5 3a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm6 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2ZM5 7a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm6 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2ZM5 11a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm6 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z" />
    </svg>
  )
}

function ArrowUpIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ArrowDownIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path d="M12 5v14M5 12l7 7 7-7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ReorderableItemList({ items, emptyMessage = 'Nenhum item.' }: Props) {
  const { toast } = useToast()
  const activeItems = useMemo(
    () => items.filter((item) => item.status !== 'archived' && item.status !== 'done'),
    [items],
  )
  const dragState = useRef<DragState | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overId, setOverId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  if (activeItems.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-ui-border-strong px-4 py-8 text-center font-mono text-sm text-navy-300">
        {emptyMessage}
      </div>
    )
  }

  async function persistOrder(reordered: Item[]) {
    if (reordered === activeItems) return
    const updates = recomputeOrders(reordered)
    const currentById = new Map(activeItems.map((item) => [item.id, item.order]))
    const changes = updates.filter(({ id, order }) => currentById.get(id) !== order)
    if (changes.length === 0) return

    setSaving(true)
    try {
      await reorderItems(changes, activeItems)
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Erro ao reordenar', 'error')
    } finally {
      setSaving(false)
    }
  }

  function cleanupDrag() {
    document.removeEventListener('pointermove', handlePointerMove)
    document.removeEventListener('pointerup', handlePointerUp)
    document.removeEventListener('pointercancel', handlePointerCancel)
    document.removeEventListener('touchmove', handleTouchMove)
    document.removeEventListener('touchend', handleTouchEnd)
    document.removeEventListener('touchcancel', handleTouchCancel)
    dragState.current = null
    setActiveId(null)
    setOverId(null)
  }

  function activateDrag(state: DragState) {
    if (state.activated) return
    state.activated = true
    setActiveId(state.itemId)
  }

  function handlePointerMove(event: PointerEvent) {
    const state = dragState.current
    if (!state || state.pointerId !== event.pointerId) return

    const dx = event.clientX - state.startX
    const dy = event.clientY - state.startY
    if (!state.activated) {
      if (Math.hypot(dx, dy) < ACTIVATION_THRESHOLD_PX) return
      activateDrag(state)
    }

    event.preventDefault()
    const targetId = findReorderTarget(event.clientX, event.clientY)
    state.overId = targetId
    setOverId(targetId)
  }

  function handlePointerUp(event: PointerEvent) {
    const state = dragState.current
    if (!state || state.pointerId !== event.pointerId) return

    const targetId = state.overId
    cleanupDrag()
    if (!state.activated || !targetId || targetId === state.itemId) return
    void persistOrder(moveItem(activeItems, state.itemId, targetId))
  }

  function handlePointerCancel(event: PointerEvent) {
    const state = dragState.current
    if (!state || state.pointerId !== event.pointerId) return
    cleanupDrag()
  }

  function startDrag(itemId: string, event: React.PointerEvent<HTMLButtonElement>) {
    if (saving || dragState.current || event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    dragState.current = {
      itemId,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      overId: itemId,
      activated: false,
    }
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
    } catch {
      // Some browsers do not allow pointer capture for synthetic touch streams.
    }
    document.addEventListener('pointermove', handlePointerMove, { passive: false })
    document.addEventListener('pointerup', handlePointerUp)
    document.addEventListener('pointercancel', handlePointerCancel)
  }

  function handleTouchMove(event: TouchEvent) {
    const state = dragState.current
    const touch = event.touches[0]
    if (!state || !touch) return

    const dx = touch.clientX - state.startX
    const dy = touch.clientY - state.startY
    if (!state.activated) {
      if (Math.hypot(dx, dy) < ACTIVATION_THRESHOLD_PX) return
      activateDrag(state)
    }

    event.preventDefault()
    const targetId = findReorderTarget(touch.clientX, touch.clientY)
    state.overId = targetId
    setOverId(targetId)
  }

  function handleTouchEnd() {
    const state = dragState.current
    if (!state) return

    const targetId = state.overId
    cleanupDrag()
    if (!state.activated || !targetId || targetId === state.itemId) return
    void persistOrder(moveItem(activeItems, state.itemId, targetId))
  }

  function handleTouchCancel() {
    const state = dragState.current
    if (!state) return
    cleanupDrag()
  }

  function startTouchDrag(itemId: string, event: React.TouchEvent<HTMLButtonElement>) {
    const touch = event.touches[0]
    if (saving || dragState.current || !touch) return
    event.preventDefault()
    event.stopPropagation()
    dragState.current = {
      itemId,
      pointerId: null,
      startX: touch.clientX,
      startY: touch.clientY,
      overId: itemId,
      activated: false,
    }
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd)
    document.addEventListener('touchcancel', handleTouchCancel)
  }

  function handleNudge(itemId: string, direction: -1 | 1) {
    if (saving) return
    void persistOrder(nudgeItem(activeItems, itemId, direction))
  }

  return (
    <div className={`pt-1 ${saving ? 'opacity-70' : ''}`}>
      {activeItems.map((item, index) => {
        const dragging = activeId === item.id
        const showDropLine = !!activeId && activeId !== item.id && overId === item.id
        return (
          <div
            key={item.id}
            data-reorder-id={item.id}
            className={`relative flex items-center gap-2 border-b border-ui-border-soft px-1 py-2.5 transition-colors ${
              dragging ? 'rounded-lg bg-white opacity-80 shadow-cool-md' : ''
            }`}
          >
            {showDropLine && (
              <span className="pointer-events-none absolute inset-x-1 -top-px h-0.5 rounded-full bg-brand-500" />
            )}
            <button
              type="button"
              title="Arrastar"
              aria-label={`Arrastar ${item.title}`}
              disabled={saving}
              onPointerDown={(event) => startDrag(item.id, event)}
              onTouchStart={(event) => startTouchDrag(item.id, event)}
              className="flex h-10 w-10 shrink-0 touch-none items-center justify-center rounded-[10px] text-navy-300 transition-colors hover:bg-surface-soft hover:text-navy-600 active:cursor-grabbing disabled:opacity-50"
            >
              <DragHandleIcon />
            </button>
            <div className="flex min-w-0 flex-1 flex-col justify-center">
              <p className="truncate text-[14px] leading-5 text-navy-900">{item.title}</p>
              {(item.dueDate || item.tags.length > 0) && (
                <p className="truncate font-mono text-[11px] text-navy-300">
                  {[
                    item.dueDate ?? '',
                    item.tags.slice(0, 3).map((tag) => `#${tag}`).join(' '),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1 sm:hidden">
              <button
                type="button"
                onClick={() => handleNudge(item.id, -1)}
                disabled={saving || index === 0}
                title="Mover para cima"
                aria-label={`Mover ${item.title} para cima`}
                className="inline-flex h-10 w-10 items-center justify-center rounded-[9px] border border-ui-border-soft bg-white text-navy-500 disabled:opacity-30"
              >
                <ArrowUpIcon />
              </button>
              <button
                type="button"
                onClick={() => handleNudge(item.id, 1)}
                disabled={saving || index === activeItems.length - 1}
                title="Mover para baixo"
                aria-label={`Mover ${item.title} para baixo`}
                className="inline-flex h-10 w-10 items-center justify-center rounded-[9px] border border-ui-border-soft bg-white text-navy-500 disabled:opacity-30"
              >
                <ArrowDownIcon />
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function ReorderToggle({
  enabled,
  onToggle,
}: {
  enabled: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={enabled ? 'Sair do modo reordenar' : 'Reordenar itens'}
      aria-label="Reordenar"
      aria-pressed={enabled}
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] border transition-colors sm:h-8 sm:w-8 ${
        enabled
          ? 'border-ui-border-selected bg-surface-selected text-brand-700'
          : 'border-ui-border-soft bg-white text-navy-500 hover:bg-surface-soft hover:text-navy-800'
      }`}
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
        <path d="M8 3v18M5 6l3-3 3 3M16 21V3M13 18l3 3 3-3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}
