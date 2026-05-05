'use client'

import type { ItemStatus } from '@clarity/types'
import { STATUS_LABELS } from '@clarity/core'

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
      className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
    >
      {ALL.map((s) => (
        <option key={s} value={s}>
          {STATUS_LABELS[s]}
        </option>
      ))}
    </select>
  )
}
