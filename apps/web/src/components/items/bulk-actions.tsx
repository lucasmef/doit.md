'use client'

import { useEffect, useMemo, useState } from 'react'
import type { BulkItemActionInput, Item, ItemRecurrence, ItemStatus } from '@doit/types'
import { STATUS_LABELS, toLocalDateKey } from '@doit/core'
import { bulkUpdateItems, createItem, useItems } from '@/hooks/use-items'
import { useFolders } from '@/hooks/use-folders'
import { useUI } from '@/store/ui'
import { useToast } from '@/components/ui/toast'
import { PRIORITY_CONFIG, type Priority } from './priority-select'
import { FolderGlyph, flattenFolderOptions } from '@/components/folders/folder-options'

type Props = {
  mode: 'menu' | 'bar'
}

const STATUS_OPTIONS: ItemStatus[] = ['inbox', 'todo', 'doing', 'waiting', 'done', 'archived']
const PRIORITIES: Priority[] = [1, 2, 3, 4]
const RECURRENCES: Array<{ value: ItemRecurrence | ''; label: string }> = [
  { value: '', label: 'Sem recorrência' },
  { value: 'daily', label: 'Todos os dias' },
  { value: 'weekdays', label: 'Dias úteis' },
  { value: 'weekly', label: 'Toda semana' },
  { value: 'monthly', label: 'Todo mês' },
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
        danger ? 'text-red-600 hover:bg-red-50' : 'text-navy-700 hover:bg-surface-selected'
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
  const { clearSelection, closeContextMenu } = useUI()
  const targetIds = useBulkTargets(mode)
  const { toast } = useToast()
  const { items: activeItems } = useItems()
  const { items: archivedItems } = useItems({ status: 'archived' })
  const { folders } = useFolders()
  const [tagInput, setTagInput] = useState('')
  const [customDate, setCustomDate] = useState('')

  const allItems = useMemo(() => {
    const byId = new Map<string, Item>()
    for (const item of [...activeItems, ...archivedItems]) byId.set(item.id, item)
    return [...byId.values()]
  }, [activeItems, archivedItems])

  const targetItems = useMemo(
    () => targetIds.map((id) => allItems.find((item) => item.id === id)).filter(Boolean) as Item[],
    [allItems, targetIds],
  )
  const knownTags = useMemo(
    () => Array.from(new Set(allItems.flatMap((item) => item.tags ?? []).map(normalizeTag))).sort(),
    [allItems],
  )
  const folderOptions = useMemo(() => flattenFolderOptions(folders), [folders])

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
        <ActionButton
          onClick={() => void apply({ patch: { status: 'archived' } }, 'Itens arquivados')}
          danger
        >
          Arquivar
        </ActionButton>
        <ActionButton
          onClick={() => void apply({ patch: { status: 'todo' } }, 'Itens restaurados')}
        >
          Restaurar para todo
        </ActionButton>
      </div>

      <div className="grid gap-2">
        <SelectControl
          label="Status"
          value=""
          onChange={(value) =>
            value && void apply({ patch: { status: value as ItemStatus } }, 'Status atualizado')
          }
        >
          <option value="">Alterar status</option>
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </SelectControl>

        <SelectControl
          label="Prioridade"
          value=""
          onChange={(value) =>
            value &&
            void apply({ patch: { priority: Number(value) as Priority } }, 'Prioridade atualizada')
          }
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
            const dueDate =
              value === 'today'
                ? toDateInputValue(new Date())
                : value === 'tomorrow'
                  ? dateAfter(1)
                  : value === 'next-week'
                    ? nextWeek()
                    : ''
            void apply(
              { patch: dueDate ? { dueDate } : { dueDate: '' as never, dueTime: '' as never } },
              'Data atualizada',
            )
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
            onClick={() =>
              customDate && void apply({ patch: { dueDate: customDate } }, 'Data atualizada')
            }
            className="h-8 rounded-[8px] bg-navy-900 px-2 text-[12px] font-semibold text-white"
          >
            OK
          </button>
        </div>

        <SelectControl
          label="Recorrencia"
          value=""
          onChange={(value) =>
            value &&
            void apply(
              { patch: { recurrence: (value === 'none' ? '' : value) as ItemRecurrence | never } },
              'Recorrencia atualizada',
            )
          }
        >
          <option value="">Alterar recorrência</option>
          {RECURRENCES.map((option) => (
            <option key={option.value || 'none'} value={option.value || 'none'}>
              {option.label}
            </option>
          ))}
        </SelectControl>

        <SelectControl
          label="Pasta"
          value=""
          onChange={(value) =>
            value &&
            void apply(
              { patch: { folderId: (value === 'inbox' ? '' : value) as never } },
              'Pasta atualizada',
            )
          }
        >
          <option value="">Mover para pasta</option>
          <option value="inbox">Sem pasta</option>
          {folderOptions.map(({ folder, depth }) => (
            <option key={folder.id} value={folder.id}>
              {`${'  '.repeat(depth)}${folder.name}`}
            </option>
          ))}
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
          <button
            type="button"
            onClick={() => applyTag('add', tagInput)}
            className="h-8 rounded-[8px] bg-surface-selected px-2 text-[12px] font-semibold text-brand-700"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => applyTag('remove', tagInput)}
            className="h-8 rounded-[8px] bg-surface-soft px-2 text-[12px] font-semibold text-navy-500"
          >
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
        <ActionButton
          onClick={() =>
            void apply({ patch: { complexity: 'task' } }, 'Itens transformados em tarefa')
          }
        >
          Transformar em tarefa
        </ActionButton>
        <ActionButton
          onClick={() =>
            void apply({ patch: { complexity: 'note' } }, 'Itens transformados em nota')
          }
        >
          Transformar em nota
        </ActionButton>
      </div>
    </div>
  )
}

