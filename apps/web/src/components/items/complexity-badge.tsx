import type { ItemComplexity } from '@doit/types'
import { COMPLEXITY_LABELS } from '@doit/core'

const COLORS: Record<ItemComplexity, string> = {
  capture: 'bg-slate-100 border border-slate-200 text-slate-600',
  task: 'bg-[#e7f1ff] border border-[#d8e8ff] text-[#5a534a]',
  note: 'bg-[#fff1df] border border-[#fde4c2] text-[#5a534a]',
  project: 'bg-[#f1eaff] border border-[#e4d8ff] text-[#5a534a]',
  document: 'bg-[#e9f7ea] border border-[#d7ecd9] text-[#5a534a]',
}

export function ComplexityBadge({ complexity }: { complexity: ItemComplexity }) {
  return (
    <span className={`text-[12px] font-medium px-3 py-1 rounded-full ${COLORS[complexity]}`}>
      {COMPLEXITY_LABELS[complexity]}
    </span>
  )
}
