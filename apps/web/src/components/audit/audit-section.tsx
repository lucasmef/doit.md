'use client'

import { useState } from 'react'
import { useAuditLogs, usePendingChanges, applyApprovedChanges } from '@/hooks/use-audit'
import { PendingChangeCard } from '@/components/audit/pending-change-card'
import { AuditLogRow } from '@/components/audit/audit-log-row'
import { useToast } from '@/components/ui/toast'

type Tab = 'pending' | 'logs'

export function AuditSection() {
  const [tab, setTab] = useState<Tab>('pending')
  const [pushing, setPushing] = useState(false)
  const [pushResult, setPushResult] = useState<string | null>(null)
  const { toast } = useToast()

  const { changes, isLoading: loadingChanges, refresh } = usePendingChanges()
  const { logs, isLoading: loadingLogs } = useAuditLogs()

  const approvedCount = changes.filter((c) => c.approved).length
  const pendingCount = changes.filter((c) => !c.approved).length
  const highRiskCount = changes.filter((c) => c.riskLevel === 'high' && !c.approved).length

  async function handlePush() {
    if (approvedCount === 0) return
    setPushing(true)
    setPushResult(null)
    try {
      const { applied } = await applyApprovedChanges()
      setPushResult(`OK: ${applied} mudanca(s) aplicada(s) com sucesso.`)
      toast(`${applied} mudanca(s) aplicada(s)`, 'success')
      await refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha desconhecida'
      setPushResult(`Erro: ${msg}`)
      toast(msg, 'error')
    } finally {
      setPushing(false)
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-end gap-4">
        {approvedCount > 0 && (
          <button
            onClick={handlePush}
            disabled={pushing}
            className="shrink-0 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-700 disabled:opacity-40"
          >
            {pushing ? 'Aplicando...' : `Aplicar ${approvedCount} aprovada(s)`}
          </button>
        )}
      </div>

      {pushResult && (
        <div
          className={`mb-4 rounded-lg border px-4 py-3 text-sm ${
            pushResult.startsWith('OK:')
              ? 'border-green-200 bg-green-50 text-green-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {pushResult}
        </div>
      )}

      <div className="mb-4 flex gap-1 border-b border-slate-200">
        <button
          onClick={() => setTab('pending')}
          className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'pending'
              ? 'border-brand-600 text-brand-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Mudancas pendentes
          {changes.length > 0 && (
            <span className="ml-2 rounded-full bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
              {changes.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('logs')}
          className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            tab === 'logs'
              ? 'border-brand-600 text-brand-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Historico
        </button>
      </div>

      {tab === 'pending' && (
        <div>
          {changes.length > 0 && (
            <div className="mb-5 flex flex-wrap gap-3">
              <div className="rounded-lg bg-slate-100 px-3 py-2 text-xs text-slate-600">
                <span className="font-semibold">{pendingCount}</span> aguardando aprovacao
              </div>
              <div className="rounded-lg bg-green-100 px-3 py-2 text-xs text-green-700">
                <span className="font-semibold">{approvedCount}</span> aprovadas
              </div>
              {highRiskCount > 0 && (
                <div className="rounded-lg bg-red-100 px-3 py-2 text-xs text-red-700">
                  <span className="font-semibold">{highRiskCount}</span> alto risco
                </div>
              )}
            </div>
          )}

          {loadingChanges && (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          )}

          {!loadingChanges && changes.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-12 text-center">
              <p className="mb-1 text-sm text-slate-400">Nenhuma mudanca pendente.</p>
              <p className="text-xs text-slate-300">
                Execute <code className="rounded bg-slate-100 px-1 font-mono">doit-sync diff</code>.
              </p>
            </div>
          )}

          <div className="space-y-3">
            {changes.map((change) => (
              <PendingChangeCard key={change.id} change={change} />
            ))}
          </div>
        </div>
      )}

      {tab === 'logs' && (
        <div>
          {loadingLogs && (
            <div className="space-y-1">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded bg-slate-100" />
              ))}
            </div>
          )}

          {!loadingLogs && logs.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-12 text-center">
              <p className="text-sm text-slate-400">Nenhum log registrado ainda.</p>
            </div>
          )}

          {logs.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              {logs.map((log) => (
                <AuditLogRow key={log.id} log={log} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
