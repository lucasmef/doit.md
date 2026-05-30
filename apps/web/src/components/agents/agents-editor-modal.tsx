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
      className="fixed inset-0 z-[210] flex items-end justify-center bg-navy-900/35 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      onClick={(event) => {
        if (event.target === event.currentTarget && !saving) onClose()
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[24px] border border-white/70 bg-white/[0.92] shadow-[0_34px_90px_-42px_rgba(15,35,66,.58),0_10px_26px_rgba(15,35,66,.10),0_1px_0_rgba(255,255,255,.76)_inset] backdrop-blur-[24px] sm:rounded-[24px]">
        <div className="flex shrink-0 items-center gap-3 border-b border-navy-900/[0.07] px-5 pb-3.5 pt-4">
          <div className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[14px] bg-[linear-gradient(135deg,#2F6BFF,#7B5BFF)] font-mono text-[11px] font-bold text-white shadow-[0_10px_22px_-14px_rgba(47,107,255,.85)]">
            AG
          </div>
          <div className="min-w-0 flex-1">
            <b className="block truncate text-[15px] font-[850] text-navy-900">{title}</b>
            <span className="mt-1 block font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-navy-500">
              AGENTS.md
            </span>
          </div>
        </div>
        <p className="shrink-0 px-5 pb-1 pt-3 text-xs text-navy-400">
          Este arquivo sera sincronizado como nota e baixado pelo CLI como AGENTS.local.md,
          complementando o AGENTS.md padrao do app.
        </p>
        <div className="min-h-0 flex-1 px-5 py-3">
          {isLoading ? (
            <div className="h-56 animate-pulse rounded-[14px] bg-slate-100" />
          ) : (
            <textarea
              value={value}
              onChange={(event) => setValue(event.target.value)}
              spellCheck={false}
              className="h-80 w-full resize-none rounded-[18px] border border-navy-900/[0.08] bg-white/[0.88] p-3.5 font-mono text-[13px] leading-5 text-navy-900 outline-none shadow-[0_1px_0_rgba(255,255,255,.85)_inset] focus:ring-2 focus:ring-brand-100"
            />
          )}
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-navy-900/[0.07] bg-white/[0.62] px-5 py-3.5 pb-[calc(0.875rem+env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="h-9 rounded-full bg-navy-900/[0.055] px-4 text-[12px] font-bold text-navy-500 transition-colors hover:bg-white hover:text-navy-700 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving || isLoading}
            className="h-9 rounded-full bg-[linear-gradient(135deg,#2F6BFF,#7B5BFF)] px-4 text-[12px] font-extrabold text-white shadow-sm transition-colors hover:brightness-95 disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}
