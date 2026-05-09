'use client'

import { useRef, useState } from 'react'
import type { Item } from '@doit/types'
import { PRIORITY_CONFIG, PriorityFlag } from './priority-select'
import type { Priority } from './priority-select'
import { updateItem } from '@/hooks/use-items'
import { useUI } from '@/store/ui'
import {
  formatRecurrenceLabel,
  nextRecurringDate as computeNextRecurringDate,
  toLocalDateKey,
} from '@doit/core'

function formatDueDate(dateStr: string): string {
  const tomorrowDate = new Date()
  tomorrowDate.setDate(tomorrowDate.getDate() + 1)
  const today = toLocalDateKey()
  const tomorrow = toLocalDateKey(tomorrowDate)
  if (dateStr === today) return 'Hoje'
  if (dateStr === tomorrow) return 'Amanhã'
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
}

function formatDue(item: Item): string {
  const date = item.dueDate ? formatDueDate(item.dueDate) : ''
  if (!item.dueTime) return date
  return date ? `${date} ${item.dueTime}` : item.dueTime
}

function IconNoteFilled({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M6 2.75A2.25 2.25 0 0 0 3.75 5v14A2.25 2.25 0 0 0 6 21.25h12A2.25 2.25 0 0 0 20.25 19V8.12a2.25 2.25 0 0 0-.66-1.59l-3.12-3.12a2.25 2.25 0 0 0-1.59-.66H6Zm8.25 1.81 4.19 4.19H15a.75.75 0 0 1-.75-.75V4.56ZM7.5 11.75a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5a.75.75 0 0 1-.75-.75Zm0 4a.75.75 0 0 1 .75-.75h5.5a.75.75 0 0 1 0 1.5h-5.5a.75.75 0 0 1-.75-.75Z" />
    </svg>
  )
}

type Props = {
  item: Item
  active?: boolean
  selected?: boolean
  orderedIds?: string[]
  index?: number
}

