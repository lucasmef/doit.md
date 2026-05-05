'use client'

import { useState } from 'react'
import { createProject } from '@/hooks/use-projects'

const COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#ef4444', '#06b6d4', '#64748b',
]

type Props = { onDone?: () => void }

export function CreateProjectForm({ onDone }: Props) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [color, setColor] = useState(COLORS[0]!)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    try {
      await createProject({ name: name.trim(), description: description.trim() || undefined, color })
      setName('')
      setDescription('')
      onDone?.()
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-brand-200 bg-brand-50 p-4 space-y-3">
      <p className="text-sm font-semibold text-slate-700">Novo projeto</p>

      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Nome do projeto"
        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
      />

      <input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Descrição (opcional)"
        className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
      />

      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500">Cor:</span>
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setColor(c)}
            className={`w-5 h-5 rounded-full transition-transform ${color === c ? 'scale-125 ring-2 ring-offset-1 ring-slate-400' : ''}`}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onDone}
          className="text-sm text-slate-500 hover:text-slate-700 px-3 py-1.5"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={!name.trim() || saving}
          className="text-sm font-semibold px-4 py-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-40 transition-colors"
        >
          {saving ? 'Criando...' : 'Criar projeto'}
        </button>
      </div>
    </form>
  )
}
