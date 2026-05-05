'use client'

import { use, useState } from 'react'
import useSWR from 'swr'
import { useItems } from '@/hooks/use-items'
import { updateProject } from '@/hooks/use-projects'
import { ItemList } from '@/components/items/item-list'
import type { Project } from '@doit/types'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const STATUS_OPTIONS: { value: Project['status']; label: string }[] = [
  { value: 'active', label: 'Ativo' },
  { value: 'paused', label: 'Pausado' },
  { value: 'done', label: 'Concluído' },
  { value: 'archived', label: 'Arquivado' },
]

const COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#ef4444', '#06b6d4', '#64748b',
]

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data, mutate } = useSWR<{ project: Project }>(`/api/projects/${id}`, fetcher)
  const { items, isLoading } = useItems({ projectId: id })

  const project = data?.project

  const [editingName, setEditingName] = useState(false)
  const [name, setName] = useState('')

  if (!project) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="h-8 w-48 bg-slate-100 rounded animate-pulse mb-4" />
        <div className="h-4 w-32 bg-slate-100 rounded animate-pulse" />
      </div>
    )
  }

  async function saveName() {
    if (!name.trim() || name === project?.name) { setEditingName(false); return }
    await updateProject(id, { name: name.trim() })
    await mutate()
    setEditingName(false)
  }

  async function handleStatusChange(status: Project['status']) {
    await updateProject(id, { status })
    await mutate()
  }

  async function handleColorChange(color: string) {
    await updateProject(id, { color })
    await mutate()
  }

  const open = items.filter((i) => i.status !== 'done' && i.status !== 'archived')
  const closed = items.filter((i) => i.status === 'done' || i.status === 'archived')

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header do projeto */}
      <div className="flex items-start gap-3 mb-6">
        <div
          className="w-4 h-4 rounded-full mt-1.5 shrink-0"
          style={{ backgroundColor: project.color ?? '#94a3b8' }}
        />
        <div className="flex-1 min-w-0">
          {editingName ? (
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={saveName}
              onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false) }}
              className="text-2xl font-semibold text-slate-900 border-none outline-none bg-transparent w-full"
            />
          ) : (
            <h1
              className="text-2xl font-semibold text-slate-900 cursor-pointer hover:text-brand-700 transition-colors"
              onClick={() => { setName(project.name); setEditingName(true) }}
            >
              {project.name}
            </h1>
          )}
          {project.description && (
            <p className="text-sm text-slate-400 mt-1">{project.description}</p>
          )}
        </div>
      </div>

      {/* Configurações */}
      <div className="flex flex-wrap items-center gap-4 mb-8 pb-6 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Status:</span>
          <select
            value={project.status}
            onChange={(e) => handleStatusChange(e.target.value as Project['status'])}
            className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Cor:</span>
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => handleColorChange(c)}
              className={`w-4 h-4 rounded-full transition-transform ${project.color === c ? 'scale-125 ring-2 ring-offset-1 ring-slate-400' : ''}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        <span className="text-xs text-slate-300 ml-auto">
          {open.length} abertos · {closed.length} concluídos
        </span>
      </div>

      {/* Itens abertos */}
      <section className="mb-6">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Em andamento
        </h2>
        <ItemList
          items={open}
          isLoading={isLoading}
          emptyMessage="Nenhum item aberto neste projeto."
        />
      </section>

      {/* Itens concluídos */}
      {closed.length > 0 && (
        <section>
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Concluídos · {closed.length}
          </h2>
          <ItemList items={closed} />
        </section>
      )}
    </div>
  )
}
