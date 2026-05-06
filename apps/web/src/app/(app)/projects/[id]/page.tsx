'use client'

import { use, useState } from 'react'
import useSWR from 'swr'
import { useItems } from '@/hooks/use-items'
import { updateProject } from '@/hooks/use-projects'
import { ItemList } from '@/components/items/item-list'
import { ItemRow } from '@/components/items/item-row'
import type { Project } from '@doit/types'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const STATUS_OPTIONS: { value: Project['status']; label: string }[] = [
  { value: 'active', label: 'Ativo' },
  { value: 'paused', label: 'Pausado' },
  { value: 'done', label: 'Concluido' },
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
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list')

  if (!project) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="h-8 w-48 bg-slate-100 rounded animate-pulse mb-4" />
        <div className="h-4 w-32 bg-slate-100 rounded animate-pulse" />
      </div>
    )
  }

  async function saveName() {
    if (!name.trim() || name === project?.name) {
      setEditingName(false)
      return
    }
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
  const tasks = open.filter((i) => i.complexity === 'task' || i.complexity === 'capture')
  const notes = open.filter((i) => i.complexity === 'note')
  const closed = items.filter((i) => i.status === 'done' || i.status === 'archived')
  const projectTags = Array.from(
    new Set(open.flatMap((item) => item.tags ?? []).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b, 'pt-BR'))

  return (
    <div className="p-6 max-w-3xl mx-auto">
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
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveName()
                if (e.key === 'Escape') setEditingName(false)
              }}
              className="text-2xl font-semibold text-slate-900 border-none outline-none bg-transparent w-full"
            />
          ) : (
            <h1
              className="text-2xl font-semibold text-slate-900 cursor-pointer hover:text-brand-700 transition-colors"
              onClick={() => {
                setName(project.name)
                setEditingName(true)
              }}
            >
              {project.name}
            </h1>
          )}
          {project.description && (
            <p className="text-sm text-slate-400 mt-1">{project.description}</p>
          )}
        </div>
      </div>

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
              type="button"
              onClick={() => handleColorChange(c)}
              className={`w-4 h-4 rounded-full transition-transform ${project.color === c ? 'scale-125 ring-2 ring-offset-1 ring-slate-400' : ''}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>

        <span className="text-xs text-slate-300 ml-auto">
          {open.length} abertos / {closed.length} concluidos
        </span>
      </div>

      <div className="mb-6 inline-flex rounded-lg border border-slate-200 bg-white p-1">
        {([
          ['list', 'Lista'],
          ['kanban', 'Kanban'],
        ] as const).map(([mode, label]) => (
          <button
            key={mode}
            type="button"
            onClick={() => setViewMode(mode)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
              viewMode === mode
                ? 'bg-brand-100 text-brand-700'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {viewMode === 'list' ? (
        <>
          <section className="mb-6">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Tarefas
            </h2>
            <ItemList
              items={tasks}
              isLoading={isLoading}
              emptyMessage="Nenhuma tarefa neste projeto."
            />
          </section>

          <section className="mb-6">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Notas
            </h2>
            <ItemList
              items={notes}
              isLoading={isLoading}
              emptyMessage="Nenhuma nota neste projeto."
            />
          </section>

          {closed.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Concluidos / {closed.length}
              </h2>
              <ItemList items={closed} />
            </section>
          )}
        </>
      ) : (
        <section>
          {projectTags.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400">
              Adicione tags aos itens do projeto para montar o Kanban.
            </div>
          ) : (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {projectTags.map((tag) => {
                const columnItems = open.filter((item) => item.tags?.includes(tag))
                return (
                  <section
                    key={tag}
                    className="w-80 shrink-0 rounded-xl border border-slate-200 bg-slate-50/70 p-3"
                  >
                    <div className="flex items-center justify-between mb-3 px-1">
                      <h2 className="text-sm font-semibold text-slate-800 truncate">@{tag}</h2>
                      <span className="text-xs text-slate-400">{columnItems.length}</span>
                    </div>
                    <div className="space-y-2">
                      {columnItems.map((item, index) => (
                        <ItemRow key={item.id} item={item} index={index} />
                      ))}
                    </div>
                  </section>
                )
              })}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
