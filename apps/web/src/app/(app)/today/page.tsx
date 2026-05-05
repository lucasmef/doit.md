'use client'

import { useItems } from '@/hooks/use-items'
import { ItemList } from '@/components/items/item-list'
import { isToday, isOverdue } from '@clarity/core'

export default function TodayPage() {
  const { items, isLoading } = useItems()

  const today = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  const todayItems = items.filter(
    (i) => (isToday(i) || isOverdue(i)) && i.status !== 'archived',
  )

  const tasks = todayItems.filter((i) => i.complexity === 'task' || i.complexity === 'capture')
  const notes = todayItems.filter((i) => i.complexity !== 'task' && i.complexity !== 'capture')

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold text-slate-900 mb-1">Hoje</h1>
      <p className="text-sm text-slate-400 mb-6 capitalize">{today}</p>

      <section className="mb-6">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Tarefas · {tasks.length}
        </h2>
        <ItemList
          items={tasks}
          isLoading={isLoading}
          emptyMessage="Nenhuma tarefa para hoje."
        />
      </section>

      {notes.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Notas · {notes.length}
          </h2>
          <ItemList items={notes} emptyMessage="" />
        </section>
      )}
    </div>
  )
}
