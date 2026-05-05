'use client'

import type { ItemStatus } from '@doit/types'
import { STATUS_LABELS } from '@doit/core'

const ALL: ItemStatus[] = ['inbox', 'todo', 'doing', 'waiting', 'done', 'archived']

type Props = {
  value: ItemStatus
  onChange: (v: ItemStatus) => void
}

export function StatusSelect({ value, onChange }: Props) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as ItemStatus)}
      className="w-full text-[14px] border border-ui-border-soft rounded-[10px] px-3 py-2 bg-surface-soft text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
    >
      {ALL.map((s) => (
        <option key={s} value={s}>
          {STATUS_LABELS[s]}
        </option>
      ))}
    </select>
  )
}
