import type { ItemComplexity } from '@clarity/types'
import { COMPLEXITY_LABELS } from '@clarity/core'

const COLORS: Record<ItemComplexity, string> = {
  capture: 'bg-slate-100 text-slate-500',
  task: 'bg-blue-50 text-blue-600',
  note: 'bg-amber-50 text-amber-600',
  project: 'bg-violet-50 text-violet-600',
  document: 'bg-emerald-50 text-emerald-600',
}

export function ComplexityBadge({ complexity }: { complexity: ItemComplexity }) {
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${COLORS[complexity]}`}>
      {COMPLEXITY_LABELS[complexity]}
    </span>
  )
}
