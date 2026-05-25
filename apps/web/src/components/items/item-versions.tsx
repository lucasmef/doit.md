'use client'

import { useRef, useState } from 'react'
import useSWR, { mutate as globalMutate } from 'swr'
import type { ItemVersion } from '@doit/types'
import { useDialog } from '@/components/ui/dialog'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

type Props = { itemId: string; compact?: boolean; iconTrigger?: boolean }

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function VersionPreview({
  version,
  onRestore,
  restoring,
}: {
  version: ItemVersion
  onRestore: () => void
  restoring: boolean
}) {
  const snap = version.snapshotData as Record<string, unknown>
  const title = String(snap['title'] ?? 'Sem titulo')
  const content = String(snap['contentMd'] ?? '')
  const tags = Array.isArray(snap['tags']) ? (snap['tags'] as string[]) : []
  const status = String(snap['status'] ?? '')
  const dueDate = String(snap['dueDate'] ?? '')

  return (
    <div className="rounded-lg border border-ui-border-soft bg-surface-soft p-3 text-[12px]">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="font-mono text-[10px] text-slate-400">{formatDate(version.createdAt)}</span>
        <button
          type="button"
          onClick={onRestore}
          disabled={restoring}
          className="rounded-md bg-brand-600 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {restoring ? 'Restaurando...' : 'Restaurar'}
        </button>
      </div>
      <p className="mb-1.5 truncate text-[13px] font-semibold text-slate-700">{title}</p>
      <div className="flex flex-wrap gap-1.5 text-[10px]">
        {status && <span className="rounded bg-white px-1.5 py-0.5 font-mono text-slate-500">{status}</span>}
        {dueDate && <span className="rounded bg-white px-1.5 py-0.5 font-mono text-slate-500">{dueDate}</span>}
        {tags.slice(0, 4).map((tag) => (
          <span key={tag} className="rounded bg-white px-1.5 py-0.5 font-mono text-slate-500">@{tag}</span>
        ))}
      </div>
      {content && (
        <pre className="mt-2 max-h-40 overflow-y-auto whitespace-pre-wrap break-words rounded bg-white px-2 py-1.5 font-mono text-[11px] text-slate-600">
          {content.slice(0, 1000)}{content.length > 1000 ? '...' : ''}
        </pre>
      )}
    </div>
  )
}

export function ItemVersions({ itemId, compact = false, iconTrigger = false }: Props) {
  const { data, isLoading } = useSWR<{ versions: ItemVersion[] }>(
    `/api/items/${itemId}/versions`,
    fetcher,
  )
  const [restoring, setRestoring] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [position, setPosition] = useState<{ left: number; top: number; width: number } | null>(null)
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const { confirm } = useDialog()

  const versions = data?.versions ?? []

  function toggleOpen() {
    const nextOpen = !open
    if (nextOpen && (compact || iconTrigger) && buttonRef.current && typeof window !== 'undefined') {
      const rect = buttonRef.current.getBoundingClientRect()
      const width = Math.min(360, window.innerWidth - 24)
      const left = Math.min(Math.max(12, rect.right - width), window.innerWidth - width - 12)
      setPosition({ left, top: rect.bottom + 8, width })
    }
    setOpen(nextOpen)
  }

  async function handleRestore(versionId: string) {
    const ok = await confirm({
      title: 'Restaurar versao',
      message: 'O estado atual sera salvo no historico antes da troca.',
      confirmLabel: 'Restaurar',
    })
    if (!ok) return
    setRestoring(versionId)
    try {
      await fetch(`/api/items/${itemId}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ versionId }),
      })
      await globalMutate((key: string) => typeof key === 'string' && key.startsWith('/api/items'))
      await globalMutate(`/api/items/${itemId}/versions`)
      setExpanded(null)
    } finally {
      setRestoring(null)
    }
  }

  const popoverFloating = compact || iconTrigger

  return (
    <div className="relative">
      {iconTrigger ? (
        <button
          ref={buttonRef}
          type="button"
          onClick={toggleOpen}
          title={`Historico (${versions.length})`}
          aria-label="Historico"
          className="inline-flex h-8 w-8 items-center justify-center rounded-[10px] text-slate-500 hover:bg-white hover:text-slate-800"
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            aria-hidden="true"
          >
            <path d="M3 12a9 9 0 1 0 3-6.7" />
            <path d="M3 3v5h5" />
            <path d="M12 7v5l3 2" strokeLinecap="round" />
          </svg>
        </button>
      ) : (
        <button
          ref={buttonRef}
          type="button"
          onClick={toggleOpen}
          className="flex w-full items-center justify-between py-1 text-xs text-slate-400 transition-colors hover:text-slate-600"
        >
          <span className="truncate font-medium">{compact ? `Historico (${versions.length})` : `Historico de versoes (${versions.length})`}</span>
          <span>{open ? '▲' : '▼'}</span>
        </button>
      )}

      {open && (
        <div
          className={`${popoverFloating ? 'fixed z-[90] rounded-xl border border-ui-border bg-white p-2 shadow-cool-lg' : 'mt-2'} max-h-[min(520px,calc(100vh-96px))] space-y-1.5 overflow-y-auto`}
          style={popoverFloating && position ? { left: position.left, top: position.top, width: position.width } : undefined}
        >
          {isLoading && <div className="h-8 animate-pulse rounded bg-slate-100" />}

          {!isLoading && versions.length === 0 && (
            <p className="text-xs italic text-slate-300">Nenhuma versao salva ainda.</p>
          )}

          {versions.map((v) => {
            const snap = v.snapshotData as Record<string, unknown>
            const title = String(snap['title'] ?? 'Sem titulo')
            const isExpanded = expanded === v.id

            if (isExpanded) {
              return (
                <div key={v.id}>
                  <button
                    type="button"
                    onClick={() => setExpanded(null)}
                    className="mb-1 flex w-full items-center gap-1.5 rounded px-2 py-1 text-[10px] text-slate-400 hover:bg-slate-50"
                  >
                    <span>▼ Recolher</span>
                  </button>
                  <VersionPreview version={v} onRestore={() => handleRestore(v.id)} restoring={restoring === v.id} />
                </div>
              )
            }

            return (
              <button
                key={v.id}
                type="button"
                onClick={() => setExpanded(v.id)}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-slate-50"
              >
                <span className="text-[10px] text-slate-300">▶</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-slate-600">{title}</p>
                  <p className="font-mono text-[10px] text-slate-400">{formatDate(v.createdAt)}</p>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
