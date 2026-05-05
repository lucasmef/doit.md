'use client'

import type { Item } from '@clarity/types'
import { ComplexityBadge } from './complexity-badge'
import { updateItem } from '@/hooks/use-items'
import { useUI } from '@/store/ui'

type Props = {
  item: Item
  active?: boolean
}

export function ItemRow({ item, active = false }: Props) {
  const { setSelectedItemId } = useUI()

  async function toggleDone(e: React.MouseEvent) {
    e.stopPropagation()
    const next = item.status === 'done' ? 'todo' : 'done'
    await updateItem(item.id, { status: next })
  }

  const overdue =
    item.dueDate &&
    item.dueDate < new Date().toISOString().slice(0, 10) &&
    item.status !== 'done' &&
    item.status !== 'archived'

  return (
    <button
      onClick={() => setSelectedItemId(item.id)}
      className={`w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors group ${
        active ? 'bg-brand-50 ring-1 ring-brand-200' : 'hover:bg-slate-50'
      }`}
    >
      {/* Checkbox — só task/capture */}
      {(item.complexity === 'task' || item.complexity === 'capture') && (
        <button
          onClick={toggleDone}
          className={`mt-0.5 w-4 h-4 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors ${
            item.status === 'done'
              ? 'bg-green-500 border-green-500'
              : 'border-slate-300 hover:border-blue-400'
          }`}
        >
          {item.status === 'done' && (
            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 12 12">
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
      )}

      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium truncate ${
            item.status === 'done' ? 'line-through text-slate-400' : 'text-slate-800'
          }`}
        >
          {item.title}
        </p>

        <div className="flex items-center gap-2 mt-1">
          <ComplexityBadge complexity={item.complexity} />
          {item.dueDate && (
            <span
              className={`text-[10px] font-medium ${overdue ? 'text-red-500' : 'text-slate-400'}`}
            >
              {item.dueDate}
            </span>
          )}
          {item.tags.length > 0 && (
            <span className="text-[10px] text-slate-400">{item.tags.slice(0, 2).join(', ')}</span>
          )}
        </div>
      </div>
    </button>
  )
}
