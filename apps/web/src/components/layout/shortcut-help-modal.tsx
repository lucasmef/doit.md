'use client'

import { useEffect } from 'react'
import { useUI } from '@/store/ui'

type ShortcutGroup = {
  title: string
  items: Array<{ keys: string[]; label: string }>
}

const groups: ShortcutGroup[] = [
  {
    title: 'Global',
    items: [
      { keys: ['Shift', '?'], label: 'Mostrar atalhos' },
      { keys: ['Q'], label: 'Nova tarefa' },
      { keys: ['W'], label: 'Nova nota' },
      { keys: ['E'], label: 'Novo evento de calendario' },
      { keys: ['Ctrl/Cmd', 'K'], label: 'Buscar' },
      { keys: ['H'], label: 'Ir para Hoje' },
      { keys: ['P'], label: 'Ir para Próximos' },
      { keys: ['Shift', 'C'], label: 'Abrir ou fechar calendário' },
      { keys: ['Esc'], label: 'Fechar modal, painel ou selecao' },
    ],
  },
  {
    title: 'Listas',
    items: [
      { keys: ['J'], label: 'Selecionar proximo item' },
      { keys: ['K'], label: 'Selecionar item anterior' },
      { keys: ['Down'], label: 'Selecionar proximo item' },
      { keys: ['Up'], label: 'Selecionar item anterior' },
      { keys: ['Enter'], label: 'Abrir item focado' },
      { keys: ['E'], label: 'Editar item selecionado' },
    ],
  },
  {
    title: 'Captura',
    items: [
      { keys: ['@tag'], label: 'Adicionar tag' },
      { keys: ['#pasta'], label: 'Vincular pasta' },
      { keys: ['p1', 'p2', 'p3', 'p4'], label: 'Definir prioridade' },
      { keys: ['hoje', 'amanha', '12/05', '14:30'], label: 'Definir data ou horario' },
    ],
  },
]

function KeyCap({ children }: { children: string }) {
  return (
    <kbd className="inline-flex min-h-7 items-center justify-center rounded-md border border-ui-border bg-white px-2 font-mono text-[12px] font-semibold text-navy-700 shadow-sm">
      {children}
    </kbd>
  )
}

export function ShortcutHelpModal() {
  const { shortcutsOpen, setShortcutsOpen } = useUI()

  useEffect(() => {
    if (!shortcutsOpen) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setShortcutsOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [shortcutsOpen, setShortcutsOpen])

  if (!shortcutsOpen) return null

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-navy-900/35 px-4 py-6 backdrop-blur-[2px]"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setShortcutsOpen(false)
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcut-help-title"
        className="max-h-[88vh] w-full max-w-2xl overflow-hidden rounded-[24px] border border-white/70 bg-white/[0.92] shadow-[0_34px_90px_-42px_rgba(15,35,66,.58),0_10px_26px_rgba(15,35,66,.10),0_1px_0_rgba(255,255,255,.76)_inset] backdrop-blur-[24px]"
      >
        <div className="flex items-start justify-between gap-3 border-b border-navy-900/[0.07] px-5 pb-3.5 pt-4">
          <div className="min-w-0">
            <span className="block font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-navy-500">
              Teclado
            </span>
            <h2 id="shortcut-help-title" className="mt-0.5 text-[17px] font-[850] text-navy-900">
              Atalhos
            </h2>
            <p className="mt-1 text-[12px] text-navy-500">
              Atalhos globais funcionam somente quando nenhum campo esta em foco.
            </p>
          </div>
          <button
            type="button"
            aria-label="Fechar atalhos"
            onClick={() => setShortcutsOpen(false)}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-[11px] bg-navy-900/[0.055] text-navy-500 transition-colors hover:bg-navy-900/[0.08] hover:text-navy-900"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className="max-h-[calc(88vh-81px)] overflow-y-auto px-5 py-4">
          <div className="grid gap-5 md:grid-cols-2">
            {groups.map((group) => (
              <div key={group.title} className="space-y-2">
                <h3 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-navy-400">
                  {group.title}
                </h3>
                <div className="divide-y divide-ui-border-soft rounded-lg border border-ui-border-soft">
                  {group.items.map((item) => (
                    <div key={`${group.title}-${item.label}-${item.keys.join('-')}`} className="flex items-center justify-between gap-4 px-3 py-2.5">
                      <span className="text-[13px] font-medium text-navy-700">{item.label}</span>
                      <span className="flex shrink-0 flex-wrap justify-end gap-1.5">
                        {item.keys.map((key) => (
                          <KeyCap key={key}>{key}</KeyCap>
                        ))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
