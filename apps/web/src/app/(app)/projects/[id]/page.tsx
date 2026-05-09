'use client'

import { use, useEffect, useRef, useState } from 'react'
import useSWR from 'swr'
import { useItems } from '@/hooks/use-items'
import { updateProject } from '@/hooks/use-projects'
import { ItemList } from '@/components/items/item-list'
import { ItemRow } from '@/components/items/item-row'
import type { Project } from '@doit/types'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

const STATUS_OPTIONS: { value: Project['status']; label: string; dot: string }[] = [
  { value: 'active', label: 'Ativo', dot: 'bg-green-400' },
  { value: 'paused', label: 'Pausado', dot: 'bg-amber-400' },
  { value: 'done', label: 'Concluido', dot: 'bg-blue-400' },
  { value: 'archived', label: 'Arquivado', dot: 'bg-slate-300' },
]

const COLORS = [
  '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#ef4444', '#06b6d4', '#64748b',
]

function ChevronIcon() {
  return (
    <svg className="h-3 w-3 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
    </svg>
  )
}

function Popover({
  trigger,
  children,
  align = 'left',
}: {
  trigger: (props: { open: boolean; toggle: () => void }) => React.ReactNode
  children: (close: () => void) => React.ReactNode
  align?: 'left' | 'right'
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={ref} className="relative">
      {trigger({ open, toggle: () => setOpen((v) => !v) })}
      {open && (
        <div
          className={`absolute top-full mt-1 z-30 min-w-[160px] rounded-lg border border-slate-200 bg-white p-1 shadow-lg ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}

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
  const closed = items.filter((i) => i.status === 'done' || i.status === 'archived')
  const projectTags = Array.from(
    new Set(open.flatMap((item) => item.tags ?? []).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b, 'pt-BR'))

  return (
    <div className="p-3 max-w-3xl mx-auto">
      <div className="flex items-start gap-3 mb-4">
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

      <div className="flex flex-wrap items-center gap-1.5 mb-4 pb-3 border-b border-slate-100">
        <Popover
          trigger={({ toggle }) => {
            const cur = STATUS_OPTIONS.find((o) => o.value === project.status) ?? STATUS_OPTIONS[0]!
            return (
              <button
                type="button"
                onClick={toggle}
                className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 transition-colors"
              >
                <span className={`h-1.5 w-1.5 rounded-full ${cur.dot}`} />
                <span>{cur.label}</span>
                <ChevronIcon />
              </button>
            )
          }}
        >
          {(close) =>
            STATUS_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => { handleStatusChange(o.value); close() }}
                className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-left hover:bg-slate-100 ${
                  project.status === o.value ? 'text-brand-600' : 'text-slate-700'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${o.dot}`} />
                <span>{o.label}</span>
              </button>
            ))
          }
        </Popover>

        <Popover
          trigger={({ toggle }) => (
            <button
              type="button"
              onClick={toggle}
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundColor: project.color ?? '#94a3b8' }}
              />
              <span>Cor</span>
              <ChevronIcon />
            </button>
          )}
        >
          {(close) => (
            <div className="grid grid-cols-4 gap-1 p-1">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => { handleColorChange(c); close() }}
                  className={`h-6 w-6 rounded-full transition-transform hover:scale-110 ${
                    project.color === c ? 'ring-2 ring-offset-1 ring-slate-400' : ''
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          )}
        </Popover>

        <Popover
          trigger={({ toggle }) => (
            <button
              type="button"
              onClick={toggle}
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 transition-colors"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                {viewMode === 'list' ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h10" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 5h5v14H4zM10 5h5v9h-5zM16 5h4v6h-4z" />
                )}
              </svg>
              <span>{viewMode === 'list' ? 'Lista' : 'Kanban'}</span>
              <ChevronIcon />
            </button>
          )}
        >
          {(close) => (
            <>
              {([
                ['list', 'Lista'],
                ['kanban', 'Kanban'],
              ] as const).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => { setViewMode(mode); close() }}
                  className={`block w-full rounded-md px-2 py-1.5 text-xs text-left hover:bg-slate-100 ${
                    viewMode === mode ? 'text-brand-600' : 'text-slate-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </>
          )}
        </Popover>

        <span className="text-xs text-slate-300 ml-auto">
          {open.length} abertos / {closed.length} concluidos
        </span>
      </div>

      {viewMode === 'list' ? (
        <>
          <section className="mb-4">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Itens / {open.length}
            </h2>
            <ItemList
              items={open}
              isLoading={isLoading}
              emptyMessage="Nenhum item neste projeto."
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
