'use client'

import { useState, useEffect, useRef } from 'react'
import { createItem } from '@/hooks/use-items'
import { useUI } from '@/store/ui'
import { useToast } from '@/components/ui/toast'
import { PRIORITY_CONFIG, PriorityFlag } from './priority-select'
import type { Priority } from './priority-select'
import type { ItemComplexity } from '@doit/types'
import { COMPLEXITY_LABELS } from '@doit/core'

const COMPLEXITIES: ItemComplexity[] = ['capture', 'task', 'note']
const PRIORITIES: Priority[] = [1, 2, 3, 4]

export function QuickCapture() {
  const { quickCaptureOpen, setQuickCaptureOpen, setSelectedItemId } = useUI()
  const { toast } = useToast()
  const [title, setTitle] = useState('')
  const [complexity, setComplexity] = useState<ItemComplexity>('capture')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState<Priority>(4)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setQuickCaptureOpen(true)
      }
      if (e.key === 'Escape') setQuickCaptureOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [setQuickCaptureOpen])

  useEffect(() => {
    if (quickCaptureOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setTitle('')
      setComplexity('capture')
      setDueDate('')
      setPriority(4)
    }
  }, [quickCaptureOpen])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    try {
      const item = await createItem({
        title: title.trim(),
        complexity,
        status: 'inbox',
        dueDate: dueDate || undefined,
        priority: priority < 4 ? priority : undefined,
      })
      setQuickCaptureOpen(false)
      setSelectedItemId(item.id)
      toast('Item criado com sucesso', 'success')
    } finally {
      setSaving(false)
    }
  }

  const isNote = complexity === 'note'

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] bg-black/30 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && setQuickCaptureOpen(false)}
    >
      <div 
        className={`bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col transition-all duration-300 ${
          isNote 
            ? 'w-full max-w-4xl h-[70vh] rounded-2xl' 
            : 'w-full max-w-lg rounded-2xl'
        }`}
      >
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="px-6 pt-6 pb-4">
            <input
              ref={inputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isNote ? "Título da nota..." : "O que você está pensando?"}
              className={`w-full text-slate-900 placeholder:text-slate-300 border-none outline-none bg-transparent font-bold ${
                isNote ? 'text-2xl' : 'text-lg'
              }`}
            />
          </div>

          {isNote && (
            <div className="flex-1 px-6 overflow-y-auto">
              <textarea
                placeholder="Comece a escrever sua nota..."
                className="w-full h-full text-slate-700 placeholder:text-slate-300 border-none outline-none bg-transparent resize-none py-2"
                // Nota: Poderíamos usar o MarkdownEditor aqui, mas para QuickCapture um textarea simples ou um editor simplificado é melhor.
                // Se quisermos o MarkdownEditor completo, precisaríamos adicionar um estado para o conteúdo.
              />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
            {/* Complexidade */}
            <div className="flex gap-1 p-1 bg-slate-100 rounded-lg">
              {COMPLEXITIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setComplexity(c)}
                  className={`text-[11px] px-3 py-1.5 rounded-md font-bold uppercase tracking-wider transition-all ${
                    complexity === c
                      ? 'bg-white text-brand-600 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {COMPLEXITY_LABELS[c]}
                </button>
              ))}
            </div>

            {/* Separador */}
            <div className="w-px h-6 bg-slate-200 hidden sm:block" />

            {/* Prioridade */}
            <div className="flex gap-1">
              {PRIORITIES.map((p) => {
                const cfg = PRIORITY_CONFIG[p]
                const active = priority === p
                return (
                  <button
                    key={p}
                    type="button"
                    title={cfg.title}
                    onClick={() => setPriority(p)}
                    className={`flex items-center gap-1 text-[11px] px-2.5 py-1.5 rounded-lg font-bold transition-all ${
                      active
                        ? `${cfg.bg} text-white shadow-sm`
                        : `bg-slate-100 ${cfg.color} hover:bg-slate-200`
                    }`}
                  >
                    <PriorityFlag priority={p} size={10} />
                    <span className="hidden sm:inline">{cfg.label}</span>
                  </button>
                )
              })}
            </div>

            {/* Data (só tasks) */}
            {(complexity === 'task') && (
              <>
                <div className="w-px h-6 bg-slate-200 hidden sm:block" />
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="text-xs font-medium border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                />
              </>
            )}

            <div className="flex-1" />

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQuickCaptureOpen(false)}
                className="text-xs font-bold text-slate-400 hover:text-slate-600 px-2 py-1 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!title.trim() || saving}
                className="text-xs font-bold px-5 py-2 rounded-xl bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-40 transition-all shadow-md hover:shadow-lg transform active:scale-95"
              >
                {saving ? '...' : 'Salvar'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
