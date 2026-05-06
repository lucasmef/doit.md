'use client'

import { use } from 'react'
import { useItems } from '@/hooks/use-items'
import { ItemList } from '@/components/items/item-list'

export default function TagDetailPage({ params }: { params: Promise<{ tag: string }> }) {
  const { tag: encodedTag } = use(params)
  const tag = decodeURIComponent(encodedTag)
  const { items, isLoading } = useItems()
  const tagItems = items.filter((item) => item.status !== 'archived' && item.tags?.includes(tag))
  const tasks = tagItems.filter((item) => item.complexity === 'task' || item.complexity === 'capture')
  const notes = tagItems.filter((item) => item.complexity === 'note')

  return (
    <div className="p-6 max-w-3xl mx-auto pb-24 lg:pb-6">
      <div className="flex items-baseline justify-between mb-8 border-b border-ui-border-soft pb-4">
        <h1 className="text-[28px] font-bold text-slate-900">@{tag}</h1>
        <p className="text-[14px] text-slate-500 font-medium">{tagItems.length} itens</p>
      </div>

      <section className="mb-6">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Tarefas · {tasks.length}
        </h2>
        <ItemList items={tasks} isLoading={isLoading} emptyMessage="Nenhuma tarefa com esta tag." />
      </section>

      <section>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Notas · {notes.length}
        </h2>
        <ItemList items={notes} emptyMessage="Nenhuma nota com esta tag." />
      </section>
    </div>
  )
}
