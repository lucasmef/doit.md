'use client'

import { useEffect, useMemo, useState } from 'react'
import type { BulkItemActionInput, Item, ItemRecurrence, ItemStatus } from '@doit/types'
import { STATUS_LABELS } from '@doit/core'
import { bulkUpdateItems, useItems } from '@/hooks/use-items'
import { useProjects } from '@/hooks/use-projects'
import { useUI } from '@/store/ui'
import { useToast } from '@/components/ui/toast'
import { PRIORITY_CONFIG, type Priority } from './priority-select'

type Props = {
  mode: 'menu' | 'bar'
}

const STATUS_OPTIONS: ItemStatus[] = ['inbox', 'todo', 'doing', 'waiting', 'done', 'archived']
const PRIORITIES: Priority[] = [1, 2, 3, 4]
const RECURRENCES: Array<{ value: ItemRecurrence | ''; label: string }> = [
  { value: '', label: 'Sem recorrencia' },
  { value: 'daily', label: 'Todo dia' },
  { value: 'weekdays', label: 'Dias uteis' },
  { value: 'weekly', label: 'Toda semana' },
  { value: 'monthly', label: 'Todo mes' },
  { value: 'yearly', label: 'Todo ano' },
]

function toDateInputValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function dateAfter(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return toDateInputValue(date)
}

function nextWeek() {
  return dateAfter(7)
}

function normalizeTag(value: string) {
  return value.trim().toLocaleLowerCase('pt-BR').replace(/^@/, '')
}

function projectIdOf(project: { id?: string; _id?: string }) {
  return project.id ?? project._id ?? ''
}

