'use client'

export type Priority = 1 | 2 | 3 | 4

export const PRIORITY_CONFIG = {
  1: { label: 'P1', title: 'Urgente', color: 'text-red-500', border: 'border-red-500', bg: 'bg-red-500', ring: 'ring-red-200', flagFill: '#ef4444' },
  2: { label: 'P2', title: 'Alta',    color: 'text-orange-500', border: 'border-orange-400', bg: 'bg-orange-400', ring: 'ring-orange-200', flagFill: '#fb923c' },
  3: { label: 'P3', title: 'Média',   color: 'text-blue-500', border: 'border-blue-500', bg: 'bg-blue-500', ring: 'ring-blue-200', flagFill: '#3b82f6' },
  4: { label: 'P4', title: 'Normal',  color: 'text-slate-400', border: 'border-slate-300', bg: 'bg-slate-300', ring: 'ring-slate-200', flagFill: '#94a3b8' },
} as const

export function PriorityFlag({ priority, size = 14 }: { priority?: Priority | null; size?: number }) {
  const p = priority ?? 4
  const { flagFill } = PRIORITY_CONFIG[p]
  if (p === 4) return null
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={flagFill} className="shrink-0">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" stroke={flagFill} strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

type Props = {
  value?: Priority | null
  onChange: (priority: Priority) => void
}

const PRIORITIES: Priority[] = [1, 2, 3, 4]

export function PrioritySelect({ value, onChange }: Props) {
  const current = value ?? 4

  return (
    <div className="flex gap-1.5">
      {PRIORITIES.map((p) => {
        const cfg = PRIORITY_CONFIG[p]
        const active = current === p
        return (
          <button
            key={p}
            type="button"
            title={cfg.title}
            onClick={() => onChange(p)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-[8px] text-[13px] font-semibold border transition-all ${
              active
                ? `${cfg.bg} text-white border-transparent ring-2 ${cfg.ring}`
                : `bg-surface-soft ${cfg.color} border-ui-border-soft hover:border-current`
            }`}
          >
            <PriorityFlag priority={p} size={11} />
            {cfg.label}
          </button>
        )
      })}
    </div>
  )
}
