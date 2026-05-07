'use client'

import type { Item } from '@doit/types'
import { ItemRow } from '@/components/items/item-row'

type Props = {
  date: string
  items: Item[]
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
}

export function DayAgenda({ date, items }: Props) {
  const dayItems = (items || []).filter((i) => i && (i.dueDate === date || i.scheduledDate === date))

  return (
    <div className="bg-surface-panel border border-ui-border-panel rounded-[12px] p-3 shadow-sm h-fit">
      <h3 className="text-[15px] font-bold text-slate-900 mb-3 capitalize pb-3 border-b border-ui-border-soft">
        Agenda - {formatDate(date)}
      </h3>

      <div>
        <h4 className="text-[13px] font-bold text-slate-800 mb-2">Itens do dia</h4>
        {dayItems.length === 0 ? (
          <p className="text-sm text-slate-400">Nenhum item para este dia.</p>
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
