'use client'

import Link from 'next/link'
import { useItems } from '@/hooks/use-items'

export default function TagsPage() {
  const { items, isLoading } = useItems()
  const tags = Array.from(
    new Set(
      items
        .filter((item) => item.status !== 'archived')
        .flatMap((item) => item.tags ?? [])
        .filter(Boolean),
    ),
  ).sort((a, b) => a.localeCompare(b, 'pt-BR'))

  return (
    <div className="mx-auto max-w-3xl px-5 pb-24 pt-3 lg:pb-4">
      {isLoading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && tags.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">
          Nenhuma tag criada ainda.
        </div>
      )}

      {!isLoading && tags.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {tags.map((tag) => {
            const count = items.filter((item) => item.status !== 'archived' && item.tags?.includes(tag)).length
            return (
              <Link
                key={tag}
                href={`/tags/${encodeURIComponent(tag)}`}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:border-brand-300 hover:bg-brand-50 transition-colors"
              >
                <span className="font-medium text-slate-700 truncate">@{tag}</span>
                <span className="text-xs text-slate-400">{count}</span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
