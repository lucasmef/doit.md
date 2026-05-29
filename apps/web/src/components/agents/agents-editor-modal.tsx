'use client'

import { useEffect, useState } from 'react'
import { saveAgentsInstructions, useAgentsInstructions } from '@/hooks/use-agents'
import { useToast } from '@/components/ui/toast'
import { useEscapeClose } from '@/hooks/use-escape-close'

const DEFAULT_CONTENT = `# AGENTS.md

Instrucoes para a IA ao trabalhar nesta pasta e subpastas.
`

export function AgentsEditorModal({
  folderId,
  title,
  open,
  onClose,
}: {
  folderId: string | null
  title: string
  open: boolean
  onClose: () => void
}) {
  const { content, isLoading, mutate } = useAgentsInstructions(folderId, open)
  const [value, setValue] = useState('')
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (!open) return
    setValue(content || DEFAULT_CONTENT)
  }, [content, open])

  // Esc fecha o editor de AGENTS.md mesmo sem foco interno (ID 010).
  useEscapeClose(open, onClose)

  if (!open) return null

  async function handleSave() {
    setSaving(true)
    try {
      await saveAgentsInstructions(folderId, value)
      await mutate()
      toast('AGENTS.md salvo', 'success')
      onClose()
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Erro ao salvar AGENTS.md', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[210] flex items-end justify-center bg-navy-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      onClick={(event) => {
        if (event.target === event.currentTarget && !saving) onClose()
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-t-xl border border-ui-border bg-white shadow-cool-lg sm:rounded-xl">
        <div className="border-b border-ui-border-soft px-5 py-4">
          <h2 className="text-[15px] font-semibold text-navy-900">{title}</h2>
          <p className="mt-0.5 text-xs text-navy-400">
            Este arquivo sera sincronizado como nota e baixado pelo CLI como AGENTS.local.md,
            complementando o AGENTS.md padrao do app.
          </p>
        </div>
        <div className="min-h-0 flex-1 px-5 py-4">
          {isLoading ? (
            <div className="h-56 animate-pulse rounded-lg bg-slate-100" />
          ) : (
            <textarea
              value={value}
              onChange={(event) => setValue(event.target.value)}
              spellCheck={false}
              className="h-80 w-full resize-none rounded-[10px] border border-ui-border-soft bg-surface-soft p-3 font-mono text-[13px] leading-5 text-navy-900 outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
            />
          )}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-ui-border bg-surface-soft px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="h-10 rounded-[10px] px-3 text-[12px] font-semibold text-slate-500 hover:bg-white hover:text-slate-700 disabled:opacity-50 sm:h-8"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || isLoading}
            className="h-10 rounded-[10px] bg-brand-600 px-3 text-[12px] font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50 sm:h-8"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}
