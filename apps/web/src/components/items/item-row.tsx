'use client'

import { useRef, useState } from 'react'
import type { Item } from '@doit/types'
import { PRIORITY_CONFIG, PriorityFlag } from './priority-select'
import type { Priority } from './priority-select'
import { DONE_CHECK_ANIMATION_MS } from './completion-feedback'
import { updateItem } from '@/hooks/use-items'
import { useUI } from '@/store/ui'
import { formatRecurrenceLabel, toLocalDateKey } from '@doit/core'

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

function IconRecurrence({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path d="M17 2.5 20 5.5 17 8.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 5.5H8.5A4.5 4.5 0 0 0 4 10" strokeLinecap="round" />
      <path d="M7 21.5 4 18.5 7 15.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 18.5h11.5A4.5 4.5 0 0 0 20 14" strokeLinecap="round" />
    </svg>
  )
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
  variant?: 'plain' | 'glass'
}

export function ItemRow({
  item,
  active = false,
  selected = false,
  orderedIds = [],
  index = 0,
  variant = 'plain',
}: Props) {
  const {
    setSingleSelection,
    toggleSelection,
    selectRange,
    openContextMenu,
  } = useUI()
  const [justCompleted, setJustCompleted] = useState(false)
  const [optimisticDone, setOptimisticDone] = useState(false)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressTriggered = useRef(false)
  const longPressStart = useRef<{ x: number; y: number } | null>(null)

  async function toggleDone(e: React.SyntheticEvent) {
    e.stopPropagation()
    if (item.status === 'archived') {
      await updateItem(item.id, { status: 'todo' })
      return
    }

    const next = item.status === 'done' ? 'todo' : 'done'
    if (next === 'done') {
      setOptimisticDone(true)
      setJustCompleted(true)
      setTimeout(() => setJustCompleted(false), DONE_CHECK_ANIMATION_MS)
    } else {
      setOptimisticDone(false)
    }
    try {
      await updateItem(item.id, { status: next })
    } catch {
      if (next === 'done') setOptimisticDone(false)
    }
  }

  const displayDone = item.status === 'done' || optimisticDone

  const today = toLocalDateKey()
  const overdue =
    item.dueDate &&
    item.dueDate < today &&
    item.status !== 'done' &&
    item.status !== 'archived'

  const p = (item.priority as Priority) ?? 4
  const priorityCfg = PRIORITY_CONFIG[p]
  const checkboxBorder = displayDone
    ? 'border-teal-500'
    : item.status === 'archived'
    ? 'border-navy-100'
    : p < 4
    ? priorityCfg.border
    : 'border-navy-200'

  const staggerDelay = `${Math.min(index * 40, 300)}ms`
  const isGlass = variant === 'glass'

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

  function handleRowKeyDown(e: React.KeyboardEvent) {
    if (e.key !== 'Enter' && e.key !== ' ') return
    e.preventDefault()
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
    longPressStart.current = null
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (e.pointerType === 'mouse') return
    longPressTriggered.current = false
    clearLongPressTimer()
    longPressStart.current = { x: e.clientX, y: e.clientY }
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true
      openContextMenu({ itemId: item.id, x: e.clientX, y: e.clientY })
    }, 450)
  }

  function handlePointerMove(e: React.PointerEvent) {
    const start = longPressStart.current
    if (!start) return
    if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > 10) clearLongPressTimer()
  }

  return (
    <div
      tabIndex={0}
      aria-label={`Abrir item ${item.title}`}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={clearLongPressTimer}
      onPointerCancel={clearLongPressTimer}
      onKeyDown={handleRowKeyDown}
      data-item-id={item.id}
      style={{ animationDelay: staggerDelay }}
      className={
        isGlass
          ? `group flex w-full max-w-full cursor-pointer select-none touch-pan-y [-webkit-touch-callout:none] items-center gap-3 overflow-hidden rounded-[20px] border px-2 py-2.5 text-left shadow-cool-sm backdrop-blur-xl transition-colors animate-stagger-item ${
              selected || active
                ? 'border-white/70 bg-white/82 text-navy-900 ring-2 ring-brand-300/35'
                : 'border-white/48 bg-white/52 hover:bg-white/72'
            }`
          : `group flex w-full cursor-pointer select-none touch-pan-y [-webkit-touch-callout:none] items-center gap-3 border-b px-1 py-2.5 text-left transition-colors animate-stagger-item ${
              selected
                ? 'border-ui-border-selected bg-surface-selected'
                : active
                ? 'border-ui-border-selected bg-surface-selected'
                : 'border-ui-border-soft hover:bg-surface-soft'
            }`
      }
    >
      {/* Checkbox — só task/capture */}
      {(item.complexity === 'task' || item.complexity === 'capture') ? (
        <button
          type="button"
          onClick={toggleDone}
          onPointerDown={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.stopPropagation()}
          aria-label={displayDone ? `Marcar ${item.title} como pendente` : `Concluir ${item.title}`}
          aria-pressed={displayDone}
          className={`flex h-11 w-11 shrink-0 items-center justify-center transition-colors ${
            isGlass ? 'rounded-[16px] hover:bg-white/50' : 'rounded-md hover:bg-surface-soft'
          }`}
        >
          <span
            className={`flex h-[18px] w-[18px] items-center justify-center rounded-[5px] border-[1.5px] transition-all ${
              displayDone
                ? 'border-teal-500 bg-teal-500'
                : justCompleted
                ? 'border-brand-500 animate-ring-pulse'
                : `${checkboxBorder} hover:border-brand-500`
            }`}
          >
            {displayDone && (
              <svg
                className={`w-3 h-3 text-white ${justCompleted ? 'animate-check-pop' : ''}`}
                fill="none"
                viewBox="0 0 12 12"
                aria-hidden="true"
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
          </span>
        </button>
      ) : (
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center text-navy-500 ${isGlass ? 'rounded-[16px] bg-white/34' : ''}`}>
          {item.complexity === 'note'
            ? <IconNoteFilled className="h-4 w-4" />
            : p < 4
            ? <PriorityFlag priority={p} size={13} />
            : <div className="h-2 w-2 rounded-full bg-navy-200" />}
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <p
          className={`flex min-w-0 items-start gap-1.5 text-[14px] leading-5 font-normal transition-all ${
            displayDone ? 'line-through text-navy-500' : 'text-navy-900'
          }`}
        >
          {/* ID 049: ícone de recorrência para identificar tarefas recorrentes sem abrir. */}
          {item.recurrence && (
            <IconRecurrence className="h-3.5 w-3.5 shrink-0 text-brand-500" />
          )}
          <span className="min-w-0 break-words [overflow-wrap:anywhere] sm:truncate">{item.title}</span>
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
            <span className="truncate font-mono text-[11px] text-navy-500">
              {item.tags.slice(0, 3).map((tag) => `#${tag}`).join(' ')}
            </span>
          )}
          {(item.dueDate || item.tags.length > 0) && item.recurrence && (
            <span className="font-mono text-navy-200">/</span>
          )}
          {item.recurrence && (
            <span className="truncate font-mono text-[11px] text-navy-500">
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
          className="shrink-0 rounded-full border border-white/60 bg-white/60 px-3 py-1 text-[12px] font-medium text-navy-600 hover:bg-white hover:text-brand-700"
        >
          Restaurar
        </button>
      )}
    </div>
  )
}
