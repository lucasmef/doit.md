'use client'

import { useState, useEffect, useRef } from 'react'
import { createItem } from '@/hooks/use-items'
import { useUI } from '@/store/ui'
import type { ItemComplexity } from '@clarity/types'
import { COMPLEXITY_LABELS } from '@clarity/core'

const COMPLEXITIES: ItemComplexity[] = ['capture', 'task', 'note']

export function QuickCapture() {
  const { quickCaptureOpen, setQuickCaptureOpen, setSelectedItemId } = useUI()
  const [title, setTitle] = useState('')
  const [complexity, setComplexity] = useState<ItemComplexity>('capture')
  const [dueDate, setDueDate] = useState('')
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
      })
      setQuickCaptureOpen(false)
      setSelectedItemId(item.id)
    } finally {
      setSaving(false)
    }
  }

  if (!quickCaptureOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/30 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && setQuickCaptureOpen(false)}
    >
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <form onSubmit={handleSubmit}>
          <div className="px-4 pt-4 pb-3">
            <input
              ref={inputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="O que você está pensando?"
              className="w-full text-lg text-slate-900 placeholder:text-slate-300 border-none outline-none bg-transparent"
            />
          </div>

          <div className="flex items-center gap-3 px-4 pb-4 border-t border-slate-100 pt-3">
            {/* Seletor de complexidade */}
            <div className="flex gap-1">
              {COMPLEXITIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setComplexity(c)}
                  className={`text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                    complexity === c
                      ? 'bg-brand-600 text-white'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {COMPLEXITY_LABELS[c]}
                </button>
              ))}
            </div>

            {/* Data */}
            {complexity === 'task' && (
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="text-xs border border-slate-200 rounded-md px-2 py-1 text-slate-600 focus:outline-none focus:ring-1 focus:ring-brand-500"
              />
            )}

            <div className="flex-1" />

            <button
              type="button"
              onClick={() => setQuickCaptureOpen(false)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!title.trim() || saving}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-40 transition-colors"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
