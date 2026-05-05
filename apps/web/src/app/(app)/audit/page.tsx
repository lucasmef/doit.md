'use client'

import { useState } from 'react'
import { useAuditLogs, usePendingChanges, applyApprovedChanges } from '@/hooks/use-audit'
import { PendingChangeCard } from '@/components/audit/pending-change-card'
import { AuditLogRow } from '@/components/audit/audit-log-row'

type Tab = 'pending' | 'logs'

export default function AuditPage() {
  const [tab, setTab] = useState<Tab>('pending')
  const [pushing, setPushing] = useState(false)
  const [pushResult, setPushResult] = useState<string | null>(null)

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
      setPushResult(`✓ ${applied} mudança(s) aplicada(s) com sucesso.`)
      await refresh()
    } catch (err) {
      setPushResult(`✕ Erro: ${err instanceof Error ? err.message : 'Falha desconhecida'}`)
    } finally {
      setPushing(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Auditoria</h1>
          <p className="text-sm text-slate-400 mt-1">
            Mudanças feitas pela IA externa via sync-agent.
          </p>
        </div>

        {approvedCount > 0 && (
          <button
            onClick={handlePush}
            disabled={pushing}
            className="shrink-0 text-sm font-semibold px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-40 transition-colors"
          >
            {pushing ? 'Aplicando...' : `Aplicar ${approvedCount} aprovada(s)`}
          </button>
        )}
      </div>

      {pushResult && (
        <div
          className={`mb-4 text-sm px-4 py-3 rounded-lg ${
            pushResult.startsWith('✓')
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {pushResult}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 mb-6">
        <button
          onClick={() => setTab('pending')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            tab === 'pending'
              ? 'border-brand-600 text-brand-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Mudanças pendentes
          {changes.length > 0 && (
            <span className="ml-2 text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-full">
              {changes.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('logs')}
          className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
            tab === 'logs'
              ? 'border-brand-600 text-brand-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Histórico
        </button>
      </div>

      {/* Pending tab */}
      {tab === 'pending' && (
        <div>
          {/* Resumo */}
          {changes.length > 0 && (
            <div className="flex flex-wrap gap-3 mb-5">
              <div className="text-xs px-3 py-2 rounded-lg bg-slate-100 text-slate-600">
                <span className="font-semibold">{pendingCount}</span> aguardando aprovação
              </div>
              <div className="text-xs px-3 py-2 rounded-lg bg-green-100 text-green-700">
                <span className="font-semibold">{approvedCount}</span> aprovadas
              </div>
              {highRiskCount > 0 && (
                <div className="text-xs px-3 py-2 rounded-lg bg-red-100 text-red-700">
                  <span className="font-semibold">{highRiskCount}</span> alto risco — requer atenção
                </div>
              )}
            </div>
          )}

          {loadingChanges && (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          )}

          {!loadingChanges && changes.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-12 text-center">
              <p className="text-sm text-slate-400 mb-1">Nenhuma mudança pendente.</p>
              <p className="text-xs text-slate-300">
                Execute <code className="font-mono bg-slate-100 px-1 rounded">clarity-sync diff</code> para detectar alterações locais.
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

      {/* Logs tab */}
      {tab === 'logs' && (
        <div>
          {loadingLogs && (
            <div className="space-y-1">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-10 bg-slate-100 rounded animate-pulse" />
              ))}
            </div>
          )}

          {!loadingLogs && logs.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-12 text-center">
              <p className="text-sm text-slate-400">Nenhum log registrado ainda.</p>
            </div>
          )}

          {logs.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 overflow-hidden">
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
