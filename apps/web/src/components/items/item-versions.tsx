'use client'

import { useState } from 'react'
import useSWR, { mutate as globalMutate } from 'swr'
import type { ItemVersion } from '@doit/types'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

type Props = { itemId: string; compact?: boolean }

export function ItemVersions({ itemId, compact = false }: Props) {
  const { data, isLoading } = useSWR<{ versions: ItemVersion[] }>(
    `/api/items/${itemId}/versions`,
    fetcher,
  )
  const [restoring, setRestoring] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  const versions = data?.versions ?? []

  async function handleRestore(versionId: string) {
    if (!confirm('Restaurar esta versao? O estado atual sera substituido.')) return
    setRestoring(versionId)
    try {
      await fetch(`/api/items/${itemId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId }),
      })
      await globalMutate((key: string) => typeof key === 'string' && key.startsWith('/api/items'))
      await globalMutate(`/api/items/${itemId}/versions`)
    } finally {
      setRestoring(null)
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between py-1 text-xs text-slate-400 transition-colors hover:text-slate-600"
      >
        <span className="truncate font-medium">{compact ? 'Historico' : 'Historico de versoes'}</span>
        <span>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className={`${compact ? 'absolute right-0 top-8 z-30 w-72 rounded-xl border border-ui-border bg-white p-2 shadow-cool-md' : 'mt-2'} space-y-1`}>
          {isLoading && (
            <div className="h-8 animate-pulse rounded bg-slate-100" />
          )}

          {!isLoading && versions.length === 0 && (
            <p className="text-xs italic text-slate-300">Nenhuma versao salva ainda.</p>
          )}

          {versions.map((v) => {
            const snap = v.snapshotData as Record<string, unknown>
            return (
              <div
                key={v.id}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-slate-600">
                    {String(snap['title'] ?? 'Sem titulo')}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {new Date(v.createdAt).toLocaleString('pt-BR', {
                      day: '2-digit', month: '2-digit',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRestore(v.id)}
                  disabled={restoring === v.id}
                  className="text-[10px] text-brand-600 hover:underline disabled:opacity-40"
                >
                  {restoring === v.id ? 'Restaurando...' : 'Restaurar'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
