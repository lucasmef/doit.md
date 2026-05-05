import type { ItemStatus } from '@doit/types'
import { STATUS_LABELS } from '@doit/core'

const COLORS: Record<ItemStatus, string> = {
  inbox: 'bg-slate-100 text-slate-500',
  todo: 'bg-blue-50 text-blue-600',
  doing: 'bg-amber-50 text-amber-700',
  waiting: 'bg-orange-50 text-orange-600',
  done: 'bg-green-50 text-green-700',
  archived: 'bg-slate-100 text-slate-400',
}

export function StatusBadge({ status }: { status: ItemStatus }) {
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${COLORS[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  )
}