export function ItemRow({ item, active = false, selected = false, orderedIds = [], index = 0 }: Props) {
  const {
    setSingleSelection,
    toggleSelection,
    selectRange,
    openContextMenu,
  } = useUI()
  const [justCompleted, setJustCompleted] = useState(false)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressTriggered = useRef(false)

  async function toggleDone(e: React.MouseEvent) {
    e.stopPropagation()
    if (item.status === 'archived') {
      await updateItem(item.id, { status: 'todo' })
      return
    }

    if (item.status !== 'done' && item.recurrence) {
      setJustCompleted(true)
      setTimeout(() => setJustCompleted(false), 600)
      await updateItem(item.id, {
        status: 'todo',
        dueDate: computeNextRecurringDate(item.dueDate, item.recurrence),
      })
      return
    }

    const next = item.status === 'done' ? 'todo' : 'done'
    if (next === 'done') {
      setJustCompleted(true)
      setTimeout(() => setJustCompleted(false), 600)
    }
    await updateItem(item.id, { status: next })
  }

  const today = toLocalDateKey()
  const overdue =
    item.dueDate &&
    item.dueDate < today &&
    item.status !== 'done' &&
    item.status !== 'archived'

  const p = (item.priority as Priority) ?? 4
  const priorityCfg = PRIORITY_CONFIG[p]
  const checkboxBorder = item.status === 'done'
    ? 'border-teal-500'
    : item.status === 'archived'
    ? 'border-navy-100'
    : p < 4
    ? priorityCfg.border
    : 'border-navy-200'

  const staggerDelay = `${Math.min(index * 40, 300)}ms`

  function handleClick(e: React.MouseEvent) {
    if (longPressTriggered.current) {
      longPressTriggered.current = false
      e.preventDefault()
      return
    }

    if (e.shiftKey) {
      e.preventDefault()
      selectRange(orderedIds, item.id)
      return
    }

    if (e.metaKey || e.ctrlKey) {
      e.preventDefault()
      toggleSelection(item.id)
      return
    }

    setSingleSelection(item.id)
  }

  function handleContextMenu(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    openContextMenu({ itemId: item.id, x: e.clientX, y: e.clientY })
  }

  function clearLongPressTimer() {
    if (!longPressTimer.current) return
    clearTimeout(longPressTimer.current)
    longPressTimer.current = null
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (e.pointerType === 'mouse') return
    longPressTriggered.current = false
    clearLongPressTimer()
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true
      openContextMenu({ itemId: item.id, x: e.clientX, y: e.clientY })
    }, 450)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onPointerDown={handlePointerDown}
      onPointerMove={clearLongPressTimer}
      onPointerUp={clearLongPressTimer}
      onPointerCancel={clearLongPressTimer}
      onKeyDown={(e) => e.key === 'Enter' && setSingleSelection(item.id)}
      data-item-id={item.id}
      style={{ animationDelay: staggerDelay }}
      className={`group flex w-full cursor-pointer items-center gap-3 border-b px-1 py-2.5 text-left transition-colors animate-stagger-item ${
        selected
          ? 'border-ui-border-selected bg-surface-selected'
          : active
          ? 'border-ui-border-selected bg-surface-selected'
          : 'border-ui-border-soft hover:bg-surface-soft'
      }`}
    >
      {/* Checkbox — só task/capture */}
      {(item.complexity === 'task' || item.complexity === 'capture') ? (
        <button
          onClick={toggleDone}
          onPointerDown={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.stopPropagation()}
          className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border-[1.5px] transition-all ${
            item.status === 'done'
              ? 'border-teal-500 bg-teal-500'
              : justCompleted
              ? 'border-brand-500 animate-ring-pulse'
              : `${checkboxBorder} hover:border-brand-500`
          }`}
        >
          {item.status === 'done' && (
            <svg
              className={`w-3 h-3 text-white ${justCompleted ? 'animate-check-pop' : ''}`}
              fill="none"
              viewBox="0 0 12 12"
            >
              <path
                d="M2 6l3 3 5-5"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
      ) : (
        <div className="flex h-[18px] w-[18px] shrink-0 items-center justify-center text-navy-300">
          {item.complexity === 'note'
            ? <IconNoteFilled className="h-4 w-4" />
            : p < 4
            ? <PriorityFlag priority={p} size={13} />
            : <div className="h-2 w-2 rounded-full bg-navy-200" />}
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <p
          className={`text-[14px] leading-5 font-normal truncate transition-all ${
            item.status === 'done' ? 'line-through text-navy-300' : 'text-navy-900'
          }`}
        >
          {item.title}
        </p>

        <div className="flex items-center gap-1.5">
          {item.dueDate && (
            <span className={`font-mono text-[11px] font-medium ${overdue ? 'text-danger' : item.dueDate === today ? 'text-teal-600' : 'text-navy-500'}`}>
              {overdue ? `Atrasado / ${formatDue(item)}` : formatDue(item)}
            </span>
          )}
          {item.dueDate && item.tags.length > 0 && (
            <span className="font-mono text-navy-200">/</span>
          )}
          {item.tags.length > 0 && (
            <span className="truncate font-mono text-[11px] text-navy-300">
              {item.tags.slice(0, 3).map((tag) => `#${tag}`).join(' ')}
            </span>
          )}
          {(item.dueDate || item.tags.length > 0) && item.recurrence && (
            <span className="font-mono text-navy-200">/</span>
          )}
          {item.recurrence && (
            <span className="truncate font-mono text-[11px] text-navy-300">
              {formatRecurrenceLabel(item.recurrence, item.dueDate)}
            </span>
          )}
        </div>
      </div>
      {item.status === 'archived' && (
        <button
          type="button"
          onClick={toggleDone}
          onPointerDown={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.stopPropagation()}
          className="shrink-0 rounded-md border border-ui-border bg-white px-2 py-1 text-[12px] font-medium text-navy-500 hover:bg-surface-soft hover:text-brand-700"
        >
          Restaurar
        </button>
      )}
    </div>
  )
}
