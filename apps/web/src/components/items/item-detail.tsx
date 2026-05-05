'use client'

import { useState, useEffect, useRef } from 'react'
import { useItem, updateItem, archiveItem } from '@/hooks/use-items'
import { useUI } from '@/store/ui'
import { ComplexitySelect } from './complexity-select'
import { StatusSelect } from './status-select'
import type { ItemComplexity, ItemStatus } from '@clarity/types'

export function ItemDetail() {
  const { selectedItemId, setSelectedItemId } = useUI()
  const { item, isLoading } = useItem(selectedItemId)

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [dirty, setDirty] = useState(false)

  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (item) {
      setTitle(item.title)
      setContent(item.contentMd ?? '')
      setTags(item.tags.join(', '))
      setDueDate(item.dueDate ?? '')
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

  function handleContentChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setContent(e.target.value)
    scheduleAutosave({ contentMd: e.target.value })
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
    const parsed = tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
    updateItem(selectedItemId, { tags: parsed })
  }

  function handleDueDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    setDueDate(e.target.value)
    scheduleAutosave({ dueDate: e.target.value || undefined })
  }

  async function handleArchive() {
    if (!selectedItemId) return
    await archiveItem(selectedItemId)
    setSelectedItemId(null)
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
      <div className="flex-1 hidden lg:block border-l border-slate-200 p-6">
        <div className="h-6 bg-slate-100 rounded animate-pulse mb-4 w-3/4" />
        <div className="h-4 bg-slate-100 rounded animate-pulse mb-2" />
        <div className="h-4 bg-slate-100 rounded animate-pulse w-2/3" />
      </div>
    )
  }

  return (
    <aside className="w-80 xl:w-96 shrink-0 hidden lg:flex flex-col border-l border-slate-200 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <span className="text-xs text-slate-400">
          {dirty ? 'Salvando...' : 'Salvo'}
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={handleArchive}
            className="text-xs text-slate-400 hover:text-red-500 transition-colors"
          >
            Arquivar
          </button>
          <button
            onClick={() => setSelectedItemId(null)}
            className="text-slate-400 hover:text-slate-700"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 space-y-4">
        {/* Título */}
        <input
          value={title}
          onChange={handleTitleChange}
          placeholder="Título do item"
          className="w-full text-lg font-semibold text-slate-900 border-none outline-none resize-none bg-transparent placeholder:text-slate-300"
        />

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-2">
          <ComplexitySelect value={item.complexity} onChange={handleComplexityChange} />
          <StatusSelect value={item.status} onChange={handleStatusChange} />
        </div>

        {/* Data */}
        <div>
          <label className="text-xs text-slate-400 font-medium block mb-1">Prazo</label>
          <input
            type="date"
            value={dueDate}
            onChange={handleDueDateChange}
            className="text-sm border border-slate-200 rounded-md px-2 py-1 text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="text-xs text-slate-400 font-medium block mb-1">Tags</label>
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            onBlur={handleTagsBlur}
            placeholder="ex: trabalho, urgente"
            className="w-full text-sm border border-slate-200 rounded-md px-2 py-1.5 text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        {/* Divisor */}
        <div className="border-t border-slate-100" />

        {/* Editor Markdown */}
        <div>
          <label className="text-xs text-slate-400 font-medium block mb-2">Conteúdo</label>
          <textarea
            value={content}
            onChange={handleContentChange}
            placeholder="Escreva em Markdown..."
            rows={16}
            className="w-full text-sm font-mono text-slate-700 border border-slate-200 rounded-lg px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500 leading-relaxed"
          />
        </div>

        {/* Metadados */}
        <div className="text-[10px] text-slate-300 space-y-0.5">
          <p>ID: {item.id}</p>
          <p>Criado: {new Date(item.createdAt).toLocaleString('pt-BR')}</p>
          <p>Atualizado: {new Date(item.updatedAt).toLocaleString('pt-BR')}</p>
        </div>
      </div>
    </aside>
  )
}
