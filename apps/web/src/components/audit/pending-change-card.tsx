'use client'

import { useState } from 'react'
import type { PendingChange } from '@doit/types'
import { approveChange, rejectChange } from '@/hooks/use-audit'
import { DiffViewer } from './diff-viewer'

const RISK_CONFIG = {
  low: { label: 'Baixo', cls: 'bg-green-100 text-green-700' },
  medium: { label: 'Médio', cls: 'bg-amber-100 text-amber-700' },
  high: { label: 'Alto', cls: 'bg-red-100 text-red-700' },
}

const TYPE_LABEL: Record<PendingChange['changeType'], string> = {
  created: 'Criado',
  updated: 'Atualizado',
  moved: 'Movido',
  renamed: 'Renomeado',
  frontmatter_changed: 'Metadados alterados',
  content_changed: 'Conteúdo alterado',
  deleted: 'Excluído',
  folder_created: 'Pasta criada',
  folder_moved: 'Pasta movida',
  folder_renamed: 'Pasta renomeada',
  folder_deleted: 'Pasta excluida',
  conflict: 'Conflito',
}

type Props = {
  change: PendingChange
  selected?: boolean
  onSelectChange?: (selected: boolean) => void
}

export function PendingChangeCard({ change, selected = false, onSelectChange }: Props) {
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const risk = RISK_CONFIG[change.riskLevel]

  async function handleApprove() {
    setLoading(true)
    try { await approveChange(change.id) } finally { setLoading(false) }
  }

  async function handleReject() {
    setLoading(true)
    try { await rejectChange(change.id) } finally { setLoading(false) }
  }

  return (
    <div
      className={`rounded-xl border p-4 space-y-3 transition-colors ${
        change.approved
          ? 'border-green-200 bg-green-50'
          : change.riskLevel === 'high'
          ? 'border-red-200 bg-red-50'
          : 'border-slate-200 bg-white'
      }`}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        {onSelectChange && (
          <input
            type="checkbox"
            checked={selected}
            onChange={(event) => onSelectChange(event.target.checked)}
            className="mt-1 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
            aria-label="Selecionar mudanca"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-xs font-semibold text-slate-600">
              {TYPE_LABEL[change.changeType]}
            </span>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${risk.cls}`}>
              {risk.label} risco
            </span>
            {change.approved && (
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-200 text-green-800">
                Aprovado
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 truncate">
            {change.localPathAfter ??
              change.localPathBefore ??
              change.itemId ??
              change.folderId ??
              'desconhecido'}
          </p>
          {change.titleAfter && change.titleBefore && change.titleAfter !== change.titleBefore && (
            <p className="text-xs text-slate-400 mt-0.5">
              <span className="line-through">{change.titleBefore}</span>
              {' → '}
              <span className="font-medium text-slate-600">{change.titleAfter}</span>
            </p>
          )}
          {change.folderNameAfter &&
            change.folderNameBefore &&
            change.folderNameAfter !== change.folderNameBefore && (
              <p className="text-xs text-slate-400 mt-0.5">
                <span className="line-through">{change.folderNameBefore}</span>
                {' -> '}
                <span className="font-medium text-slate-600">{change.folderNameAfter}</span>
              </p>
            )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-slate-400 hover:text-slate-700 underline"
          >
            {expanded ? 'Ocultar' : 'Ver diff'}
          </button>

          {!change.approved && (
            <>
              <button
                onClick={handleReject}
                disabled={loading}
                className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 text-slate-500 hover:border-red-300 hover:text-red-600 disabled:opacity-40 transition-colors"
              >
                Rejeitar
              </button>
              <button
                onClick={handleApprove}
                disabled={loading}
                className="text-xs px-2.5 py-1 rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-40 transition-colors"
              >
                Aprovar
              </button>
            </>
          )}
        </div>
      </div>

      {/* Frontmatter changes */}
      {expanded && change.frontmatterChanges && change.frontmatterChanges.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-semibold text-slate-400">Metadados alterados:</p>
          <div className="rounded-lg border border-slate-200 overflow-hidden">
            {change.frontmatterChanges.map((fc, i) => (
              <div key={i} className="grid grid-cols-3 text-xs px-3 py-1.5 border-b border-slate-100 last:border-0">
                <span className="font-medium text-slate-500">{fc.field}</span>
                <span className="text-red-600 line-through truncate">{String(fc.before ?? '—')}</span>
                <span className="text-green-700 truncate">{String(fc.after ?? '—')}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Diff de conteúdo */}
      {expanded && (change.contentMdBefore || change.contentMdAfter) && (
        <DiffViewer
          label="Conteúdo"
          before={change.contentMdBefore}
          after={change.contentMdAfter}
        />
      )}
    </div>
  )
}
