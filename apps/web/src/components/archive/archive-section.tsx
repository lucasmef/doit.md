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

  function recencyKey(item: { updatedAt?: string; createdAt?: string }) {
    return item.updatedAt ?? item.createdAt ?? ''
  }
  const done = filtered
    .filter((item) => item.status === 'done')
    .slice()
    .sort((a, b) => recencyKey(b).localeCompare(recencyKey(a)))
  const archived = filtered
    .filter((item) => item.status === 'archived')
    .slice()
    .sort((a, b) => recencyKey(b).localeCompare(recencyKey(a)))

  return (
    <div>
      <div className="mb-4 border-b border-ui-border-soft pb-3">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar concluidos e arquivados"
          className="h-10 w-full rounded-xl border border-ui-border-soft bg-surface-soft px-3 text-[14px] text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
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
