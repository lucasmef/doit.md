'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { useToast } from '@/components/ui/toast'
import { useDialog } from '@/components/ui/dialog'
import type { PublicCliToken } from '@doit/types'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

function formatDate(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function CliTokensSection() {
  const { data, mutate, isLoading } = useSWR<{ tokens: PublicCliToken[] }>(
    '/api/cli-tokens',
    fetcher,
  )
  const { toast } = useToast()
  const { confirm, prompt } = useDialog()
  const [creating, setCreating] = useState(false)
  const [revealedPlaintext, setRevealedPlaintext] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const t = setTimeout(() => setCopied(false), 1500)
    return () => clearTimeout(t)
  }, [copied])

  async function handleCreate() {
    const name = await prompt({
      title: 'Novo token CLI',
      message: 'Dê um nome pra identificar este token (ex: "MacBook pessoal").',
      placeholder: 'Nome',
    })
    if (!name?.trim()) return

    setCreating(true)
    try {
      const res = await fetch('/api/cli-tokens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error ?? 'Falha ao criar token')
      }
      const { plaintext } = (await res.json()) as { plaintext: string }
      setRevealedPlaintext(plaintext)
      void mutate()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro ao criar token', 'error')
    } finally {
      setCreating(false)
    }
  }

  async function handleRevoke(token: PublicCliToken) {
    const ok = await confirm({
      title: 'Revogar token',
      message: `Revogar "${token.name}"? Os dispositivos usando este token vão parar de sincronizar imediatamente.`,
      confirmLabel: 'Revogar',
      variant: 'danger',
    })
    if (!ok) return

    try {
      const res = await fetch(`/api/cli-tokens/${token.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Falha ao revogar')
      toast('Token revogado.', 'info')
      void mutate()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Erro ao revogar token', 'error')
    }
  }

  async function copyPlaintext() {
    if (!revealedPlaintext) return
    try {
      await navigator.clipboard.writeText(revealedPlaintext)
      setCopied(true)
    } catch {
      toast('Não foi possível copiar. Selecione e copie manualmente.', 'error')
    }
  }

  const tokens = data?.tokens ?? []

  return (
    <section className="space-y-4">
      <div className="rounded-[16px] border border-ui-border-panel bg-surface-panel shadow-sm">
        <div className="flex items-start justify-between gap-3 border-b border-ui-border-soft px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-slate-700">Tokens CLI</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              Gere tokens para autenticar o <code className="rounded bg-slate-100 px-1 font-mono text-[11px]">doit-sync</code> em outros computadores. Você só vê o token completo no momento da criação.
            </p>
          </div>
          <button
            type="button"
            onClick={handleCreate}
            disabled={creating}
            className="shrink-0 rounded-lg bg-brand-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
          >
            {creating ? 'Gerando...' : '+ Novo token'}
          </button>
        </div>

        {revealedPlaintext && (
          <div className="border-b border-amber-200 bg-amber-50 px-5 py-4">
            <p className="text-[12px] font-semibold text-amber-800">
              Copie agora. Não dá pra ver de novo.
            </p>
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 truncate rounded bg-white px-2 py-1.5 font-mono text-[12px] text-slate-700">
                {revealedPlaintext}
              </code>
              <button
                type="button"
                onClick={copyPlaintext}
                className="rounded-md border border-amber-300 bg-white px-3 py-1.5 text-[12px] font-semibold text-amber-800 hover:bg-amber-100"
              >
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
              <button
                type="button"
                onClick={() => setRevealedPlaintext(null)}
                className="rounded-md px-2 py-1 text-[12px] text-amber-700 hover:bg-amber-100"
              >
                Fechar
              </button>
            </div>
          </div>
        )}

        <div>
          {isLoading ? (
            <div className="px-5 py-6 text-sm text-slate-400">Carregando...</div>
          ) : tokens.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-slate-400">
              Nenhum token gerado. Crie um para usar a CLI.
            </div>
          ) : (
            <ul className="divide-y divide-ui-border-soft">
              {tokens.map((token) => {
                const revoked = !!token.revokedAt
                return (
                  <li
                    key={token.id}
                    className="flex items-center gap-3 px-5 py-3 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p
                          className={`truncate font-medium ${
                            revoked ? 'text-slate-400 line-through' : 'text-slate-800'
                          }`}
                        >
                          {token.name}
                        </p>
                        {revoked && (
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
                            revogado
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 font-mono text-[11px] text-slate-400">
                        doit_{token.prefix}_••••••••
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        Criado {formatDate(token.createdAt)} ·{' '}
                        {token.lastUsedAt
                          ? `usado por último ${formatDate(token.lastUsedAt)}`
                          : 'nunca usado'}
                      </p>
                    </div>
                    {!revoked && (
                      <button
                        type="button"
                        onClick={() => handleRevoke(token)}
                        className="shrink-0 rounded-md border border-red-200 px-2.5 py-1 text-[12px] text-red-500 hover:bg-red-50"
                      >
                        Revogar
                      </button>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="rounded-[16px] border border-ui-border-panel bg-surface-panel px-5 py-4 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700">Como usar</h3>
        <div className="mt-2 space-y-1 rounded-lg bg-slate-900 px-4 py-3 font-mono text-xs text-slate-200">
          <p><span className="text-slate-500">#</span> instalar globalmente</p>
          <p>npm install -g doit-sync</p>
          <p className="pt-1"><span className="text-slate-500">#</span> autenticar com o token</p>
          <p>doit-sync login</p>
          <p className="pt-1"><span className="text-slate-500">#</span> baixar workspace</p>
          <p>doit-sync pull</p>
        </div>
      </div>
    </section>
  )
}
