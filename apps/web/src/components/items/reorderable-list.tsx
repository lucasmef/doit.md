'use client'

import { useState } from 'react'
import type { Item } from '@doit/types'
import { bulkUpdateItems } from '@/hooks/use-items'
import { useToast } from '@/components/ui/toast'

type Props = {
  items: Item[]
  emptyMessage?: string
}

const DRAG_MIME = 'application/x-doit-item-id'
const ORDER_STEP = 1000

function recomputeOrders(items: Item[]) {
  return items.map((item, index) => ({ id: item.id, order: (index + 1) * ORDER_STEP }))
}

export function ReorderableItemList({ items, emptyMessage = 'Nenhum item.' }: Props) {
  const { toast } = useToast()
  const [dragId, setDragId] = useState<string | null>(null)
  const [hoverId, setHoverId] = useState<string | null>(null)
  const [hoverBefore, setHoverBefore] = useState(true)
  const [saving, setSaving] = useState(false)

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-ui-border-strong px-4 py-8 text-center font-mono text-sm text-navy-300">
        {emptyMessage}
      </div>
    )
  }

  async function handleDrop(targetId: string, before: boolean) {
    const sourceId = dragId
    setDragId(null)
    setHoverId(null)
    if (!sourceId || sourceId === targetId) return

    const sourceIndex = items.findIndex((item) => item.id === sourceId)
    const targetIndex = items.findIndex((item) => item.id === targetId)
    if (sourceIndex < 0 || targetIndex < 0) return

    const reordered = [...items]
    const [moved] = reordered.splice(sourceIndex, 1)
    if (!moved) return
    let insertAt = targetIndex
    if (sourceIndex < targetIndex) insertAt -= 1
    if (!before) insertAt += 1
    reordered.splice(insertAt, 0, moved)

    const updates = recomputeOrders(reordered)
    // Only patch items whose order actually changed
    const currentById = new Map(items.map((item) => [item.id, item.order]))
    const changes = updates.filter(({ id, order }) => currentById.get(id) !== order)
    if (changes.length === 0) return

    setSaving(true)
    try {
      // bulkUpdateItems aplica o mesmo patch para todos os IDs. Para definir um order por item,
      // emitimos chamadas em paralelo.
      await Promise.all(
        changes.map(({ id, order }) =>
          bulkUpdateItems({ ids: [id], patch: { order } }, items),
        ),
      )
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Erro ao reordenar', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={`pt-1 ${saving ? 'opacity-70' : ''}`}>
      {items.map((item) => {
        const isDragging = dragId === item.id
        const showLineBefore = hoverId === item.id && hoverBefore && dragId !== item.id
        const showLineAfter = hoverId === item.id && !hoverBefore && dragId !== item.id
        return (
          <div
            key={item.id}
            draggable
            onDragStart={(e) => {
              setDragId(item.id)
              e.dataTransfer.effectAllowed = 'move'
              e.dataTransfer.setData(DRAG_MIME, item.id)
              e.dataTransfer.setData('text/plain', item.id)
            }}
            onDragEnd={() => {
              setDragId(null)
              setHoverId(null)
            }}
            onDragOver={(e) => {
              if (!dragId || dragId === item.id) return
              e.preventDefault()
              e.dataTransfer.dropEffect = 'move'
              const rect = e.currentTarget.getBoundingClientRect()
              const before = e.clientY < rect.top + rect.height / 2
              setHoverId(item.id)
              setHoverBefore(before)
            }}
            onDragLeave={(e) => {
              if (e.currentTarget === e.target) {
                setHoverId((current) => (current === item.id ? null : current))
              }
            }}
            onDrop={(e) => {
              e.preventDefault()
              const rect = e.currentTarget.getBoundingClientRect()
              const before = e.clientY < rect.top + rect.height / 2
              void handleDrop(item.id, before)
            }}
            className={`relative flex items-center gap-2 border-b border-ui-border-soft px-1 py-2.5 ${
              isDragging ? 'opacity-40' : ''
            }`}
          >
            {showLineBefore && (
              <span className="pointer-events-none absolute inset-x-1 -top-px h-0.5 rounded-full bg-brand-500" />
            )}
            {showLineAfter && (
              <span className="pointer-events-none absolute inset-x-1 -bottom-px h-0.5 rounded-full bg-brand-500" />
            )}
            <span
              title="Arrastar"
              className="flex h-6 w-4 shrink-0 cursor-grab touch-none items-center justify-center text-navy-300 active:cursor-grabbing"
            >
              <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M5 3a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm6 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2ZM5 7a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm6 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2ZM5 11a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm6 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z" />
              </svg>
            </span>
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
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] border transition-colors ${
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
