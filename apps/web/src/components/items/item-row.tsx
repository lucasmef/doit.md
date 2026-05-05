'use client'

import { useState } from 'react'
import type { Item } from '@doit/types'
import { ComplexityBadge } from './complexity-badge'
import { updateItem } from '@/hooks/use-items'
import { useUI } from '@/store/ui'

type Props = {
  item: Item
  active?: boolean
  index?: number
}

export function ItemRow({ item, active = false, index = 0 }: Props) {
  const { setSelectedItemId } = useUI()
  const [justCompleted, setJustCompleted] = useState(false)

  async function toggleDone(e: React.MouseEvent) {
    e.stopPropagation()
    const next = item.status === 'done' ? 'todo' : 'done'
    if (next === 'done') {
      setJustCompleted(true)
      setTimeout(() => setJustCompleted(false), 600)
    }
    await updateItem(item.id, { status: next })
  }

  const overdue =
    item.dueDate &&
    item.dueDate < new Date().toISOString().slice(0, 10) &&
    item.status !== 'done' &&
    item.status !== 'archived'

  const staggerDelay = `${Math.min(index * 40, 300)}ms`

  return (
    <button
      onClick={() => setSelectedItemId(item.id)}
      data-item-id={item.id}
      style={{ animationDelay: staggerDelay }}
      className={`w-full text-left flex items-center gap-4 px-5 py-4 rounded-[14px] transition-all group border animate-stagger-item ${ 
        active
          ? 'bg-surface-selected border-ui-border-selected shadow-sm'
          : 'bg-surface-panel border-ui-border-panel hover:border-slate-300 hover:shadow-sm'
      }`}
    >
      {/* Checkbox — só task/capture */}
      {(item.complexity === 'task' || item.complexity === 'capture') ? (
        <button
          onClick={toggleDone}
          className={`shrink-0 w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center transition-all ${
            item.status === 'done'
              ? 'bg-slate-400 border-slate-400'
              : justCompleted
              ? 'border-brand-500 animate-ring-pulse'
              : 'border-[#b0a79d] hover:border-brand-500'
          }`}
        >
          {item.status === 'done' && (
            <svg
              className={`w-3.5 h-3.5 text-white ${justCompleted ? 'animate-check-pop' : ''}`}
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
        <div className="shrink-0 w-[22px] h-[22px] flex items-center justify-center">
          <div className="w-2 h-2 rounded-full bg-[#b0a79d]" />
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <p
          className={`text-[16px] leading-tight font-medium truncate transition-all ${
            item.status === 'done' ? 'line-through text-slate-400' : 'text-slate-800'
          }`}
        >
          {item.title}
        </p>

        <div className="flex items-center gap-1.5 mt-1">
          {item.dueDate && (
            <span
              className={`text-[12px] ${overdue ? 'text-red-500 font-medium' : 'text-slate-500'}`}
            >
              {item.dueDate}
            </span>
          )}
          {item.dueDate && item.tags.length > 0 && (
            <span className="text-slate-300">•</span>
          )}
          {item.tags.length > 0 && (
            <span className="text-[12px] text-slate-500 truncate">
              {item.tags.slice(0, 3).join(', ')}
            </span>
          )}
        </div>
      </div>
      
      <div className="shrink-0">
        <ComplexityBadge complexity={item.complexity} />
      </div>
    </button>
  )
}

