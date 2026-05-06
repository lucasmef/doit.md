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
    }
  }, [item?.id])

  function scheduleAutosave(patch: Parameters<typeof updateItem>[1]) {
    if (!selectedItemId) return
    if (saveTimeout.current) clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(() => updateItem(selectedItemId, patch), 800)
    setDirty(true)
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

  if (!selectedItemId) {
    return (
      <div className="flex-1 hidden lg:flex items-center justify-center text-sm text-slate-400 border-l border-slate-200">
        Selecione um item para ver o detalhe
      </div>
    )
  }

  if (isLoading || !item) {
    return (
      <>
        {/* Mobile overlay backdrop */}
        <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setSelectedItemId(null)} />
        <div className="fixed bottom-0 left-0 right-0 z-50 lg:static w-full lg:w-80 xl:w-96 lg:shrink-0 flex flex-col border-t lg:border-t-0 lg:border-l border-slate-200 p-6 bg-white lg:bg-surface-window rounded-t-2xl lg:rounded-none max-h-[85dvh] lg:max-h-none">
          <div className="h-6 bg-slate-100 rounded animate-pulse mb-4 w-3/4" />
          <div className="h-4 bg-slate-100 rounded animate-pulse mb-2" />
          <div className="h-4 bg-slate-100 rounded animate-pulse w-2/3" />
        </div>
      </>
    )
  }

  return (
    <>
      {/* Mobile overlay backdrop */}
      <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setSelectedItemId(null)} />
      <aside className="fixed bottom-0 left-0 right-0 z-50 lg:static w-full lg:w-[380px] xl:w-[420px] lg:shrink-0 flex flex-col border-t lg:border-t-0 lg:border-l border-ui-border overflow-y-auto bg-white lg:bg-surface-window rounded-t-2xl lg:rounded-none max-h-[85dvh] lg:max-h-none">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 shrink-0">
        <span className="text-xs text-slate-400">{dirty ? 'Salvando...' : 'Salvo'}</span>
        <div className="flex items-center gap-3">
          <button onClick={handleArchive} className="text-xs text-slate-400 hover:text-red-500 transition-colors">
            Arquivar
          </button>
          <button onClick={() => setSelectedItemId(null)} className="text-slate-400 hover:text-slate-700">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 px-6 pb-6 space-y-6 overflow-y-auto">
        {/* Título */}
        <input
          value={title}
          onChange={handleTitleChange}
          placeholder="Título do item"
          className="w-full text-[22px] font-bold text-slate-900 border-none outline-none bg-transparent placeholder:text-slate-300"
        />

        <div className="space-y-4">
          {/* Status */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-slate-500">Status</label>
            <StatusSelect value={item.status} onChange={handleStatusChange} />
          </div>

          {/* Prioridade */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-slate-500">Prioridade</label>
            <PrioritySelect value={priority} onChange={handlePriorityChange} />
          </div>

          {/* Complexidade */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-slate-500">Complexidade</label>
            <ComplexitySelect value={item.complexity} onChange={handleComplexityChange} />
          </div>

          {/* Prazo */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-slate-500">Data</label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dueDate}
                onChange={handleDueDateChange}
                className="flex-1 text-[14px] border border-ui-border-soft rounded-[10px] px-3 py-2 bg-surface-soft text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
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
                {creatingEvent ? 'Criando...' : 'Criar evento no Google Calendar'}
              </button>
            )}
          </div>

          {/* Projeto */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-slate-500">Projeto</label>
            <select
              value={item.projectId ?? ''}
              onChange={(e) => handleProjectChange(e.target.value)}
              className="w-full text-[14px] border border-ui-border-soft rounded-[10px] px-3 py-2 bg-surface-soft text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
            >
              <option value="">Sem projeto</option>
              {projects.filter((p) => p.status !== 'archived').map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Área */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-slate-500">Área</label>
            <select
              value={item.areaId ?? ''}
              onChange={(e) => handleAreaChange(e.target.value)}
              className="w-full text-[14px] border border-ui-border-soft rounded-[10px] px-3 py-2 bg-surface-soft text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
            >
              <option value="">Sem área</option>
              {areas.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          {/* Tags */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-medium text-slate-500">Etiquetas</label>
            <input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              onBlur={handleTagsBlur}
              placeholder="ex: trabalho, urgente"
              className="w-full text-[14px] border border-ui-border-soft rounded-[10px] px-3 py-2 bg-surface-soft text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
            />
          </div>
        </div>

        <div className="border-t border-ui-border-soft" />

        {/* Editor Markdown */}
        <div>
          <label className="text-xs text-slate-400 font-medium block mb-2">Conteúdo</label>
          <MarkdownEditor value={content} onChange={handleContentChange} />
        </div>

        {/* Histórico de versões */}
        <div className="border-t border-slate-100 pt-3">
          <ItemVersions itemId={item.id} />
        </div>

        {/* Metadados */}
        <div className="text-[10px] text-slate-300 space-y-0.5 pb-4">
          <p>ID: {item.id}</p>
          <p>Criado: {new Date(item.createdAt).toLocaleString('pt-BR')}</p>
          <p>Atualizado: {new Date(item.updatedAt).toLocaleString('pt-BR')}</p>
        </div>
      </div>
    </aside>
    </>
  )
}