function nextSaturday(): string {
  const date = new Date()
  const offset = (6 - date.getDay() + 7) % 7 || 7
  date.setDate(date.getDate() + offset)
  return toLocalDateKey(date)
}

function IconChevron() {
  return (
    <svg
      className="h-3 w-3 text-navy-300"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m9 6 6 6-6 6" />
    </svg>
  )
}

function IconEdit() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.7}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"
      />
    </svg>
  )
}
function IconCalendar() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.7}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8 3v3M16 3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z"
      />
    </svg>
  )
}
function IconFolder() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.7}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"
      />
    </svg>
  )
}
function IconCopy() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.7}
    >
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15V5a2 2 0 0 1 2-2h10" />
    </svg>
  )
}
function IconTrash() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.7}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V6h12Z"
      />
    </svg>
  )
}
function IconCheck() {
  return (
    <svg
      className="ml-auto h-3.5 w-3.5 text-brand-600"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2.2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m5 13 4 4L19 7" />
    </svg>
  )
}

type MenuRowProps = {
  icon?: React.ReactNode
  label: React.ReactNode
  shortcut?: string
  trailing?: React.ReactNode
  onClick?: () => void
  onMouseEnter?: () => void
  danger?: boolean
}
function MenuRow({ icon, label, shortcut, trailing, onClick, onMouseEnter, danger }: MenuRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors ${
        danger ? 'text-red-600 hover:bg-red-50' : 'text-navy-800 hover:bg-surface-soft'
      }`}
    >
      {icon && (
        <span
          className={`flex h-4 w-4 items-center justify-center ${danger ? 'text-red-500' : 'text-navy-400'}`}
        >
          {icon}
        </span>
      )}
      <span className="flex-1 truncate">{label}</span>
      {shortcut && <span className="font-mono text-[10px] text-navy-300">{shortcut}</span>}
      {trailing}
    </button>
  )
}

function MenuSeparator() {
  return <div className="my-1 h-px bg-ui-border-soft" />
}

type Sub = 'folder' | null

const PRIORITY_LABEL: Record<Priority, string> = {
  1: 'Prioridade alta',
  2: 'Prioridade média',
  3: 'Prioridade baixa',
  4: 'Sem prioridade',
}

function ItemContextMenuContent({
  targetItem,
  allTargets,
}: {
  targetItem: Item
  allTargets: Item[]
}) {
  const { closeContextMenu, setSingleSelection } = useUI()
  const { folders } = useFolders()
  const { toast } = useToast()
  const [sub, setSub] = useState<Sub>(null)
  const [showCustomDate, setShowCustomDate] = useState(false)
  const [customDate, setCustomDate] = useState(targetItem.dueDate ?? '')
  const ids = allTargets.map((i) => i.id)
  const single = allTargets.length === 1
  const currentPriority = (targetItem.priority ?? 4) as Priority

  async function applyPatch(patch: BulkItemActionInput['patch'], message: string) {
    if (ids.length === 0) return
    await bulkUpdateItems({ ids, patch }, allTargets)
    toast(message, 'success')
    closeContextMenu()
  }

  async function setDate(value: string | null) {
    if (value === null) {
      await applyPatch({ dueDate: '' as never, dueTime: '' as never }, 'Data removida')
    } else {
      await applyPatch({ dueDate: value }, 'Data atualizada')
    }
  }

  async function setPriority(p: Priority) {
    await applyPatch({ priority: p }, 'Prioridade atualizada')
  }

  async function setFolder(folderId: string | null) {
    await applyPatch(
      { folderId: (folderId ?? '') as never },
      folderId ? 'Movido para pasta' : 'Pasta removida',
    )
  }

  async function duplicate() {
    if (!single) {
      toast('Duplicar disponível para um item por vez.', 'info')
      return
    }
    await createItem({
      title: targetItem.title,
      complexity: targetItem.complexity,
      contentMd: targetItem.contentMd,
      priority: targetItem.priority,
      dueDate: targetItem.dueDate,
      dueTime: targetItem.dueTime,
      recurrence: targetItem.recurrence,
      folderId: targetItem.folderId,
      areaId: targetItem.areaId,
      tags: targetItem.tags,
      status: 'todo',
    })
    toast('Item duplicado', 'success')
    closeContextMenu()
  }

  function openEdit() {
    setSingleSelection(targetItem.id)
    closeContextMenu()
  }

  if (sub === 'folder') {
    return (
      <div className="min-w-[240px]">
        <MenuRow icon={<IconChevron />} label="Voltar" onClick={() => setSub(null)} />
        <MenuSeparator />
        <MenuRow
          icon={<IconFolder />}
          label="Sem pasta"
          onClick={() => setFolder(null)}
          trailing={!targetItem.folderId ? <IconCheck /> : null}
        />
        <div className="max-h-64 overflow-y-auto">
          {folders.length === 0 && (
            <p className="px-2 py-3 text-center font-mono text-[11px] text-navy-300">
              Nenhuma pasta
            </p>
          )}
          {flattenFolderOptions(folders).map(({ folder: f, depth }) => (
            <MenuRow
              key={f.id}
              icon={<FolderGlyph className="h-4 w-4" />}
              label={<span style={{ paddingLeft: depth ? depth * 12 : 0 }}>{f.name}</span>}
              onClick={() => setFolder(f.id)}
              trailing={targetItem.folderId === f.id ? <IconCheck /> : null}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-w-[240px]">
      {!single && (
        <div className="px-2 pb-1 pt-0.5 text-[11px] font-semibold uppercase tracking-wide text-navy-300">
          {ids.length} itens
        </div>
      )}

      {/* Prioridade inline */}
      <div className="px-2 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wide text-navy-300">
        Prioridade
      </div>
      <div className="mb-1 flex items-center gap-1 px-1.5">
        {([1, 2, 3, 4] as Priority[]).map((p) => {
          const cfg = PRIORITY_CONFIG[p]
          const isActive = currentPriority === p
          return (
            <button
              key={p}
              type="button"
              title={PRIORITY_LABEL[p]}
              onClick={() => setPriority(p)}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-md border transition-colors ${
                isActive
                  ? 'border-brand-300 bg-surface-selected'
                  : 'border-ui-border-soft bg-white hover:bg-surface-soft'
              }`}
            >
              {p < 4 ? (
                <svg width={14} height={14} viewBox="0 0 24 24" fill={cfg.flagFill} aria-hidden="true">
                  <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                  <line x1="4" y1="22" x2="4" y2="15" stroke={cfg.flagFill} strokeWidth="2" strokeLinecap="round" />
                </svg>
              ) : (
                <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="text-navy-400">
                  <path d="M5 21V5m0 0h11l-2 4 2 4H5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          )
        })}
      </div>

      {/* Data inline */}
      <div className="px-2 pb-1 pt-1.5 text-[10px] font-semibold uppercase tracking-wide text-navy-300">
        Data
      </div>
      <MenuRow icon={<IconCalendar />} label="Hoje" onClick={() => setDate(toLocalDateKey())} />
      <MenuRow
        icon={<IconCalendar />}
        label="Amanhã"
        onClick={() => {
          const d = new Date()
          d.setDate(d.getDate() + 1)
          setDate(toLocalDateKey(d))
        }}
      />
      <MenuRow
        icon={<IconCalendar />}
        label="Próxima semana"
        onClick={() => {
          const d = new Date()
          d.setDate(d.getDate() + 7)
          setDate(toLocalDateKey(d))
        }}
      />
      <MenuRow
        icon={<IconCalendar />}
        label="Final de semana"
        onClick={() => setDate(nextSaturday())}
      />
      {targetItem.dueDate && (
        <MenuRow icon={<IconCalendar />} label="Sem data" onClick={() => setDate(null)} />
      )}
      {showCustomDate ? (
        <div className="flex gap-1 px-1 py-1">
          <input
            type="date"
            autoFocus
            value={customDate}
            onChange={(e) => setCustomDate(e.target.value)}
            className="h-8 min-w-0 flex-1 rounded-md border border-ui-border-soft bg-white px-2 text-[12px] text-navy-700 outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            type="button"
            onClick={() => customDate && setDate(customDate)}
            className="h-8 rounded-md bg-brand-600 px-2 text-[12px] font-semibold text-white"
          >
            OK
          </button>
        </div>
      ) : (
        <MenuRow
          icon={<IconCalendar />}
          label="Escolher data..."
          onClick={() => setShowCustomDate(true)}
        />
      )}

      <MenuSeparator />
      <MenuRow icon={<IconEdit />} label="Editar" shortcut="E" onClick={openEdit} />
      <MenuRow
        icon={<IconFolder />}
        label="Mover para pasta"
        trailing={<IconChevron />}
        onClick={() => setSub('folder')}
      />
      <MenuRow icon={<IconCopy />} label="Duplicar" onClick={duplicate} />
      <MenuSeparator />
      <MenuRow
        icon={<IconTrash />}
        label="Arquivar"
        onClick={() => applyPatch({ status: 'archived' }, 'Item arquivado')}
      />
    </div>
  )
}

