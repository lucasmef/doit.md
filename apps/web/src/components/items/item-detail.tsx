'use client'

import { useState, useEffect, useRef } from 'react'
import { useItem, updateItem, archiveItem } from '@/hooks/use-items'
import { useProjects } from '@/hooks/use-projects'
import { useAreas } from '@/hooks/use-areas'
import { useUI } from '@/store/ui'
import { ComplexitySelect } from './complexity-select'
import { StatusSelect } from './status-select'
import { ItemVersions } from './item-versions'
import { MarkdownEditor } from './markdown-editor'
import { PrioritySelect } from './priority-select'
import type { Priority } from './priority-select'
import { useToast } from '@/components/ui/toast'
import type { ItemComplexity, ItemStatus } from '@doit/types'

function formatDueDate(dateStr: string): string {
  const today = new Date().toISOString().slice(0, 10)
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  if (dateStr === today) return 'Hoje'
  if (dateStr === tomorrow) return 'Amanhã'
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
}

export function ItemDetail() {
  const { selectedItemId, setSelectedItemId } = useUI()
  const { item, isLoading } = useItem(selectedItemId)
  const { projects } = useProjects()
  const { areas } = useAreas()
  const { toast } = useToast()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [priority, setPriority] = useState<Priority>(4)
  const [dirty, setDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [creatingEvent, setCreatingEvent] = useState(false)

  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (item) {
      setTitle(item.title)
      setContent(item.contentMd ?? '')
      setTags(item.tags.join(', '))
      setDueDate(item.dueDate ?? '')
      setPriority((item.priority as Priority) ?? 4)
      setDirty(false)
      setIsSaving(false)
    }
  }, [item?.id])

  function scheduleAutosave(patch: Parameters<typeof updateItem>[1]) {
    if (!selectedItemId) return
    if (saveTimeout.current) clearTimeout(saveTimeout.current)
    setDirty(true)
    setIsSaving(true)
    saveTimeout.current = setTimeout(async () => {
      try {
        await updateItem(selectedItemId, patch)
        setDirty(false)
      } catch {
        toast('Erro ao salvar alteracoes.', 'error')
      } finally {
        setIsSaving(false)
      }
    }, 800)
  }

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setTitle(e.target.value)
    scheduleAutosave({ title: e.target.value })
  }

  function handleContentChange(value: string) {
    setContent(value)
    scheduleAutosave({ contentMd: value })
  }

  function handleComplexityChange(complexity: ItemComplexity) {
    if (!selectedItemId) return
    if (complexity === 'note') setPriority(4)
    updateItem(selectedItemId, { complexity })
  }

  function handleStatusChange(status: ItemStatus) {
    if (!selectedItemId) return
    updateItem(selectedItemId, { status })
  }

  function handleTagsBlur() {
    if (!selectedItemId) return
    const parsed = tags.split(',').map((t) => t.trim()).filter(Boolean)
    updateItem(selectedItemId, { tags: parsed })
  }

  function handleDueDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    setDueDate(e.target.value)
    scheduleAutosave({ dueDate: e.target.value || undefined })
  }

  function handlePriorityChange(p: Priority) {
    setPriority(p)
    if (!selectedItemId) return
    updateItem(selectedItemId, { priority: p === 4 ? undefined : p })
  }

  function handleProjectChange(projectId: string) {
    if (!selectedItemId) return
    updateItem(selectedItemId, { projectId: projectId || undefined })
  }

  function handleAreaChange(areaId: string) {
    if (!selectedItemId) return
    updateItem(selectedItemId, { areaId: areaId || undefined })
  }

  async function handleArchive() {
    if (!selectedItemId) return
    await archiveItem(selectedItemId)
    setSelectedItemId(null)
  }

  async function handleCreateCalendarEvent() {
    if (!selectedItemId) return
    setCreatingEvent(true)
    try {
      const res = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: selectedItemId }),
      })
      if (res.ok) {
        toast('Evento criado no Google Calendar!', 'success')
      } else {
        const { error } = await res.json() as { error: string }
        toast(error === 'Google account not connected' ? 'Conecte o Google Calendar em Configurações.' : 'Erro ao criar evento.', 'error')
      }
    } catch {
      toast('Erro ao criar evento.', 'error')
    } finally {
      setCreatingEvent(false)
    }
  }

  if (!selectedItemId) return null

  if (isLoading || !item) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="bg-white rounded-2xl p-8 animate-pulse">
          <div className="h-6 bg-slate-100 rounded mb-4 w-48" />
          <div className="h-4 bg-slate-100 rounded mb-2 w-32" />
        </div>
      </div>
    )
  }

  const isNote = item.complexity === 'note'

  return (
    <div 
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && setSelectedItemId(null)}
    >
      <div 
        className={`bg-white shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ${
          isNote 
            ? 'w-full h-full max-w-5xl rounded-2xl' 
            : 'w-full max-w-lg rounded-2xl max-h-[85vh]'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ui-border-soft shrink-0">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSelectedItemId(null)}
              className="p-2 -ml-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <span className="text-sm font-medium text-slate-500">
              {isNote ? 'Nota' : 'Tarefa'}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-400">{dirty || isSaving ? 'Salvando...' : 'Salvo'}</span>
            <button 
              onClick={handleArchive} 
              className="text-xs font-semibold text-slate-400 hover:text-red-500 transition-colors px-2 py-1"
            >
              Arquivar
            </button>
          </div>
        </div>

        <div className={`flex-1 overflow-y-auto ${isNote ? 'flex flex-col lg:flex-row' : ''}`}>
          {/* Main Content Area */}
          <div className={`p-6 space-y-6 ${isNote ? 'flex-1 lg:border-r border-ui-border-soft' : ''}`}>
            {/* Título */}
            <input
              value={title}
              onChange={handleTitleChange}
              placeholder="Título"
              className={`w-full font-bold text-slate-900 border-none outline-none bg-transparent placeholder:text-slate-300 ${
                isNote ? 'text-3xl' : 'text-xl'
              }`}
            />

            {/* Editor Markdown */}
            <div className="min-h-[200px]">
              <label className="text-xs text-slate-400 font-medium block mb-2">Conteúdo</label>
              <MarkdownEditor value={content} onChange={handleContentChange} />
            </div>
          </div>

          {/* Sidebar Properties (only visible or layouted differently for notes) */}
          <div className={`${isNote ? 'w-full lg:w-80 p-6 space-y-6 bg-slate-50/50' : 'px-6 pb-6 space-y-4'}`}>
            {/* Status */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-slate-500">Status</label>
              <StatusSelect value={item.status} onChange={handleStatusChange} />
            </div>

            {!isNote && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-slate-500">Prioridade</label>
                <PrioritySelect value={priority} onChange={handlePriorityChange} />
              </div>
            )}

            {/* Complexidade */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-slate-500">Complexidade</label>
              <ComplexitySelect value={item.complexity} onChange={handleComplexityChange} />
            </div>

            {/* Prazo (Mainly for tasks) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-slate-500">Prazo</label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dueDate}
                  onChange={handleDueDateChange}
                  className="flex-1 text-[14px] border border-ui-border-soft rounded-[10px] px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
                />
                {dueDate && (
                  <span className={`text-[13px] font-medium shrink-0 ${
                    dueDate < new Date().toISOString().slice(0, 10) ? 'text-red-500' : 'text-brand-600'
                  }`}>
                    {formatDueDate(dueDate)}
                  </span>
                )}
              </div>
              {dueDate && (
                <button
                  onClick={handleCreateCalendarEvent}
                  disabled={creatingEvent}
                  className="flex items-center gap-1.5 text-[12px] text-brand-600 hover:text-brand-700 disabled:opacity-50 transition-colors w-fit"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <path d="M16 2v4M8 2v4M3 10h18" />
                    <path d="M12 14v4M10 16h4" strokeLinecap="round" />
                  </svg>
                  {creatingEvent ? 'Criando...' : 'Google Calendar'}
                </button>
              )}
            </div>

            {/* Projeto e Área */}
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-slate-500">Projeto</label>
                <select
                  value={item.projectId ?? ''}
                  onChange={(e) => handleProjectChange(e.target.value)}
                  className="w-full text-[14px] border border-ui-border-soft rounded-[10px] px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
                >
                  <option value="">Nenhum</option>
                  {projects.filter((p) => p.status !== 'archived').map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-slate-500">Área</label>
                <select
                  value={item.areaId ?? ''}
                  onChange={(e) => handleAreaChange(e.target.value)}
                  className="w-full text-[14px] border border-ui-border-soft rounded-[10px] px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
                >
                  <option value="">Nenhuma</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-slate-500">Etiquetas</label>
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                onBlur={handleTagsBlur}
                placeholder="ex: trabalho, urgente"
                className="w-full text-[14px] border border-ui-border-soft rounded-[10px] px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
              />
            </div>

            {/* Versions only in Note mode or at the bottom */}
            {isNote && (
              <div className="pt-4 border-t border-slate-100">
                <ItemVersions itemId={item.id} />
              </div>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="px-6 py-3 bg-slate-50 border-t border-ui-border-soft text-[10px] text-slate-400 flex justify-between">
          <span>Criado em {new Date(item.createdAt).toLocaleString('pt-BR')}</span>
          <span>Atualizado em {new Date(item.updatedAt).toLocaleString('pt-BR')}</span>
        </div>
      </div>
    </div>
  )
}
