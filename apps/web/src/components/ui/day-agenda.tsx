'use client'

import type { Item } from '@doit/types'
import { ItemRow } from '@/components/items/item-row'
import { useUI } from '@/store/ui'

type Props = {
  date: string
  items: Item[]
  compact?: boolean
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
}

export function DayAgenda({ date, items, compact = false }: Props) {
  const { setSelectedItemId } = useUI()
  const dayItems = (items || []).filter((i) => i && (i.dueDate === date || i.scheduledDate === date))

  if (compact) {
    return (
      <section className="mt-5">
        <h3 className="mb-2 font-mono text-[10px] font-bold uppercase tracking-wide text-navy-300">
          {formatDate(date)}
        </h3>
        {dayItems.length === 0 ? (
          <p className="rounded-lg border border-dashed border-ui-border-strong px-3 py-3 font-mono text-[11px] text-navy-300">
            Nenhum item para este dia.
          </p>
        ) : (
          <div className="space-y-1.5">
            {dayItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedItemId(item.id)}
                className="w-full rounded-lg border border-ui-border bg-white px-3 py-2 text-left shadow-cool-sm transition-colors hover:bg-surface-soft"
              >
                <p className="truncate text-[13px] font-semibold text-navy-900">{item.title}</p>
                <p className="mt-0.5 truncate font-mono text-[11px] text-navy-300">
                  {item.complexity}
                  {item.tags.length > 0 ? ` / #${item.tags[0]}` : ''}
                </p>
              </button>
            ))}
          </div>
        )}
      </section>
    )
  }

  return (
    <div className="h-fit rounded-xl border border-ui-border bg-white p-3 shadow-cool-sm">
      <h3 className="mb-3 border-b border-ui-border-soft pb-3 text-[15px] font-bold capitalize text-navy-900">
        Agenda - {formatDate(date)}
      </h3>

      <div>
        <h4 className="mb-2 text-[13px] font-bold text-navy-900">Itens do dia</h4>
        {dayItems.length === 0 ? (
          <p className="text-sm text-navy-300">Nenhum item para este dia.</p>
        ) : (
          <div className="space-y-1.5">
            {dayItems.map((item) => (
              <ItemRow key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
