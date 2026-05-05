'use client'

import type { ItemComplexity } from '@clarity/types'
import { COMPLEXITY_LABELS } from '@clarity/core'

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
      className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
    >
      {ALL.map((c) => (
        <option key={c} value={c}>
          {COMPLEXITY_LABELS[c]}
        </option>
      ))}
    </select>
  )
}
