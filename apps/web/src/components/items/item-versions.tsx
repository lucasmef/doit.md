'use client'

import { useState } from 'react'
import useSWR, { mutate as globalMutate } from 'swr'
import type { ItemVersion } from '@clarity/types'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

type Props = { itemId: string }

export function ItemVersions({ itemId }: Props) {
  const { data, isLoading } = useSWR<{ versions: ItemVersion[] }>(
    `/api/items/${itemId}/versions`,
    fetcher,
  )
  const [restoring, setRestoring] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  const versions = data?.versions ?? []

  async function handleRestore(versionId: string) {
    if (!confirm('Restaurar esta versão? O estado atual será substituído.')) return
    setRestoring(versionId)
    try {
      await fetch(`/api/items/${itemId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId }),
      })
      await globalMutate((key: string) => typeof key === 'string' && key.startsWith('/api/items'))
    } finally {
      setRestoring(null)
    }
  }

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between text-xs text-slate-400 hover:text-slate-600 transition-colors py-1"
      >
        <span className="font-medium">Histórico de versões</span>
        <span>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="mt-2 space-y-1">
          {isLoading && (
            <div className="h-8 bg-slate-100 rounded animate-pulse" />
          )}

          {!isLoading && versions.length === 0 && (
            <p className="text-xs text-slate-300 italic">Nenhuma versão salva ainda.</p>
          )}

          {versions.map((v) => {
            const snap = v.snapshotData as Record<string, unknown>
            return (
              <div
                key={v.id}
                className="flex items-center gap-2 py-1.5 px-2 rounded-lg hover:bg-slate-50"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-600 truncate">
                    {String(snap['title'] ?? 'Sem título')}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {new Date(v.createdAt).toLocaleString('pt-BR', {
                      day: '2-digit', month: '2-digit',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
                <button
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