function ActionButton({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-8 w-full items-center rounded-[8px] px-2 text-left text-[13px] font-medium transition-colors ${
        danger
          ? 'text-red-600 hover:bg-red-50'
          : 'text-navy-700 hover:bg-surface-selected'
      }`}
    >
      {children}
    </button>
  )
}

function SelectControl({
  value,
  onChange,
  children,
  label,
}: {
  value: string
  onChange: (value: string) => void
  children: React.ReactNode
  label: string
}) {
  return (
    <label className="block">
      <span className="mb-1 block px-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-navy-300">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-full rounded-[8px] border border-ui-border-soft bg-white px-2 text-[12px] text-navy-700 outline-none focus:ring-2 focus:ring-brand-500"
      >
        {children}
      </select>
    </label>
  )
}

function useBulkTargets(mode: Props['mode']) {
  const { contextMenu, selectedItemIds } = useUI()
  if (mode === 'menu' && contextMenu) {
    return selectedItemIds.includes(contextMenu.itemId) && selectedItemIds.length > 1
      ? selectedItemIds
      : [contextMenu.itemId]
  }
  return selectedItemIds
}

function BulkActionsContent({ mode, onDone }: Props & { onDone?: () => void }) {
  const {
    clearSelection,
    closeContextMenu,
  } = useUI()
  const targetIds = useBulkTargets(mode)
  const { toast } = useToast()
  const { items: activeItems } = useItems()
  const { items: archivedItems } = useItems({ status: 'archived' })
  const { projects } = useProjects()
  const [tagInput, setTagInput] = useState('')
  const [customDate, setCustomDate] = useState('')

  const allItems = useMemo(() => {
    const byId = new Map<string, Item>()
    for (const item of [...activeItems, ...archivedItems]) byId.set(item.id, item)
    return [...byId.values()]
  }, [activeItems, archivedItems])

  const targetItems = useMemo(() => targetIds.map((id) => allItems.find((item) => item.id === id)).filter(Boolean) as Item[], [allItems, targetIds])
  const knownTags = useMemo(() => Array.from(new Set(allItems.flatMap((item) => item.tags ?? []).map(normalizeTag))).sort(), [allItems])
  const activeProjects = projects.filter((project) => project.status !== 'archived')

  async function apply(input: Omit<BulkItemActionInput, 'ids'>, message: string) {
    if (targetIds.length === 0) return
    await bulkUpdateItems({ ids: targetIds, ...input }, targetItems)
    toast(message, 'success')
    closeContextMenu()
    if (mode === 'bar') clearSelection()
    onDone?.()
  }

  function applyTag(type: 'add' | 'remove' | 'set', tag: string) {
    const normalized = normalizeTag(tag)
    if (!normalized) return
    setTagInput('')
    void apply({ tagAction: { type, tags: [normalized] } }, 'Tags atualizadas')
  }

  return (
    <div className="space-y-2">
      <div className="border-b border-ui-border-soft pb-2">
        <div className="px-2 py-1 text-[12px] font-semibold text-navy-400">
          {targetIds.length === 1 ? '1 item' : `${targetIds.length} itens`}
        </div>
        <ActionButton onClick={() => void apply({ patch: { status: 'done' } }, 'Itens concluidos')}>
          Concluir
        </ActionButton>
        <ActionButton onClick={() => void apply({ patch: { status: 'archived' } }, 'Itens arquivados')} danger>
          Arquivar
        </ActionButton>
        <ActionButton onClick={() => void apply({ patch: { status: 'todo' } }, 'Itens restaurados')}>
          Restaurar para todo
        </ActionButton>
      </div>

      <div className="grid gap-2">
        <SelectControl
          label="Status"
          value=""
          onChange={(value) => value && void apply({ patch: { status: value as ItemStatus } }, 'Status atualizado')}
        >
          <option value="">Alterar status</option>
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>{STATUS_LABELS[status]}</option>
          ))}
        </SelectControl>

        <SelectControl
          label="Prioridade"
          value=""
          onChange={(value) => value && void apply({ patch: { priority: Number(value) as Priority } }, 'Prioridade atualizada')}
        >
          <option value="">Alterar prioridade</option>
          {PRIORITIES.map((priority) => (
            <option key={priority} value={priority}>
              {PRIORITY_CONFIG[priority].label} - {PRIORITY_CONFIG[priority].title}
            </option>
          ))}
        </SelectControl>

        <SelectControl
          label="Data"
          value=""
          onChange={(value) => {
            if (!value) return
            const dueDate = value === 'today' ? toDateInputValue(new Date()) : value === 'tomorrow' ? dateAfter(1) : value === 'next-week' ? nextWeek() : ''
            void apply({ patch: dueDate ? { dueDate } : { dueDate: '' as never, dueTime: '' as never } }, 'Data atualizada')
          }}
        >
          <option value="">Alterar data</option>
          <option value="today">Hoje</option>
          <option value="tomorrow">Amanha</option>
          <option value="next-week">Proxima semana</option>
          <option value="none">Remover data</option>
        </SelectControl>

        <div className="flex gap-1">
          <input
            type="date"
            value={customDate}
            onChange={(e) => setCustomDate(e.target.value)}
            className="h-8 min-w-0 flex-1 rounded-[8px] border border-ui-border-soft bg-white px-2 text-[12px] text-navy-700 outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            type="button"
            onClick={() => customDate && void apply({ patch: { dueDate: customDate } }, 'Data atualizada')}
            className="h-8 rounded-[8px] bg-navy-900 px-2 text-[12px] font-semibold text-white"
          >
            OK
          </button>
        </div>

        <SelectControl
          label="Recorrencia"
          value=""
          onChange={(value) => value && void apply({ patch: { recurrence: (value === 'none' ? '' : value) as ItemRecurrence | never } }, 'Recorrencia atualizada')}
        >
          <option value="">Alterar recorrencia</option>
          {RECURRENCES.map((option) => (
            <option key={option.value || 'none'} value={option.value || 'none'}>{option.label}</option>
          ))}
        </SelectControl>

        <SelectControl
          label="Pasta"
          value=""
          onChange={(value) => value && void apply({ patch: { folderId: (value === 'inbox' ? '' : value) as never } }, 'Pasta atualizada')}
        >
          <option value="">Mover para pasta</option>
          <option value="inbox">Sem pasta</option>
          {activeProjects.map((project) => {
            const id = projectIdOf(project)
            return <option key={id} value={id}>{project.name}</option>
          })}
        </SelectControl>
      </div>

      <div className="border-t border-ui-border-soft pt-2">
        <div className="flex gap-1">
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="tag"
            className="h-8 min-w-0 flex-1 rounded-[8px] border border-ui-border-soft bg-white px-2 text-[12px] text-navy-700 outline-none placeholder:text-navy-300 focus:ring-2 focus:ring-brand-500"
          />
          <button type="button" onClick={() => applyTag('add', tagInput)} className="h-8 rounded-[8px] bg-surface-selected px-2 text-[12px] font-semibold text-brand-700">
            Add
          </button>
          <button type="button" onClick={() => applyTag('remove', tagInput)} className="h-8 rounded-[8px] bg-surface-soft px-2 text-[12px] font-semibold text-navy-500">
            Rem
          </button>
        </div>
        {knownTags.length > 0 && (
          <div className="mt-1 max-h-20 overflow-y-auto">
            {knownTags.slice(0, 8).map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => applyTag('add', tag)}
                className="mr-1 mt-1 rounded-[8px] bg-surface-soft px-2 py-1 text-[11px] font-medium text-navy-500 hover:bg-surface-selected"
              >
                @{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="border-t border-ui-border-soft pt-2">
        <ActionButton onClick={() => void apply({ patch: { complexity: 'task' } }, 'Itens transformados em tarefa')}>
          Transformar em tarefa
        </ActionButton>
        <ActionButton onClick={() => void apply({ patch: { complexity: 'note' } }, 'Itens transformados em nota')}>
          Transformar em nota
        </ActionButton>
      </div>
    </div>
  )
}

export function ItemContextMenu() {
  const { contextMenu, closeContextMenu } = useUI()
  const [position, setPosition] = useState({ left: 0, top: 0 })

  useEffect(() => {
    if (!contextMenu) return
    const width = 288
    const height = 620
    setPosition({
      left: Math.max(8, Math.min(contextMenu.x, window.innerWidth - width - 8)),
      top: Math.max(8, Math.min(contextMenu.y, window.innerHeight - height - 8)),
    })
  }, [contextMenu])

  useEffect(() => {
    if (!contextMenu) return
    const close = () => closeContextMenu()
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [contextMenu, closeContextMenu])

  if (!contextMenu) return null

  return (
    <div className="fixed inset-0 z-[130]" onMouseDown={closeContextMenu}>
      <div
        className="fixed max-h-[min(620px,calc(100vh-16px))] w-72 overflow-y-auto rounded-xl border border-ui-border bg-white p-2 shadow-2xl"
        style={{ left: position.left, top: position.top }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <BulkActionsContent mode="menu" />
      </div>
    </div>
  )
}

export function BulkActionBar() {
  const { selectedItemIds, clearSelection } = useUI()
  if (selectedItemIds.length <= 1) return null

  return (
    <div className="fixed inset-x-3 bottom-24 z-[110] mx-auto max-w-3xl rounded-xl border border-ui-border bg-white p-2 shadow-2xl lg:bottom-5">
      <div className="flex items-start gap-2">
        <div className="flex h-9 shrink-0 items-center rounded-[9px] bg-surface-selected px-3 text-[13px] font-semibold text-brand-700">
          {selectedItemIds.length} selecionados
        </div>
        <div className="min-w-0 flex-1">
          <BulkActionsContent mode="bar" />
        </div>
        <button
          type="button"
          onClick={clearSelection}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[9px] text-navy-500 hover:bg-surface-soft hover:text-navy-900"
          aria-label="Limpar selecao"
        >
          x
        </button>
      </div>
    </div>
  )
}