export function ItemContextMenu() {
  const { contextMenu, closeContextMenu, selectedItemIds } = useUI()
  const { items: activeItems } = useItems()
  const { items: archivedItems } = useItems({ status: 'archived' })
  const allItems = useMemo(() => {
    const map = new Map<string, Item>()
    for (const item of [...activeItems, ...archivedItems]) map.set(item.id, item)
    return map
  }, [activeItems, archivedItems])
  const [position, setPosition] = useState({ left: 0, top: 0 })

  useEffect(() => {
    if (!contextMenu) return
    const width = 260
    const height = 460
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

  const targetItem = allItems.get(contextMenu.itemId)
  if (!targetItem) return null

  const ids =
    selectedItemIds.includes(contextMenu.itemId) && selectedItemIds.length > 1
      ? selectedItemIds
      : [contextMenu.itemId]
  const targets = ids.map((id) => allItems.get(id)).filter(Boolean) as Item[]

  return (
    <div className="fixed inset-0 z-[130]" onMouseDown={closeContextMenu}>
      <div
        className="fixed max-h-[min(420px,calc(100vh-16px))] overflow-y-auto rounded-xl border border-ui-border bg-white p-1 shadow-2xl"
        style={{ left: position.left, top: position.top }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <ItemContextMenuContent
          targetItem={targetItem}
          allTargets={targets.length > 0 ? targets : [targetItem]}
        />
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
