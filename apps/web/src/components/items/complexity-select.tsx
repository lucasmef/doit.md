'use client'

import type { ItemComplexity } from '@doit/types'
import { COMPLEXITY_LABELS } from '@doit/core'

const ALL: ItemComplexity[] = ['capture', 'task', 'note', 'project', 'document']

type Props = {
  value: ItemComplexity
  onChange: (v: ItemComplexity) => void
}

export function ComplexitySelect({ value, onChange }: Props) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as ItemComplexity)}
      className="w-full text-[14px] border border-ui-border-soft rounded-[10px] px-3 py-2 bg-surface-soft text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
    >
      {ALL.map((c) => (
        <option key={c} value={c}>
          {COMPLEXITY_LABELS[c]}
        </option>
      ))}
    </select>
  )
}
