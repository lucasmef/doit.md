'use client'

import { useMemo, useState } from 'react'
import { useItems } from '@/hooks/use-items'
import { ItemList } from '@/components/items/item-list'

export function ArchiveSection() {
  const [query, setQuery] = useState('')
  const { items, isLoading } = useItems({ status: 'closed' })

  const normalizedQuery = query.trim().toLocaleLowerCase('pt-BR')
  const filtered = useMemo(() => {
    if (!normalizedQuery) return items
    return items.filter((item) => {
      const haystack = [
        item.title,
        item.contentMd ?? '',
        ...(item.tags ?? []),
      ].join(' ').toLocaleLowerCase('pt-BR')
      return haystack.includes(normalizedQuery)
    })
  }, [items, normalizedQuery])

  const done = filtered.filter((item) => item.status === 'done')
  const archived = filtered.filter((item) => item.status === 'archived')

  return (
    <div>
      <div className="mb-4 border-b border-ui-border-soft pb-3">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-[22px] font-bold text-slate-900">Concluidos e arquivados</h2>
          <p className="text-[13px] font-medium text-slate-500">{filtered.length} itens</p>
        </div>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar concluidos e arquivados"
          className="mt-4 h-10 w-full rounded-xl border border-ui-border-soft bg-surface-soft px-3 text-[14px] text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
        />
      </div>

      <section className="mb-4">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Concluidos · {done.length}
        </h3>
        <ItemList items={done} isLoading={isLoading} emptyMessage="Nenhum item concluido." hideDoneAfterDelay={false} />
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Arquivados · {archived.length}
        </h3>
        <ItemList items={archived} isLoading={isLoading} emptyMessage="Nenhum item arquivado." />
      </section>
    </div>
  )
}
