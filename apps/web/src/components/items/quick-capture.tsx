'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { createItem } from '@/hooks/use-items'
import { useProjects } from '@/hooks/use-projects'
import { useUI } from '@/store/ui'
import { useToast } from '@/components/ui/toast'
import { MarkdownEditor } from './markdown-editor'
import { PrioritySelect } from './priority-select'
import type { Priority } from './priority-select'
import type { ItemComplexity } from '@doit/types'

type ItemMode = Extract<ItemComplexity, 'task' | 'note'>

const PRIORITY_SHORTCUT = /(?:^|\s)!P([1-4])\b/i
const PROJECT_SHORTCUT = /(?:^|\s)#([\p{L}\p{N}][\p{L}\p{N}_-]*)/iu
const TAG_SHORTCUT = /(?:^|\s)@([\p{L}\p{N}][\p{L}\p{N}_-]*)/giu

function todayDate() {
  return new Date().toISOString().slice(0, 10)
}

function cleanTitle(value: string) {
  return value
    .replace(/(?:^|\s)!P[1-4]\b/gi, ' ')
    .replace(/(?:^|\s)#[\p{L}\p{N}][\p{L}\p{N}_-]*/giu, ' ')
    .replace(/(?:^|\s)@[\p{L}\p{N}][\p{L}\p{N}_-]*/giu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeToken(value: string) {
  return value.trim().toLocaleLowerCase('pt-BR')
}

export function QuickCapture() {
  const pathname = usePathname()
  const { quickCaptureOpen, setQuickCaptureOpen } = useUI()
  const { toast } = useToast()
  const { projects } = useProjects()
  const [title, setTitle] = useState('')
  const [contentMd, setContentMd] = useState('')
  const [complexity, setComplexity] = useState<ItemMode>('task')
  const [dueDate, setDueDate] = useState('')
  const [projectId, setProjectId] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [priority, setPriority] = useState<Priority>(4)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const activeProjects = projects.filter((p) => p.status !== 'archived')
  const isTodayContext = pathname === '/today'
  const isNote = complexity === 'note'

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
      setComplexity('task')
      setDueDate(isTodayContext ? todayDate() : '')
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setTitle('')
      setContentMd('')
      setComplexity('task')
      setDueDate('')
      setProjectId('')
      setTags([])
      setPriority(4)
    }
  }, [quickCaptureOpen, isTodayContext])

  function applyTitleShortcuts(value: string) {
    setTitle(value)

    const priorityMatch = value.match(PRIORITY_SHORTCUT)
    if (priorityMatch?.[1] && complexity === 'task') {
      setPriority(Number(priorityMatch[1]) as Priority)
    }

    const projectMatch = value.match(PROJECT_SHORTCUT)
    const projectToken = projectMatch?.[1]
    if (projectToken) {
      const wanted = normalizeToken(projectToken.replace(/-/g, ' '))
      const project = activeProjects.find((p) => normalizeToken(p.name) === wanted || normalizeToken(p.name).replace(/\s+/g, '-') === normalizeToken(projectToken))
      if (project) setProjectId(project.id)
    }

    const foundTags = Array.from(value.matchAll(TAG_SHORTCUT)).map((m) => m[1]).filter(Boolean) as string[]
    if (foundTags.length > 0) {
      setTags(Array.from(new Set(foundTags.map((tag) => normalizeToken(tag)))))
    }
  }

  function handleComplexityChange(next: ItemMode) {
    setComplexity(next)
    if (next === 'note') {
      setPriority(4)
    } else if (!dueDate && isTodayContext) {
      setDueDate(todayDate())
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsedTitle = cleanTitle(title)
    if (!parsedTitle) return

    setSaving(true)
    try {
      const inboxContext = !projectId && !dueDate
      await createItem({
        title: parsedTitle,
        complexity,
        status: inboxContext ? 'inbox' : 'todo',
        contentMd: contentMd.trim() || undefined,
        dueDate: dueDate || undefined,
        projectId: projectId || undefined,
        tags,
        priority: complexity === 'task' && priority < 4 ? priority : undefined,
      })
      setQuickCaptureOpen(false)
      toast('Item criado com sucesso', 'success')
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Erro ao criar item.', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (!quickCaptureOpen) return null

  const saveDisabled = !cleanTitle(title) || saving

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[8vh] bg-black/30 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && setQuickCaptureOpen(false)}
    >
      <div
        className={`bg-white shadow-2xl border border-slate-200 overflow-hidden flex flex-col transition-all duration-300 ${
          isNote ? 'w-full max-w-4xl h-[72vh] rounded-2xl' : 'w-full max-w-xl rounded-2xl'
        }`}
      >
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <div className="px-6 pt-5 pb-3 border-b border-slate-100">
            <div className="inline-flex gap-1 p-1 bg-slate-100 rounded-lg mb-4">
              {(['task', 'note'] as ItemMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => handleComplexityChange(mode)}
                  className={`text-[12px] px-3 py-1.5 rounded-md font-semibold transition-all ${
                    complexity === mode
                      ? 'bg-white text-brand-700 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {mode === 'task' ? 'Tarefa' : 'Nota'}
                </button>
              ))}
            </div>

            <input
              ref={inputRef}
              value={title}
              onChange={(e) => applyTitleShortcuts(e.target.value)}
              placeholder={isNote ? 'Titulo da nota' : 'Nome da tarefa'}
              className={`w-full text-slate-900 placeholder:text-slate-300 border-none outline-none bg-transparent font-bold ${
                isNote ? 'text-2xl' : 'text-lg'
              }`}
            />
          </div>

          {isNote && (
            <div className="flex-1 px-6 py-4 overflow-y-auto">
              <MarkdownEditor
                value={contentMd}
                onChange={setContentMd}
                placeholder="Comece a escrever sua nota..."
              />
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50/50">
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="text-xs font-medium border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
            >
              <option value="">Sem projeto</option>
              {activeProjects.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>

            {!isNote && <PrioritySelect value={priority} onChange={setPriority} />}

            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="text-xs font-medium border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-600 bg-white focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
            />

            {tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1">
                {tags.map((tag) => (
                  <span key={tag} className="text-[11px] px-2 py-1 rounded-md bg-slate-100 text-slate-600">
                    @{tag}
                  </span>
                ))}
              </div>
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
                disabled={saveDisabled}
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
