'use client'

import type { Item } from '@clarity/types'
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
  const dayItems = items.filter((i) => i.dueDate === date || i.scheduledDate === date)

  return (
    <div className="border-l border-slate-200 pl-6">
      <h3 className="text-sm font-semibold text-slate-700 mb-4 capitalize">
        {formatDate(date)}
      </h3>

      {dayItems.length === 0 ? (
        <p className="text-sm text-slate-400">Nenhum item para este dia.</p>
      ) : (
        <div className="space-y-0.5">
          {dayItems.map((item) => (
            <ItemRow key={item.id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}
