'use client'

import { Fragment, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import type { Folder, Item, ItemComplexity, ItemStatus } from '@doit/types'
import {
  buildFolderTree,
  createFolder,
  deleteFolder,
  updateFolder,
  useFolders,
  type FolderTreeNode,
} from '@/hooks/use-folders'
import { useItems, bulkUpdateItems, updateItem } from '@/hooks/use-items'
import { usePreferences } from '@/hooks/use-preferences'
import { useUI } from '@/store/ui'
import { useEscapeClose } from '@/hooks/use-escape-close'
import { useLongPress } from '@/hooks/use-long-press'
import { useDialog } from '@/components/ui/dialog'
import { AgentsEditorModal } from '@/components/agents/agents-editor-modal'
import { flattenFolderOptions } from '@/components/folders/folder-options'
import { PRIORITY_CONFIG, PriorityFlag, type Priority } from '@/components/items/priority-select'
import { calculateChecklistProgress } from '@/lib/note-headings'

type SortKey = 'manual' | 'updated' | 'created' | 'alpha' | 'type' | 'priority'

const SORT_OPTIONS: Array<{ key: SortKey; label: string; hint: string }> = [
  { key: 'manual', label: 'Manual', hint: 'ordem' },
  { key: 'updated', label: 'Atualização', hint: 'recente' },
  { key: 'created', label: 'Criação', hint: 'novo' },
  { key: 'alpha', label: 'Alfabética', hint: 'A-Z' },
  { key: 'type', label: 'Tipo', hint: 'nota/tarefa' },
  { key: 'priority', label: 'Prioridade', hint: 'alta' },
]

const COMPLEXITY_ORDER: Record<ItemComplexity, number> = {
  note: 0,
  task: 1,
  capture: 2,
  document: 3,
  project: 4,
}

const STATUS_LABEL: Record<ItemStatus, string> = {
  inbox: 'Inbox',
  todo: 'A fazer',
  doing: 'Em progresso',
  waiting: 'Aguardando',
  done: 'Concluído',
  archived: 'Arquivado',
}

const LARGE_NOTE_CHARS = 220

function isActiveItem(item: Item): boolean {
  return item.status !== 'archived' && item.status !== 'done'
}

function stripMarkdown(content: string | undefined): string {
  return (content ?? '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/!\[[^\]]*]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)]\([^)]*\)/g, '$1')
    .replace(/[`*_>#-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function snippet(item: Item, max: number): string {
  const flat = stripMarkdown(item.contentMd)
  if (!flat) return ''
  return flat.length > max ? `${flat.slice(0, max).trimEnd()}…` : flat
}

function isLargeNote(item: Item): boolean {
  return item.complexity === 'note' && stripMarkdown(item.contentMd).length > LARGE_NOTE_CHARS
}

function formatRelative(iso: string): string {
  const time = new Date(iso).getTime()
  if (!Number.isFinite(time)) return ''
  const diff = Date.now() - time
  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour
  if (diff < minute) return 'agora'
  if (diff < hour) return `${Math.floor(diff / minute)}min`
  if (diff < day) return `${Math.floor(diff / hour)}h`
  if (diff < day * 7) return `${Math.floor(diff / day)}d`
  return new Date(iso).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
}

function dueLabel(item: Item): string | null {
  if (!item.dueDate) return null
  const base = new Date(`${item.dueDate}T12:00:00`).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'short',
  })
  return item.dueTime ? `${base} ${item.dueTime}` : base
}

function sortItems(items: Item[], key: SortKey): Item[] {
  const list = items.slice()
  switch (key) {
    case 'updated':
      return list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    case 'created':
      return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    case 'alpha':
      return list.sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'))
    case 'type':
      return list.sort(
        (a, b) =>
          (COMPLEXITY_ORDER[a.complexity] ?? 9) - (COMPLEXITY_ORDER[b.complexity] ?? 9) ||
          a.title.localeCompare(b.title, 'pt-BR'),
      )
    case 'priority':
      return list.sort((a, b) => (a.priority ?? 5) - (b.priority ?? 5) || b.updatedAt.localeCompare(a.updatedAt))
    case 'manual':
    default:
      return list.sort(
        (a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER) ||
          b.updatedAt.localeCompare(a.updatedAt),
      )
  }
}

function buildBreadcrumb(folders: Folder[], id: string | null): Folder[] {
  if (!id) return []
  const map = new Map(folders.map((f) => [f.id, f]))
  const path: Folder[] = []
  let current = map.get(id)
  while (current) {
    path.unshift(current)
    current = current.parentId ? map.get(current.parentId) : undefined
  }
  return path
}

function findNode(nodes: FolderTreeNode[], id: string): FolderTreeNode | null {
  for (const node of nodes) {
    if (node.id === id) return node
    const child = findNode(node.children, id)
    if (child) return child
  }
  return null
}

function collectExpandableFolderIds(nodes: FolderTreeNode[], acc: string[] = []): string[] {
  for (const node of nodes) {
    if (node.children.length > 0) {
      acc.push(node.id)
      collectExpandableFolderIds(node.children, acc)
    }
  }
  return acc
}

function FolderGlyph({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
    </svg>
  )
}

function StarGlyph({ filled = false, className = 'h-4 w-4' }: { filled?: boolean; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3.8 2.6 5.2 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8L12 3.8Z" />
    </svg>
  )
}

function NoteGlyph({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 3.5h7l3 3v14H7z" />
      <path d="M14 3.5v4h4M9.5 12h5M9.5 15.5h5" />
    </svg>
  )
}

function TaskGlyph({ done, className = 'h-4 w-4' }: { done?: boolean; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="4" width="16" height="16" rx="4" />
      {done && <path d="m8.5 12 2.5 2.5L16 9" />}
    </svg>
  )
}

// Ícone discreto por tipo para a lista (ID 013): nota vs tarefa/evento.
function ItemTypeGlyph({ item, className = 'h-4 w-4' }: { item: Item; className?: string }) {
  return item.complexity === 'note' ? <NoteGlyph className={className} /> : <TaskGlyph done={item.status === 'done'} className={className} />
}

function ClockGlyph({ className = 'h-3 w-3' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  )
}

function NoteProgressBar({ percent, completed }: { percent: number; completed: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${completed ? 'text-teal-700' : 'text-brand-600'}`}>
      <span className={`relative h-1.5 w-10 overflow-hidden rounded-full ${completed ? 'bg-teal-200/60' : 'bg-brand-500/15'}`}>
        <span
          className={`absolute inset-y-0 left-0 rounded-full ${completed ? 'bg-teal-500' : 'bg-brand-500'}`}
          style={{ width: `${percent}%` }}
        />
      </span>
      <span className="font-mono text-[10px] font-extrabold">{percent}%</span>
    </span>
  )
}

// ID 023: tarefa aberta usa tom neutro (checkbox vazio, não verde); verde/teal só quando concluída.
function priorityTone(priority: Priority) {
  const cfg = PRIORITY_CONFIG[priority]
  return `${cfg.border} ${cfg.color} ${priority === 1 ? 'bg-red-50' : priority === 2 ? 'bg-orange-50' : 'bg-blue-50'}`
}

function itemPriority(item: Item): Priority {
  return ((item.priority as Priority | undefined) ?? 4) as Priority
}

function itemGlyphTone(item: Item): string {
  if (item.complexity === 'note') return 'bg-brand-500/10 text-brand-600'
  if (item.status === 'done') return 'border border-brand-600 bg-brand-600 text-white'
  const priority = itemPriority(item)
  if (priority < 4) return `border ${priorityTone(priority)}`
  return 'border border-brand-500/70 bg-white text-brand-600'
}

// ----- Sidebar tree -----

function TreeRow({
  node,
  depth,
  selectedId,
  expanded,
  counts,
  onSelect,
  onToggle,
  onMenu,
}: {
  node: FolderTreeNode
  depth: number
  selectedId: string | null
  expanded: Set<string>
  counts: Map<string, number>
  onSelect: (id: string) => void
  onToggle: (id: string) => void
  onMenu: (id: string, x: number, y: number) => void
}) {
  const hasChildren = node.children.length > 0
  const isOpen = expanded.has(node.id)
  const active = node.id === selectedId
  const { longPressProps, consumeClick } = useLongPress({
    onLongPress: ({ clientX, clientY }) => onMenu(node.id, clientX, clientY),
  })
  return (
    <>
      <div
        className={`flex min-h-[42px] cursor-pointer touch-pan-y select-none items-center gap-2 rounded-[15px] py-1.5 pr-2 transition-colors [-webkit-touch-callout:none] ${
          active ? 'bg-brand-500/10 shadow-[0_0_0_1px_rgba(47,107,255,.18)_inset]' : 'hover:bg-white/60'
        }`}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={() => { if (consumeClick()) return; onSelect(node.id) }}
        {...longPressProps}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            if (hasChildren) onToggle(node.id)
          }}
          className={`flex h-5 w-5 shrink-0 items-center justify-center font-mono text-[10px] ${hasChildren ? 'text-navy-500' : 'text-transparent'}`}
          aria-label={hasChildren ? (isOpen ? 'Recolher' : 'Expandir') : undefined}
        >
          {hasChildren ? (isOpen ? '▾' : '▸') : ''}
        </button>
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[11px] ${active ? 'bg-[linear-gradient(135deg,#2F6BFF,#7B5BFF)] text-white' : 'bg-brand-500/10 text-brand-600'}`}>
          <FolderGlyph className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-bold text-navy-900">{node.name}</span>
          <span className="block truncate font-mono text-[9.5px] text-navy-500">
            {hasChildren ? `${node.children.length} subpasta${node.children.length === 1 ? '' : 's'}` : 'pasta'}
          </span>
        </span>
        <span className="shrink-0 rounded-full bg-navy-900/[0.06] px-1.5 py-0.5 font-mono text-[10px] font-bold text-navy-500">
          {counts.get(node.id) ?? 0}
        </span>
      </div>
      {hasChildren && isOpen
        ? node.children.map((child) => (
            <TreeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              expanded={expanded}
              counts={counts}
              onSelect={onSelect}
              onToggle={onToggle}
              onMenu={onMenu}
            />
          ))
        : null}
    </>
  )
}

// Linha plana de pasta na sidebar (Destacadas / busca) com menu de ações (ID 033).
function SidebarFolderRow({
  folder,
  selectedId,
  count,
  pinned,
  onSelect,
  onMenu,
}: {
  folder: Folder
  selectedId: string | null
  count: number
  pinned?: boolean
  onSelect: (id: string) => void
  onMenu: (id: string, x: number, y: number) => void
}) {
  const active = folder.id === selectedId
  const { longPressProps, consumeClick } = useLongPress({
    onLongPress: ({ clientX, clientY }) => onMenu(folder.id, clientX, clientY),
  })
  return (
    <div
      className={`flex min-h-[42px] cursor-pointer touch-pan-y select-none items-center gap-2 rounded-[15px] px-2 py-1.5 [-webkit-touch-callout:none] ${
        active ? 'bg-brand-500/10' : 'hover:bg-white/60'
      }`}
      onClick={() => { if (consumeClick()) return; onSelect(folder.id) }}
      {...longPressProps}
    >
      <span className={`flex h-7 w-7 items-center justify-center rounded-[11px] ${pinned ? 'bg-warning/15 text-[#B47410]' : 'bg-brand-500/10 text-brand-600'}`}>
        {pinned ? <StarGlyph filled className="h-3.5 w-3.5" /> : <FolderGlyph className="h-4 w-4" />}
      </span>
      <span className="min-w-0 flex-1 truncate text-[13px] font-bold text-navy-900">{folder.name}</span>
      <span className="rounded-full bg-navy-900/[0.06] px-1.5 py-0.5 font-mono text-[10px] font-bold text-navy-500">{count}</span>
    </div>
  )
}

// ----- Content cards -----

function ContentCard({ item, onOpen }: { item: Item; onOpen: (id: string) => void }) {
  const { openContextMenu } = useUI()
  const large = isLargeNote(item)
  const text = item.complexity === 'note' ? snippet(item, large ? 180 : 120) : snippet(item, 90)
  const noteProgress =
    item.complexity === 'note' ? calculateChecklistProgress(item.contentMd ?? '') : null
  const noteCompleted = Boolean(noteProgress?.total && noteProgress.percent === 100)
  const due = dueLabel(item)
  const priority = itemPriority(item)
  const priorityConfig = PRIORITY_CONFIG[priority]
  const { longPressProps, consumeClick } = useLongPress({
    onLongPress: ({ clientX, clientY }) => openContextMenu({ itemId: item.id, x: clientX, y: clientY }),
  })
  return (
    <button
      type="button"
      onClick={() => {
        if (consumeClick()) return
        onOpen(item.id)
      }}
      {...longPressProps}
      className={`group w-full select-none touch-pan-y [-webkit-touch-callout:none] [-webkit-user-select:none] rounded-[18px] border p-3 text-left shadow-[0_10px_24px_-22px_rgba(15,35,66,.38)] transition hover:-translate-y-0.5 hover:shadow-[0_12px_26px_-16px_rgba(15,35,66,.35)] ${
        noteCompleted ? 'border-teal-200/70 bg-teal-50/65' : 'border-white/70 bg-white/75'
      }`}
    >
      <div className="mb-1.5 flex items-center justify-between gap-2 font-mono text-[9.5px] font-extrabold uppercase tracking-[0.08em]">
        <span className={`grid h-[22px] w-[22px] place-items-center rounded-md ${itemGlyphTone(item)}`}>
          <ItemTypeGlyph item={item} className="h-3.5 w-3.5" />
        </span>
        {priority < 4 ? (
          <span className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 ${priorityTone(priority)}`}>
            <PriorityFlag priority={priority} size={11} />
            {priorityConfig.label}
          </span>
        ) : null}
      </div>
      <h3
        className={`text-[14px] font-bold leading-tight -tracking-[.01em] ${
          noteCompleted ? 'text-navy-400 line-through' : 'text-navy-900'
        }`}
      >
        {item.title}
      </h3>
      {text ? (
        <p className={`mt-1.5 text-[12px] leading-snug text-navy-500 ${large ? 'line-clamp-4' : 'line-clamp-2'}`}>{text}</p>
      ) : null}
      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-navy-900/[0.06] pt-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {item.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="rounded-full bg-navy-900/[0.045] px-1.5 py-0.5 font-mono text-[9.5px] text-navy-500">
              #{tag}
            </span>
          ))}
          {due ? (
            <span className="rounded-full bg-navy-900/[0.045] px-1.5 py-0.5 font-mono text-[9.5px] text-navy-500">{due}</span>
          ) : null}
        </div>
        {noteProgress?.total ? (
          <NoteProgressBar percent={noteProgress.percent} completed={noteCompleted} />
        ) : item.complexity === 'note' ? (
          <span className="shrink-0 font-mono text-[10px] font-extrabold text-brand-600">abrir nota →</span>
        ) : (
          <span className="inline-flex shrink-0 items-center gap-1 font-mono text-[10px] text-navy-300">
            <ClockGlyph className="h-3 w-3 shrink-0 opacity-55" />
            {formatRelative(item.updatedAt)}
          </span>
        )}
      </div>
    </button>
  )
}

function ContentRow({ item, onOpen, onToggle, temporarilyDone = false }: { item: Item; onOpen: (id: string) => void; onToggle?: (id: string, next: ItemStatus) => void; temporarilyDone?: boolean }) {
  const { openContextMenu } = useUI()
  const displayStatus = temporarilyDone ? 'done' : item.status
  const noteProgress =
    item.complexity === 'note' ? calculateChecklistProgress(item.contentMd ?? '') : null
  const noteCompleted = Boolean(noteProgress?.total && noteProgress.percent === 100)
  const text = snippet(item, 90)
  const due = dueLabel(item)
  const priority = itemPriority(item)
  const { longPressProps, consumeClick } = useLongPress({
    onLongPress: ({ clientX, clientY }) => openContextMenu({ itemId: item.id, x: clientX, y: clientY }),
  })
  return (
    <button
      type="button"
      onClick={() => {
        if (consumeClick()) return
        onOpen(item.id)
      }}
      {...longPressProps}
      className="grid w-full select-none touch-pan-y [-webkit-touch-callout:none] [-webkit-user-select:none] grid-cols-[34px_minmax(0,1fr)] items-center gap-3 border-b border-navy-900/[0.06] px-3 py-3 text-left last:border-b-0 hover:bg-white/55 sm:grid-cols-[34px_minmax(0,1fr)_120px_96px]"
    >
      <div 
        role="button"
        onClick={(e) => {
          if (item.complexity === 'task' && onToggle) {
            e.stopPropagation()
            onToggle(item.id, displayStatus === 'done' ? 'todo' : 'done')
          }
        }}
        className={`grid h-[34px] w-[34px] place-items-center rounded-[13px] ${itemGlyphTone({ ...item, status: displayStatus })} ${item.complexity === 'task' ? 'cursor-pointer hover:opacity-80' : ''}`}
      >
        <ItemTypeGlyph item={{ ...item, status: displayStatus }} className="h-4 w-4" />
      </div>
      <span className="min-w-0">
        <span
          className={`block truncate text-[14px] font-semibold ${
            noteCompleted ? 'text-navy-400 line-through' : 'text-navy-900'
          }`}
        >
          {item.title}
        </span>
        {text || due || priority < 4 ? (
          <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[12px] text-navy-500">
            {due ? <span className="font-mono text-[11px] font-medium text-navy-500">{due}</span> : null}
            {due && (text || priority < 4) ? <span className="font-mono text-navy-200">/</span> : null}
            {priority < 4 ? (
              <span className={`inline-flex items-center gap-1 rounded-full border px-1.5 py-px font-mono text-[10px] font-bold ${priorityTone(priority)}`}>
                <PriorityFlag priority={priority} size={10} />
                {PRIORITY_CONFIG[priority].label}
              </span>
            ) : null}
            {priority < 4 && text ? <span className="font-mono text-navy-200">/</span> : null}
            {text ? <span className="hidden min-w-0 truncate sm:inline">{text}</span> : null}
          </span>
        ) : null}
        {noteProgress?.total ? (
          <span className="mt-1 flex sm:hidden">
            <NoteProgressBar percent={noteProgress.percent} completed={noteCompleted} />
          </span>
        ) : null}
      </span>
      <span className="hidden items-center sm:flex">
        {noteProgress?.total ? (
          <NoteProgressBar percent={noteProgress.percent} completed={noteCompleted} />
        ) : (
          <span className={`font-mono text-[10px] ${noteCompleted ? 'font-bold text-teal-700' : 'text-navy-500'}`}>
            {STATUS_LABEL[displayStatus]}
          </span>
        )}
      </span>
      <span className="hidden items-center gap-1 font-mono text-[10px] text-navy-500 sm:flex">
        <ClockGlyph className="h-3 w-3 shrink-0 opacity-55" />
        {formatRelative(item.updatedAt)}
      </span>
    </button>
  )
}

function RootFolderCard({
  folder,
  pinned = false,
  subCount,
  count,
  onOpen,
  onMenu,
}: {
  folder: Folder
  pinned?: boolean
  subCount: number
  count: number
  onOpen: (id: string) => void
  onMenu?: (id: string, x: number, y: number) => void
}) {
  const { longPressProps, consumeClick } = useLongPress({
    onLongPress: ({ clientX, clientY }) => onMenu?.(folder.id, clientX, clientY),
  })
  return (
    <button
      type="button"
      onClick={() => { if (consumeClick()) return; onOpen(folder.id) }}
      {...(onMenu ? longPressProps : {})}
      className="group flex select-none items-center gap-3 rounded-[18px] border border-white/70 bg-white/90 p-3.5 text-left shadow-[0_10px_24px_-22px_rgba(15,35,66,.38)] transition touch-pan-y [-webkit-touch-callout:none] hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_12px_26px_-16px_rgba(15,35,66,.35)]"
    >
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] ${pinned ? 'bg-warning/15 text-[#B47410]' : 'bg-brand-500/10 text-brand-600'}`}>
        {pinned ? <StarGlyph filled className="h-5 w-5" /> : <FolderGlyph className="h-5 w-5" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-bold text-navy-900">{folder.name}</span>
        <span className="block truncate font-mono text-[10.5px] text-navy-500">
          {count} {count === 1 ? 'item' : 'itens'} · {subCount} {subCount === 1 ? 'subpasta' : 'subpastas'}
        </span>
      </span>
      <span className="shrink-0 font-mono text-[10px] font-extrabold text-brand-600 opacity-0 transition group-hover:opacity-100">abrir →</span>
    </button>
  )
}

// ----- Folder context menu (right-click desktop / long-press mobile) -----

type FolderMenuState = { folderId: string; x: number; y: number; initialSub?: 'move' }

function FolderMenuRow({
  icon,
  label,
  right,
  danger,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  right?: string
  danger?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-[40px] w-full items-center gap-2.5 rounded-[13px] px-2.5 text-left text-[13px] font-semibold transition-colors max-md:min-h-[44px] max-md:text-[14px] ${
        danger ? 'text-danger hover:bg-red-500/[0.07]' : 'text-navy-900 hover:bg-navy-900/[0.045]'
      }`}
    >
      <span className={`grid w-5 shrink-0 place-items-center text-[13px] ${danger ? 'text-danger' : 'text-navy-500'}`}>{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {right ? <span className="ml-auto shrink-0 font-mono text-[10px] text-navy-500">{right}</span> : null}
    </button>
  )
}

function FolderMenu({
  folder,
  breadcrumbLabel,
  count,
  pinned,
  viewMode,
  folders,
  x,
  y,
  initialSub,
  onClose,
  onOpen,
  onTogglePin,
  onNewSub,
  onSetView,
  onRename,
  onMove,
  onAgents,
  onCopyLink,
  onDelete,
  onToggleHideCompleted,
  onReorder,
  onClearCompleted,
}: {
  folder: Folder
  breadcrumbLabel: string
  count: number
  pinned: boolean
  viewMode: 'kanban' | 'list'
  folders: Folder[]
  x: number
  y: number
  initialSub?: 'move'
  onClose: () => void
  onOpen: () => void
  onTogglePin: () => void
  onNewSub: () => void
  onSetView: (mode: 'kanban' | 'list') => void
  onRename: () => void
  onMove: (parentId: string | null) => void
  onAgents: () => void
  onCopyLink: () => void
  onDelete: () => void
  onToggleHideCompleted: () => void
  onReorder: (direction: 'up' | 'down') => void
  onClearCompleted: () => void
}) {
  const [sub, setSub] = useState<'move' | 'view' | null>(initialSub ?? null)
  const [pos, setPos] = useState({ left: x, top: y })
  const openedAtRef = useRef(Date.now())
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768

  useEscapeClose(true, onClose)

  useEffect(() => {
    openedAtRef.current = Date.now()
    const width = 286
    const height = 440
    setPos({
      left: Math.max(8, Math.min(x, window.innerWidth - width - 8)),
      top: Math.max(8, Math.min(y, window.innerHeight - height - 8)),
    })
  }, [x, y])

  // Move: exclui a própria pasta e suas descendentes (não pode mover para dentro de si mesma).
  const moveTargets = useMemo(() => {
    const descendants = new Set<string>([folder.id])
    let added = true
    while (added) {
      added = false
      for (const f of folders) {
        if (f.parentId && descendants.has(f.parentId) && !descendants.has(f.id)) {
          descendants.add(f.id)
          added = true
        }
      }
    }
    return flattenFolderOptions(folders).filter(({ folder: f }) => !descendants.has(f.id))
  }, [folders, folder.id])

  function handleBackdropDown() {
    if (Date.now() - openedAtRef.current < 400) return
    onClose()
  }

  const panelClass =
    'max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:w-full max-md:rounded-t-[30px] max-md:border-x-0 max-md:border-b-0 max-md:p-3.5 max-md:pb-[calc(1.25rem+env(safe-area-inset-bottom))] max-md:shadow-[0_-28px_70px_-36px_rgba(15,35,66,0.64)] md:fixed md:w-[286px] md:rounded-[22px] md:p-[9px] md:shadow-[0_34px_90px_-42px_rgba(15,35,66,.58),0_10px_26px_rgba(15,35,66,.1)] border border-white/78 bg-white/95 backdrop-blur-2xl'

  return (
    <div className="fixed inset-0 z-[130]" onMouseDown={handleBackdropDown}>
      <div
        className={panelClass}
        style={isMobile ? {} : { left: pos.left, top: pos.top }}
        onMouseDown={(e) => e.stopPropagation()}
        role="menu"
      >
        {sub === 'move' ? (
          <>
            <FolderMenuRow icon="‹" label="Voltar" onClick={() => setSub(null)} />
            <div className="my-1 h-px bg-navy-900/[0.07]" />
            <FolderMenuRow icon="⌂" label="Raiz (sem pasta-mãe)" onClick={() => onMove(null)} />
            <div className="max-h-64 overflow-y-auto">
              {moveTargets.length === 0 ? (
                <p className="px-2 py-3 text-center font-mono text-[11px] text-navy-300">Nenhum destino</p>
              ) : (
                moveTargets.map(({ folder: f, depth }) => (
                  <FolderMenuRow
                    key={f.id}
                    icon="📁"
                    label={`${' '.repeat(depth)}${f.name}`}
                    onClick={() => onMove(f.id)}
                  />
                ))
              )}
            </div>
          </>
        ) : sub === 'view' ? (
          <>
            <FolderMenuRow icon="‹" label="Voltar" onClick={() => setSub(null)} />
            <div className="my-1 h-px bg-navy-900/[0.07]" />
            <FolderMenuRow icon="▤" label="Lista" right={viewMode === 'list' ? '✓' : undefined} onClick={() => onSetView('list')} />
            <FolderMenuRow icon="▦" label="Kanban" right={viewMode === 'kanban' ? '✓' : undefined} onClick={() => onSetView('kanban')} />
          </>
        ) : (
          <>
            {isMobile ? <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-navy-900/15" /> : null}
            <div className="border-b border-navy-900/[0.07] px-2.5 pb-2.5 max-md:px-1">
              <b className="block truncate text-[13px] font-[850] text-navy-900 max-md:text-[15px]">{folder.name}</b>
              <span className="mt-1 block truncate font-mono text-[10px] text-navy-500">{breadcrumbLabel} · {count} {count === 1 ? 'item' : 'itens'}</span>
            </div>

            <div className="my-2 grid grid-cols-3 gap-1.5">
              <button type="button" onClick={onOpen} className="flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-[15px] bg-navy-900/[0.045] text-navy-900">
                <span className="text-[16px] leading-none">↗</span>
                <b className="text-[11px] font-[850]">Abrir</b>
              </button>
              <button type="button" onClick={onTogglePin} className={`flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-[15px] ${pinned ? 'bg-warning/[0.18] text-[#B47410]' : 'bg-warning/[0.14] text-[#B47410]'}`}>
                <span className="text-[16px] leading-none">{pinned ? '★' : '☆'}</span>
                <b className="text-[11px] font-[850]">{pinned ? 'Favorita' : 'Favoritar'}</b>
              </button>
              <button type="button" onClick={onNewSub} className="flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-[15px] bg-navy-900/[0.045] text-navy-900">
                <span className="text-[16px] leading-none">＋</span>
                <b className="text-[11px] font-[850]">Subpasta</b>
              </button>
            </div>

            <div className="border-t border-navy-900/[0.07] py-1">
              <FolderMenuRow icon="▦" label="Visualização" right={`${viewMode === 'kanban' ? 'Kanban' : 'Lista'} ›`} onClick={() => setSub('view')} />
              <FolderMenuRow
                icon={folder.hideCompleted !== false ? '👁️' : '🙈'}
                label={folder.hideCompleted !== false ? 'Manter concluídos visíveis' : 'Ocultar concluídos'}
                onClick={onToggleHideCompleted}
              />
              {folder.hideCompleted === false && (
                <FolderMenuRow
                  icon="🧹"
                  label="Limpar concluídos"
                  onClick={onClearCompleted}
                />
              )}
              <FolderMenuRow icon="✎" label="Renomear" onClick={onRename} />
              <FolderMenuRow icon="⇄" label="Mover" onClick={() => setSub('move')} />
              <FolderMenuRow icon={<span className="font-mono text-[10px] font-bold">AG</span>} label="Editar AGENTS.md" onClick={onAgents} />
              <FolderMenuRow icon="⛓" label="Copiar link" onClick={onCopyLink} />
            </div>

            {pinned && (
              <div className="border-t border-navy-900/[0.07] py-1">
                <FolderMenuRow icon="▲" label="Mover para cima / esquerda" onClick={() => onReorder('up')} />
                <FolderMenuRow icon="▼" label="Mover para baixo / direita" onClick={() => onReorder('down')} />
              </div>
            )}

            <div className="border-t border-navy-900/[0.07] py-1">
              <FolderMenuRow icon="🗑" label="Excluir pasta" danger onClick={onDelete} />
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ----- Main browser -----

function NotasBrowser() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const folderParam = searchParams.get('folder')

  const { folders } = useFolders()
  const { items } = useItems()
  const { prefs, update } = usePreferences()
  const { prompt, confirm } = useDialog()
  const { setSingleSelection, setQuickCaptureFolderId, openCapture } = useUI()

  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [sortOpen, setSortOpen] = useState(false)
  const [agentsForId, setAgentsForId] = useState<string | null>(null)
  const [mobileFoldersOpen, setMobileFoldersOpen] = useState(false)
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false)
  const [folderMenu, setFolderMenu] = useState<FolderMenuState | null>(null)
  const [kanbanFocusOpen, setKanbanFocusOpen] = useState(false)
  const [temporarilyDone, setTemporarilyDone] = useState<Set<string>>(() => new Set())
  const sortRef = useRef<HTMLDivElement>(null)
  const headerMenuRef = useRef<HTMLDivElement>(null)
  const doneTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  const tree = useMemo(() => buildFolderTree(folders), [folders])
  const folderById = useMemo(() => new Map(folders.map((f) => [f.id, f])), [folders])
  const rootFolders = useMemo(() => folders.filter((f) => !f.parentId).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')), [folders])
  const pinnedFolders = useMemo(
    () => prefs.pinnedFolderIds.map((id) => folderById.get(id)).filter((f): f is Folder => Boolean(f)),
    [prefs.pinnedFolderIds, folderById],
  )
  const pinnedNotes = useMemo(() => {
    return items.filter((it) => it.complexity === 'note' && it.status !== 'archived' && !it.deletedAt && prefs.pinnedNoteIds?.includes(it.id))
  }, [items, prefs.pinnedNoteIds])

  const counts = useMemo(() => {
    const map = new Map<string, number>()
    for (const item of items) {
      if (!item.folderId || !isActiveItem(item)) continue
      map.set(item.folderId, (map.get(item.folderId) ?? 0) + 1)
    }
    return map
  }, [items])

  const selectedId = folderParam && folderById.has(folderParam) ? folderParam : null
  const selectedFolder = selectedId ? folderById.get(selectedId) ?? null : null
  const node = useMemo(() => (selectedId ? findNode(tree, selectedId) : null), [tree, selectedId])
  const childFolders = useMemo(() => [...(node?.children ?? [])].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')), [node])
  const breadcrumb = useMemo(() => buildBreadcrumb(folders, selectedId), [folders, selectedId])
  const isPinned = selectedId ? prefs.pinnedFolderIds.includes(selectedId) : false
  const expandableFolderIds = useMemo(() => collectExpandableFolderIds(tree), [tree])
  const allFoldersExpanded = expandableFolderIds.length > 0 && expandableFolderIds.every((id) => expanded.has(id))
  const viewMode: 'kanban' | 'list' =
    selectedFolder?.viewMode === 'kanban' && childFolders.length > 0 ? 'kanban' : 'list'

  // ID 026: ordenação alfabética por padrão e persistente por pasta (chave = folderId ou 'root').
  const sortStorageKey = selectedId ?? 'root'
  const savedSort = prefs.folderSort?.[sortStorageKey]
  const sortKey: SortKey = SORT_OPTIONS.some((o) => o.key === savedSort) ? (savedSort as SortKey) : 'alpha'
  function setSortKey(key: SortKey) {
    update({ folderSort: { ...(prefs.folderSort ?? {}), [sortStorageKey]: key } })
  }

  // expand ancestors of the selected folder
  useEffect(() => {
    if (!selectedId) return
    const ancestors = breadcrumb.map((f) => f.id)
    setExpanded((current) => {
      if (ancestors.every((id) => current.has(id))) return current
      const next = new Set(current)
      for (const id of ancestors) next.add(id)
      return next
    })
  }, [selectedId, breadcrumb])

  // close sort/header menus on outside click
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false)
      if (headerMenuRef.current && !headerMenuRef.current.contains(e.target as Node)) setHeaderMenuOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  useEffect(() => {
    const timeouts = doneTimeoutsRef.current
    return () => {
      for (const timeout of timeouts.values()) clearTimeout(timeout)
      timeouts.clear()
    }
  }, [])

  // Esc fecha o drawer de pastas no mobile mesmo sem foco interno (ID 010).
  useEscapeClose(mobileFoldersOpen, () => setMobileFoldersOpen(false))
  useEscapeClose(kanbanFocusOpen, () => setKanbanFocusOpen(false))

  useEffect(() => {
    if (viewMode !== 'kanban') setKanbanFocusOpen(false)
  }, [viewMode])

  const isHideCompleted = selectedFolder ? selectedFolder.hideCompleted !== false : true

  const directItems = useMemo(
    () => {
      if (!selectedId) return []
      return items.filter((it) => {
        if (it.folderId !== selectedId) return false
        if (it.status === 'archived') return false
        // Concluídos somem se a pasta os oculta OU se foram "limpos" individualmente (ID 036).
        if (it.status === 'done' && (isHideCompleted || it.clearedAt)) return false
        return true
      })
    },
    [items, selectedId, isHideCompleted],
  )

  const itemsByFolder = useMemo(() => {
    const map = new Map<string, Item[]>()
    for (const item of items) {
      if (!item.folderId) continue
      if (item.status === 'archived') continue
      if (item.status === 'done' && (isHideCompleted || item.clearedAt)) continue
      const list = map.get(item.folderId) ?? []
      list.push(item)
      map.set(item.folderId, list)
    }
    return map
  }, [items, isHideCompleted])

  const allFolderItems = useMemo(() => {
    return sortItems(directItems, sortKey)
  }, [directItems, sortKey])

  const kanbanColumns = useMemo(() => {
    if (childFolders.length === 0) {
      return [{ id: selectedId ?? 'root', title: selectedFolder?.name ?? 'Itens', items: sortItems(directItems, sortKey) }]
    }
    const cols = childFolders.map((sub) => ({
      id: sub.id,
      title: sub.name,
      items: sortItems(itemsByFolder.get(sub.id) ?? [], sortKey),
    }))
    if (directItems.length > 0) {
      cols.push({ id: selectedId ?? 'root', title: 'Sem pasta', items: sortItems(directItems, sortKey) })
    }
    return cols
  }, [childFolders, directItems, itemsByFolder, selectedFolder?.name, selectedId, sortKey])

  function selectFolder(id: string) {
    router.replace(`/notas?folder=${id}`, { scroll: false })
    setMobileFoldersOpen(false)
  }

  function handleOpenItem(id: string) {
    const target = items.find((item) => item.id === id)
    if (target?.complexity !== 'note') {
      setSingleSelection(id)
      return
    }
    const source = selectedId ? `/notas?folder=${selectedId}` : '/notas'
    router.push(`/notas/${id}?from=${encodeURIComponent(source)}`)
  }

  function goToRoot() {
    router.replace('/notas', { scroll: false })
    setMobileFoldersOpen(false)
  }

  function toggleExpand(id: string) {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAllFolders() {
    setExpanded(allFoldersExpanded ? new Set() : new Set(expandableFolderIds))
  }

  function togglePinned() {
    if (!selectedId) return
    const next = isPinned
      ? prefs.pinnedFolderIds.filter((id) => id !== selectedId)
      : [selectedId, ...prefs.pinnedFolderIds]
    update({ pinnedFolderIds: next })
  }

  async function changeView(mode: 'kanban' | 'list') {
    if (!selectedId || mode === viewMode) return
    await updateFolder(selectedId, { viewMode: mode, viewModeManual: true })
  }

  async function handleNewFolder() {
    const name = await prompt({ title: 'Nova pasta', message: 'Nome da pasta', placeholder: 'Nome' })
    if (!name?.trim()) return
    const folder = await createFolder({ name: name.trim() })
    selectFolder(folder.id)
  }

  async function handleNewSubfolder() {
    if (!selectedId) return
    const name = await prompt({ title: 'Nova subpasta', message: 'Nome da subpasta', placeholder: 'Nome' })
    if (!name?.trim()) return
    const folder = await createFolder({ name: name.trim(), parentId: selectedId })
    setExpanded((current) => new Set(current).add(selectedId))
    selectFolder(folder.id)
  }

  function handleNewItem(folderId: string | null) {
    setQuickCaptureFolderId(folderId)
    // ID 069: adição rápida na pasta/Kanban cria tarefa por padrão; o usuário troca
    // para nota pelas abas de modo do próprio modal quando quiser.
    openCapture('task')
  }

  // ID 059: concluir/reabrir tarefa pelo checkbox da lista da pasta (mesmo comportamento
  // da página Hoje). A pasta cuida de ocultar/manter concluídos conforme sua regra.
  function toggleItemDone(id: string, next: ItemStatus) {
    const pending = doneTimeoutsRef.current.get(id)
    if (pending) {
      clearTimeout(pending)
      doneTimeoutsRef.current.delete(id)
    }

    if (next === 'done') {
      setTemporarilyDone((current) => {
        const updated = new Set(current)
        updated.add(id)
        return updated
      })
      const timeout = setTimeout(() => {
        doneTimeoutsRef.current.delete(id)
        void updateItem(id, { status: 'done' } as never).finally(() => {
          setTemporarilyDone((current) => {
            const updated = new Set(current)
            updated.delete(id)
            return updated
          })
        })
      }, 1500)
      doneTimeoutsRef.current.set(id, timeout)
      return
    }

    setTemporarilyDone((current) => {
      if (!current.has(id)) return current
      const updated = new Set(current)
      updated.delete(id)
      return updated
    })
    void updateItem(id, { status: next } as never)
  }

  function renderKanbanBoard(focus = false) {
    return (
      <div
        className={`flex min-h-0 gap-3.5 overflow-auto overscroll-contain ${
          focus ? 'h-full px-4 pb-4' : 'min-h-[60vh]'
        }`}
      >
        {kanbanColumns.map((column) => (
          <div
            key={column.id}
            // ID 034: clique direito no quadro/coluna abre o menu da pasta correspondente
            // (cards param o contextmenu via stopPropagation, entao nao conflita com itens).
            onContextMenu={(e) => {
              if (column.id !== 'root' && folderById.has(column.id)) {
                e.preventDefault()
                openFolderMenu(column.id, e.clientX, e.clientY)
              }
            }}
            className={`flex shrink-0 flex-col overflow-hidden rounded-[24px] border border-white/62 bg-white/46 ${
              focus ? 'h-full w-[min(84vw,360px)] sm:w-80' : 'w-72'
            }`}
          >
            <div className="flex items-center gap-2 border-b border-navy-900/[0.06] px-3.5 py-3">
              <span className="h-2 w-2 rounded-full bg-brand-500 shadow-[0_0_9px_rgba(47,107,255,.45)]" />
              {column.id !== selectedId && column.id !== 'root' ? (
                <button
                  type="button"
                  onClick={() => selectFolder(column.id)}
                  className="min-w-0 flex-1 truncate text-left text-[13px] font-black text-navy-900 hover:text-brand-600"
                  title={`Abrir ${column.title}`}
                >
                  {column.title}
                </button>
              ) : (
                <b className="min-w-0 flex-1 truncate text-[13px] font-black text-navy-900">{column.title}</b>
              )}
              <span className="ml-auto font-mono text-[10px] text-navy-500">{column.items.length}</span>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto overscroll-contain p-3">
              {column.items.length === 0 ? (
                <p className="px-1 py-3 text-center font-mono text-[11px] text-navy-300">Vazio</p>
              ) : (
                column.items.map((item) => (
                  <ContentCard key={item.id} item={item} onOpen={handleOpenItem} />
                ))
              )}
              <button
                type="button"
                onClick={() => handleNewItem(column.id === 'root' ? selectedId : column.id)}
                className="mt-1 flex items-center gap-1.5 rounded-[14px] border border-dashed border-navy-900/12 px-3 py-2 text-[12px] font-semibold text-navy-500 hover:border-brand-300 hover:text-brand-600"
              >
                + Adicionar
              </button>
            </div>
          </div>
        ))}
      </div>
    )
  }

  // ----- Ações do menu de contexto de pasta (parametrizadas por folderId) -----
  function openFolderMenu(folderId: string, x: number, y: number) {
    setFolderMenu({ folderId, x, y })
  }

  function togglePinnedFor(folderId: string) {
    const next = prefs.pinnedFolderIds.includes(folderId)
      ? prefs.pinnedFolderIds.filter((id) => id !== folderId)
      : [folderId, ...prefs.pinnedFolderIds]
    update({ pinnedFolderIds: next })
  }

  async function newSubfolderFor(folderId: string) {
    const name = await prompt({ title: 'Nova subpasta', message: 'Nome da subpasta', placeholder: 'Nome' })
    if (!name?.trim()) return
    const folder = await createFolder({ name: name.trim(), parentId: folderId })
    setExpanded((current) => new Set(current).add(folderId))
    selectFolder(folder.id)
  }

  async function renameFolder(folderId: string) {
    const current = folderById.get(folderId)
    const name = await prompt({ title: 'Renomear pasta', message: 'Novo nome', defaultValue: current?.name ?? '', placeholder: 'Nome' })
    if (!name?.trim() || name.trim() === current?.name) return
    await updateFolder(folderId, { name: name.trim() })
  }

  async function moveFolder(folderId: string, parentId: string | null) {
    await updateFolder(folderId, { parentId } as never)
  }

  function copyFolderLink(folderId: string) {
    const url = `${window.location.origin}/notas?folder=${folderId}`
    navigator.clipboard?.writeText(url)
  }

  async function deleteFolderWithConfirm(folderId: string) {
    const f = folderById.get(folderId)
    const ok = await confirm({
      title: 'Excluir pasta',
      message: `Excluir "${f?.name ?? 'pasta'}"? Subpastas também serão removidas e os itens ficarão sem pasta. Esta ação não pode ser desfeita.`,
      confirmLabel: 'Excluir',
      cancelLabel: 'Cancelar',
      variant: 'danger',
    })
    if (!ok) return
    await deleteFolder(folderId)
    if (selectedId === folderId) goToRoot()
  }

  const filteredTree = search.trim()
    ? folders
        .filter((f) => f.name.toLowerCase().includes(search.trim().toLowerCase()))
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    : null

  const activeSort = SORT_OPTIONS.find((o) => o.key === sortKey) ?? SORT_OPTIONS[0]!

  // Conteúdo do navegador de pastas, reutilizado na sidebar (desktop) e no drawer (mobile).
  const folderNavContent = (
    <>
      <div className="border-b border-navy-900/[0.07] px-5 pb-3.5 pt-3.5">
        <label className="flex min-h-[42px] items-center gap-2 rounded-[15px] border border-navy-900/[0.07] bg-white/72 px-3">
          <svg className="h-4 w-4 text-navy-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.3-4.3M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4Z" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar pasta..."
            className="min-w-0 flex-1 bg-transparent font-mono text-[11px] text-navy-700 outline-none placeholder:text-navy-400"
          />
        </label>
      </div>

      <div className="flex-1 p-3">
        {filteredTree ? (
          filteredTree.length === 0 ? (
            <p className="px-2 py-6 text-center font-mono text-[11px] text-navy-400">Nenhuma pasta encontrada</p>
          ) : (
            filteredTree.map((folder) => (
              <SidebarFolderRow
                key={folder.id}
                folder={folder}
                selectedId={selectedId}
                count={counts.get(folder.id) ?? 0}
                onSelect={selectFolder}
                onMenu={openFolderMenu}
              />
            ))
          )
        ) : (
          <>
            {pinnedFolders.length > 0 || pinnedNotes.length > 0 ? (
              <>
                <div className="px-2 py-2 font-mono text-[10px] font-extrabold uppercase tracking-[0.10em] text-navy-500">Destacadas</div>
                {pinnedFolders.map((folder) => (
                  <SidebarFolderRow
                    key={folder.id}
                    folder={folder}
                    selectedId={selectedId}
                    count={counts.get(folder.id) ?? 0}
                    pinned
                    onSelect={selectFolder}
                    onMenu={openFolderMenu}
                  />
                ))}
                {pinnedNotes.map((note) => (
                  <Link
                    key={note.id}
                    href={`/notas/${note.id}?from=${encodeURIComponent(
                      selectedId ? `/notas?folder=${selectedId}` : '/notas',
                    )}`}
                    className="flex items-center gap-2 rounded-[7px] px-2 py-1.5 font-mono text-[12px] text-navy-700 hover:bg-navy-900/[0.05]"
                  >
                    <span className="shrink-0 text-[11px] font-bold text-brand-600">★</span>
                    <span className="truncate">{note.title}</span>
                  </Link>
                ))}
              </>
            ) : null}
            <div className="flex items-center justify-between gap-2 px-2 py-2">
              <span className="font-mono text-[10px] font-extrabold uppercase tracking-[0.10em] text-navy-500">Todas</span>
              {expandableFolderIds.length > 0 ? (
                <button
                  type="button"
                  onClick={toggleAllFolders}
                  className="inline-flex h-7 items-center gap-1.5 rounded-full border border-navy-900/[0.08] bg-white/62 px-2.5 font-mono text-[10px] font-extrabold text-navy-500 transition-colors hover:border-brand-300 hover:text-brand-600"
                  aria-pressed={allFoldersExpanded}
                  aria-label={allFoldersExpanded ? 'Recolher todas as subpastas' : 'Expandir todas as subpastas'}
                  title={allFoldersExpanded ? 'Recolher tudo' : 'Expandir tudo'}
                >
                  <span aria-hidden="true">{allFoldersExpanded ? '-' : '+'}</span>
                  {allFoldersExpanded ? 'Recolher tudo' : 'Expandir tudo'}
                </button>
              ) : null}
            </div>
            {tree.length === 0 ? (
              <p className="px-2 py-6 text-center font-mono text-[11px] text-navy-400">Nenhuma pasta ainda</p>
            ) : (
              tree.map((root) => (
                <TreeRow
                  key={root.id}
                  node={root}
                  depth={0}
                  selectedId={selectedId}
                  expanded={expanded}
                  counts={counts}
                  onSelect={selectFolder}
                  onToggle={toggleExpand}
                  onMenu={openFolderMenu}
                />
              ))
            )}
          </>
        )}
      </div>


    </>
  )

  return (
    <div className="doit-folder-browser mx-auto w-full max-w-[1440px] px-4 pb-6 lg:min-h-[calc(100vh-104px)] lg:px-8">
      {/* Scroll da página em vez de containers internos fixos */}
      <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[340px_minmax(0,1fr)] lg:items-start">
        {/* Sidebar / folder navigator (desktop) */}
        {/* ID 016: sidebar acompanha o scroll da página (sticky), sem barra de rolagem interna própria. */}
        <aside className="hidden flex-col rounded-[28px] border border-white/78 bg-white/85 shadow-cool-md backdrop-blur-2xl lg:flex lg:sticky lg:top-[96px] lg:self-start">
          {folderNavContent}
        </aside>

        {/* Content panel */}
        <section className="flex flex-col rounded-[28px] border border-white/78 bg-white/85 shadow-cool-md backdrop-blur-2xl">
          {selectedFolder ? (
            <>
              <div className="border-b border-navy-900/[0.07] bg-[radial-gradient(560px_260px_at_100%_0%,rgba(47,107,255,.16),transparent_68%),rgba(255,255,255,.66)] px-5 pb-4 pt-5 lg:px-6">
                <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px] font-extrabold uppercase tracking-[0.08em] text-navy-500">
                  <button
                    type="button"
                    onClick={() => setMobileFoldersOpen(true)}
                    className="mr-1 inline-flex items-center gap-1 rounded-full bg-navy-900/[0.06] px-2 py-1 text-[10px] font-extrabold text-navy-700 lg:hidden"
                    aria-label="Abrir navegador de pastas"
                  >
                    <FolderGlyph className="h-3.5 w-3.5" />
                    Pastas
                  </button>
                  <button type="button" className="hover:text-navy-700" onClick={goToRoot}>
                    Notas
                  </button>
                  {breadcrumb.map((f, i) => (
                    <Fragment key={f.id}>
                      <span className="text-navy-900/30">/</span>
                      {i === breadcrumb.length - 1 ? (
                        <span className="text-brand-600">{f.name}</span>
                      ) : (
                        <button type="button" className="hover:text-navy-700" onClick={() => selectFolder(f.id)}>
                          {f.name}
                        </button>
                      )}
                    </Fragment>
                  ))}
                </div>

                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-[28px] font-black leading-none -tracking-[.05em] text-navy-900 lg:text-[28px]">
                      {selectedFolder.name}
                    </h1>

                    {/* Desktop View/Sort toggles (ID 058) */}
                    <div className="hidden lg:flex items-center gap-2">
                      <div className="inline-flex gap-1 rounded-full bg-navy-900/[0.055] p-1">
                        {(['kanban', 'list'] as const).map((mode) => (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => void changeView(mode)}
                            className={`inline-flex h-8 items-center rounded-full px-3 font-mono text-[10px] font-extrabold uppercase tracking-[0.06em] ${
                              viewMode === mode ? 'bg-white text-brand-600 shadow-cool-sm' : 'text-navy-500'
                            }`}
                          >
                            {mode === 'kanban' ? 'Kanban' : 'Lista'}
                          </button>
                        ))}
                      </div>
                      <div className="relative" ref={sortRef}>
                        <button
                          type="button"
                          onClick={() => setSortOpen((v) => !v)}
                          className="inline-flex h-8 items-center gap-2 rounded-full border border-white/72 bg-white/68 px-3 font-mono text-[10px] font-extrabold uppercase tracking-[0.06em] text-navy-500"
                          aria-haspopup="menu"
                          aria-expanded={sortOpen}
                        >
                          Ordenar: {activeSort.label} ▾
                        </button>
                        {sortOpen ? (
                          <div className="absolute left-0 top-10 z-20 w-56 rounded-[20px] border border-white/78 bg-white/92 p-2 shadow-cool-md backdrop-blur-2xl" role="menu">
                            {SORT_OPTIONS.map((option) => (
                              <button
                                key={option.key}
                                type="button"
                                role="menuitemradio"
                                aria-checked={option.key === sortKey}
                                onClick={() => {
                                  setSortKey(option.key)
                                  setSortOpen(false)
                                }}
                                className={`flex min-h-[36px] w-full items-center justify-between gap-3 rounded-[13px] px-2.5 text-[12px] font-semibold ${
                                  option.key === sortKey ? 'bg-brand-500/[0.08] text-brand-600' : 'text-navy-900 hover:bg-navy-900/[0.045]'
                                }`}
                              >
                                <span>{option.label}</span>
                                <span className="font-mono text-[10px] text-navy-500">{option.hint}</span>
                              </button>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {viewMode === 'kanban' ? (
                      <button
                        type="button"
                        onClick={() => setKanbanFocusOpen(true)}
                        className="hidden h-[38px] items-center gap-2 rounded-full border border-white/72 bg-white/68 px-3 font-mono text-[10px] font-extrabold uppercase tracking-[0.06em] text-navy-600 shadow-cool-sm transition-colors hover:text-brand-600 lg:inline-flex"
                        title="Abrir Kanban em modo foco"
                      >
                        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M3 16v3a2 2 0 0 0 2 2h3" />
                        </svg>
                        Foco
                      </button>
                    ) : null}
                    {/* Mobile & Desktop: ações agrupadas em menu kebab (ID 016/025). */}
                    <div className="relative" ref={headerMenuRef}>
                      <button
                        type="button"
                        onClick={() => setHeaderMenuOpen((v) => !v)}
                        aria-haspopup="menu"
                        aria-expanded={headerMenuOpen}
                        aria-label="Ações da pasta"
                        className="grid h-[38px] w-[38px] place-items-center rounded-full bg-navy-900/[0.055] text-navy-700 transition hover:bg-navy-900/10"
                      >
                        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                          <circle cx="12" cy="5" r="1.6" />
                          <circle cx="12" cy="12" r="1.6" />
                          <circle cx="12" cy="19" r="1.6" />
                        </svg>
                      </button>
                      {headerMenuOpen ? (
                        <div className="absolute right-0 top-11 z-30 w-52 overflow-hidden rounded-[18px] border border-white/78 bg-white/95 p-1.5 shadow-cool-md backdrop-blur-2xl" role="menu">
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => { togglePinned(); setHeaderMenuOpen(false) }}
                            className="flex min-h-[40px] w-full items-center gap-2.5 rounded-[12px] px-3 text-left text-[13px] font-semibold text-navy-900 hover:bg-navy-900/[0.045]"
                          >
                            <StarGlyph filled={isPinned} className="h-4 w-4 text-[#B47410]" />
                            {isPinned ? 'Desafixar pasta' : 'Favoritar pasta'}
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            onClick={async () => {
                              if (selectedId) {
                                await updateFolder(selectedId, { hideCompleted: !isHideCompleted })
                              }
                              setHeaderMenuOpen(false)
                            }}
                            className="flex min-h-[40px] w-full items-center gap-2.5 rounded-[12px] px-3 text-left text-[13px] font-semibold text-navy-900 hover:bg-navy-900/[0.045]"
                          >
                            <span className="text-[14px]">{isHideCompleted ? '👁️' : '🙈'}</span>
                            {isHideCompleted ? 'Manter concluídos visíveis' : 'Ocultar concluídos'}
                          </button>
                          {!isHideCompleted && (
                            <button
                              type="button"
                              role="menuitem"
                              onClick={async () => {
                                const completedItems = directItems.filter((it) => it.status === 'done')
                                if (completedItems.length > 0) {
                                  await bulkUpdateItems({
                                    ids: completedItems.map((it) => it.id),
                                    // Oculta da pasta sem removê-la: mantém folderId e status done (ID 036).
                                    patch: { clearedAt: new Date().toISOString() }
                                  })
                                }
                                setHeaderMenuOpen(false)
                              }}
                              className="flex min-h-[40px] w-full items-center gap-2.5 rounded-[12px] px-3 text-left text-[13px] font-semibold text-navy-900 hover:bg-navy-900/[0.045]"
                            >
                              <span className="text-[14px]">🧹</span>
                              Limpar concluídos
                            </button>
                          )}
                          {isPinned && (
                            <>
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                  const index = prefs.pinnedFolderIds.indexOf(selectedId!)
                                  if (index > 0) {
                                    const nextIds = [...prefs.pinnedFolderIds]
                                    const temp = nextIds[index]!
                                    nextIds[index] = nextIds[index - 1]!
                                    nextIds[index - 1] = temp
                                    update({ pinnedFolderIds: nextIds })
                                  }
                                  setHeaderMenuOpen(false)
                                }}
                                className="flex min-h-[40px] w-full items-center gap-2.5 rounded-[12px] px-3 text-left text-[13px] font-semibold text-navy-900 hover:bg-navy-900/[0.045]"
                              >
                                <span className="text-[14px]">▲</span>
                                Mover destaque para esquerda
                              </button>
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => {
                                  const index = prefs.pinnedFolderIds.indexOf(selectedId!)
                                  if (index !== -1 && index < prefs.pinnedFolderIds.length - 1) {
                                    const nextIds = [...prefs.pinnedFolderIds]
                                    const temp = nextIds[index]!
                                    nextIds[index] = nextIds[index + 1]!
                                    nextIds[index + 1] = temp
                                    update({ pinnedFolderIds: nextIds })
                                  }
                                  setHeaderMenuOpen(false)
                                }}
                                className="flex min-h-[40px] w-full items-center gap-2.5 rounded-[12px] px-3 text-left text-[13px] font-semibold text-navy-900 hover:bg-navy-900/[0.045]"
                              >
                                <span className="text-[14px]">▼</span>
                                Mover destaque para direita
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => { handleNewFolder(); setHeaderMenuOpen(false) }}
                            className="flex min-h-[40px] w-full items-center gap-2.5 rounded-[12px] px-3 text-left text-[13px] font-semibold text-navy-900 hover:bg-navy-900/[0.045]"
                          >
                            <FolderGlyph className="h-4 w-4 text-brand-600" />
                            Nova pasta
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => { handleNewSubfolder(); setHeaderMenuOpen(false) }}
                            className="flex min-h-[40px] w-full items-center gap-2.5 rounded-[12px] px-3 text-left text-[13px] font-semibold text-navy-900 hover:bg-navy-900/[0.045]"
                          >
                            <FolderGlyph className="h-4 w-4 text-brand-600 opacity-60" />
                            Nova subpasta
                          </button>
                          {/* ID 070: mover a pasta atual para dentro de outra (ou raiz).
                              Reusa o fluxo seguro do FolderMenu, que exclui a própria
                              pasta e descendentes como destino. */}
                          <button
                            type="button"
                            role="menuitem"
                            onClick={(e) => {
                              if (selectedId) setFolderMenu({ folderId: selectedId, x: e.clientX, y: e.clientY, initialSub: 'move' })
                              setHeaderMenuOpen(false)
                            }}
                            className="flex min-h-[40px] w-full items-center gap-2.5 rounded-[12px] px-3 text-left text-[13px] font-semibold text-navy-900 hover:bg-navy-900/[0.045]"
                          >
                            <span className="text-[14px] text-navy-500">⇄</span>
                            Mover pasta
                          </button>
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => { if (selectedId) setAgentsForId(selectedId); setHeaderMenuOpen(false) }}
                            className="flex min-h-[40px] w-full items-center gap-2.5 rounded-[12px] px-3 text-left text-[13px] font-semibold text-navy-900 hover:bg-navy-900/[0.045]"
                          >
                            <span className="font-mono text-[11px] font-bold text-navy-500">md</span>
                            Editar AGENTS.md
                          </button>
                          <div className="my-1 h-px bg-navy-900/10" />
                          <button
                            type="button"
                            role="menuitem"
                            onClick={() => { if (selectedId) void deleteFolderWithConfirm(selectedId); setHeaderMenuOpen(false) }}
                            className="flex min-h-[40px] w-full items-center gap-2.5 rounded-[12px] px-3 text-left text-[13px] font-semibold text-danger hover:bg-red-500/[0.07]"
                          >
                            <span className="font-mono text-[11px] font-bold text-danger">🗑</span>
                            Excluir pasta
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* Mobile View/Sort toggles */}
                <div className="mt-4 flex flex-wrap items-center gap-2.5 lg:hidden">
                  <div className="inline-flex gap-1 rounded-full bg-navy-900/[0.055] p-1">
                    {(['kanban', 'list'] as const).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => void changeView(mode)}
                        className={`inline-flex h-8 items-center rounded-full px-3 font-mono text-[10px] font-extrabold uppercase tracking-[0.06em] ${
                          viewMode === mode ? 'bg-white text-brand-600 shadow-cool-sm' : 'text-navy-500'
                        }`}
                      >
                        {mode === 'kanban' ? 'Kanban' : 'Lista'}
                      </button>
                    ))}
                  </div>
                  {viewMode === 'kanban' ? (
                    <button
                      type="button"
                      onClick={() => setKanbanFocusOpen(true)}
                      className="inline-flex h-8 items-center gap-2 rounded-full border border-white/72 bg-white/68 px-3 font-mono text-[10px] font-extrabold uppercase tracking-[0.06em] text-navy-500 lg:hidden"
                      title="Abrir Kanban em modo foco"
                    >
                      <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M21 16v3a2 2 0 0 1-2 2h-3M3 16v3a2 2 0 0 0 2 2h3" />
                      </svg>
                      Foco
                    </button>
                  ) : null}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setSortOpen((v) => !v)}
                      className="inline-flex h-8 items-center gap-2 rounded-full border border-white/72 bg-white/68 px-3 font-mono text-[10px] font-extrabold uppercase tracking-[0.06em] text-navy-500"
                      aria-haspopup="menu"
                      aria-expanded={sortOpen}
                    >
                      Ordenar: {activeSort.label} ▾
                    </button>
                    {sortOpen ? (
                      <div className="absolute right-0 top-10 z-20 w-56 rounded-[20px] border border-white/78 bg-white/92 p-2 shadow-cool-md backdrop-blur-2xl" role="menu">
                        {SORT_OPTIONS.map((option) => (
                          <button
                            key={option.key}
                            type="button"
                            role="menuitemradio"
                            aria-checked={option.key === sortKey}
                            onClick={() => {
                              setSortKey(option.key)
                              setSortOpen(false)
                            }}
                            className={`flex min-h-[36px] w-full items-center justify-between gap-3 rounded-[13px] px-2.5 text-[12px] font-semibold ${
                              option.key === sortKey ? 'bg-brand-500/[0.08] text-brand-600' : 'text-navy-900 hover:bg-navy-900/[0.045]'
                            }`}
                          >
                            <span>{option.label}</span>
                            <span className="font-mono text-[10px] text-navy-500">{option.hint}</span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="p-4 lg:p-5">
                {allFolderItems.length === 0 && childFolders.length === 0 ? (
                  <div className="grid min-h-[50vh] place-items-center lg:h-full">
                    <div className="rounded-[22px] border border-dashed border-navy-900/15 bg-white/40 px-6 py-10 text-center">
                      <p className="text-[15px] font-bold text-navy-900">Pasta vazia</p>
                      <p className="mx-auto mt-1 max-w-xs text-[13px] text-navy-500">
                        Crie um item ou uma subpasta para começar a organizar este contexto.
                      </p>
                      <button
                        type="button"
                        onClick={() => handleNewItem(selectedId)}
                        className="mt-4 inline-flex h-9 items-center rounded-full bg-navy-900 px-4 text-[13px] font-bold text-white"
                      >
                        Novo item
                      </button>
                    </div>
                  </div>
                ) : viewMode === 'kanban' ? (
                  <div className="flex min-h-[60vh] gap-3.5 overflow-x-auto">
                    {kanbanColumns.map((column) => (
                      <div
                        key={column.id}
                        // ID 034: clique direito no quadro/coluna abre o menu da pasta correspondente
                        // (cards param o contextmenu via stopPropagation, então não conflita com itens).
                        onContextMenu={(e) => {
                          if (column.id !== 'root' && folderById.has(column.id)) {
                            e.preventDefault()
                            openFolderMenu(column.id, e.clientX, e.clientY)
                          }
                        }}
                        className="flex w-72 shrink-0 flex-col overflow-hidden rounded-[24px] border border-white/62 bg-white/46"
                      >
                        <div className="flex items-center gap-2 border-b border-navy-900/[0.06] px-3.5 py-3">
                          <span className="h-2 w-2 rounded-full bg-brand-500 shadow-[0_0_9px_rgba(47,107,255,.45)]" />
                          {column.id !== selectedId && column.id !== 'root' ? (
                            <button
                              type="button"
                              onClick={() => selectFolder(column.id)}
                              className="min-w-0 flex-1 truncate text-left text-[13px] font-black text-navy-900 hover:text-brand-600"
                              title={`Abrir ${column.title}`}
                            >
                              {column.title}
                            </button>
                          ) : (
                            <b className="min-w-0 flex-1 truncate text-[13px] font-black text-navy-900">{column.title}</b>
                          )}
                          <span className="ml-auto font-mono text-[10px] text-navy-500">{column.items.length}</span>
                        </div>
                        <div className="flex flex-1 flex-col gap-2.5 p-3">
                          {column.items.length === 0 ? (
                            <p className="px-1 py-3 text-center font-mono text-[11px] text-navy-300">Vazio</p>
                          ) : (
                            column.items.map((item) => (
                              <ContentCard key={item.id} item={item} onOpen={handleOpenItem} />
                            ))
                          )}
                          <button
                            type="button"
                            onClick={() => handleNewItem(column.id === 'root' ? selectedId : column.id)}
                            className="mt-1 flex items-center gap-1.5 rounded-[14px] border border-dashed border-navy-900/12 px-3 py-2 text-[12px] font-semibold text-navy-500 hover:border-brand-300 hover:text-brand-600"
                          >
                            + Adicionar
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    {/* Subpastas navegáveis: garante entrar em pastas que só têm subpastas (ID 008). */}
                    {childFolders.length > 0 ? (
                      <div className="mb-5">
                        <div className="mb-2 px-1 font-mono text-[10px] font-extrabold uppercase tracking-[0.10em] text-navy-500">
                          Subpastas
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          {childFolders.map((sub) => (
                            <RootFolderCard
                              key={sub.id}
                              folder={sub}
                              subCount={sub.children.length}
                              count={counts.get(sub.id) ?? 0}
                              onOpen={selectFolder}
                              onMenu={openFolderMenu}
                            />
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {allFolderItems.length > 0 ? (
                      <div className="overflow-hidden rounded-[22px] border border-white/62 bg-white/50">
                        {allFolderItems.map((item) => (
                          <ContentRow
                            key={item.id}
                            item={item}
                            onOpen={handleOpenItem}
                            onToggle={toggleItemDone}
                            temporarilyDone={temporarilyDone.has(item.id)}
                          />
                        ))}
                      </div>
                    ) : null}
                    {/* ID 066: botão Adicionar também no modo lista (desktop + mobile),
                        mesmo padrão do Kanban; cria na pasta atual. */}
                    <button
                      type="button"
                      onClick={() => handleNewItem(selectedId)}
                      className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-[16px] border border-dashed border-navy-900/15 px-3 py-3 text-[13px] font-bold text-navy-600 hover:border-brand-300 hover:text-brand-600"
                    >
                      + Adicionar
                    </button>
                  </>
                )}
              </div>
            </>
          ) : folders.length === 0 ? (
            <div className="grid min-h-[50vh] place-items-center p-8 lg:h-full">
              <div className="max-w-sm text-center">
                <p className="text-[18px] font-black text-navy-900">Crie sua primeira pasta</p>
                <p className="mt-1.5 text-[13px] text-navy-500">
                  Pastas e subpastas são o contexto principal das notas, tarefas, eventos e referências.
                </p>
                <button
                  type="button"
                  onClick={handleNewFolder}
                  className="mt-4 inline-flex h-10 items-center rounded-full bg-[linear-gradient(135deg,#2F6BFF,#7B5BFF)] px-5 text-[14px] font-bold text-white"
                >
                  Nova pasta
                </button>
              </div>
            </div>
          ) : (
            // Raiz das notas: grade de pastas para o usuário escolher (sem abrir nenhuma automaticamente).
            <>
              <div className="border-b border-navy-900/[0.07] bg-[radial-gradient(560px_260px_at_100%_0%,rgba(47,107,255,.16),transparent_68%),rgba(255,255,255,.66)] px-5 pb-4 pt-5 lg:px-6">
                <div className="font-mono text-[10px] font-extrabold uppercase tracking-[0.08em] text-navy-500">Notas</div>
                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3">
                  <h1 className="text-[28px] font-black leading-none -tracking-[.05em] text-navy-900">Pastas</h1>
                  <button
                    type="button"
                    onClick={handleNewFolder}
                    className="inline-flex h-[38px] items-center rounded-full bg-[linear-gradient(135deg,#2F6BFF,#7B5BFF)] px-3.5 text-[13px] font-extrabold text-white"
                  >
                    Nova pasta
                  </button>
                </div>
              </div>
              <div className="p-4 lg:p-5">
                {pinnedFolders.length > 0 || pinnedNotes.length > 0 ? (
                  <>
                    <div className="mb-2 px-1 font-mono text-[10px] font-extrabold uppercase tracking-[0.10em] text-navy-500">Destacadas</div>
                    <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {pinnedFolders.map((folder) => (
                        <RootFolderCard key={folder.id} folder={folder} pinned subCount={findNode(tree, folder.id)?.children.length ?? 0} count={counts.get(folder.id) ?? 0} onOpen={selectFolder} onMenu={openFolderMenu} />
                      ))}
                      {pinnedNotes.map((note) => (
                        <ContentCard key={note.id} item={note} onOpen={handleOpenItem} />
                      ))}
                    </div>
                  </>
                ) : null}
                <div className="mb-2 px-1 font-mono text-[10px] font-extrabold uppercase tracking-[0.10em] text-navy-500">Todas</div>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {rootFolders.map((folder) => (
                    <RootFolderCard key={folder.id} folder={folder} subCount={findNode(tree, folder.id)?.children.length ?? 0} count={counts.get(folder.id) ?? 0} onOpen={selectFolder} onMenu={openFolderMenu} />
                  ))}
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      {mobileFoldersOpen ? (
        <div className="fixed inset-0 z-[200] lg:hidden" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-navy-900/35 backdrop-blur-[2px]"
            onClick={() => setMobileFoldersOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 grid w-[min(86vw,340px)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden border-r border-white/55 bg-white/92 shadow-cool-lg backdrop-blur-2xl">
            <button
              type="button"
              onClick={() => setMobileFoldersOpen(false)}
              className="absolute right-3 top-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-navy-900/[0.06] text-navy-500 hover:bg-navy-900/[0.10] hover:text-navy-900"
              aria-label="Fechar navegador de pastas"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
            {folderNavContent}
          </div>
        </div>
      ) : null}

      {kanbanFocusOpen && viewMode === 'kanban' && selectedFolder ? (
        <div className="fixed inset-0 z-[210] flex flex-col bg-[#EEF3FA] text-navy-900" role="dialog" aria-modal="true">
          <div className="flex shrink-0 items-center gap-3 border-b border-white/70 bg-white/82 px-4 py-3 shadow-cool-sm backdrop-blur-2xl">
            <div className="min-w-0 flex-1">
              <div className="font-mono text-[10px] font-extrabold uppercase tracking-[0.08em] text-navy-500">
                Kanban em foco
              </div>
              <h2 className="truncate text-[18px] font-black leading-tight text-navy-900">
                {selectedFolder.name}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setKanbanFocusOpen(false)}
              className="inline-flex h-9 items-center gap-2 rounded-full bg-navy-900 px-3 text-[13px] font-bold text-white shadow-cool-sm transition-colors hover:bg-navy-800"
              title="Sair do modo foco"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M16 21v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
              </svg>
              Sair
            </button>
          </div>
          <div className="min-h-0 flex-1 py-4">
            {renderKanbanBoard(true)}
          </div>
        </div>
      ) : null}

      {agentsForId ? (
        <AgentsEditorModal
          folderId={agentsForId}
          title={`AGENTS.md / ${folderById.get(agentsForId)?.name ?? 'pasta'}`}
          open={Boolean(agentsForId)}
          onClose={() => setAgentsForId(null)}
        />
      ) : null}

      {folderMenu && folderById.get(folderMenu.folderId) ? (
        <FolderMenu
          folder={folderById.get(folderMenu.folderId)!}
          breadcrumbLabel={buildBreadcrumb(folders, folderMenu.folderId).map((f) => f.name).join(' / ') || 'Notas'}
          count={counts.get(folderMenu.folderId) ?? 0}
          pinned={prefs.pinnedFolderIds.includes(folderMenu.folderId)}
          viewMode={folderById.get(folderMenu.folderId)?.viewMode === 'kanban' ? 'kanban' : 'list'}
          folders={folders}
          x={folderMenu.x}
          y={folderMenu.y}
          initialSub={folderMenu.initialSub}
          onClose={() => setFolderMenu(null)}
          onOpen={() => { selectFolder(folderMenu.folderId); setFolderMenu(null) }}
          onTogglePin={() => { togglePinnedFor(folderMenu.folderId); setFolderMenu(null) }}
          onNewSub={() => { const id = folderMenu.folderId; setFolderMenu(null); void newSubfolderFor(id) }}
          onSetView={(mode) => { void updateFolder(folderMenu.folderId, { viewMode: mode, viewModeManual: true }); setFolderMenu(null) }}
          onRename={() => { const id = folderMenu.folderId; setFolderMenu(null); void renameFolder(id) }}
          onMove={(parentId) => { void moveFolder(folderMenu.folderId, parentId); setFolderMenu(null) }}
          onAgents={() => { setAgentsForId(folderMenu.folderId); setFolderMenu(null) }}
          onCopyLink={() => { copyFolderLink(folderMenu.folderId); setFolderMenu(null) }}
          onDelete={() => { const id = folderMenu.folderId; setFolderMenu(null); void deleteFolderWithConfirm(id) }}
          onToggleHideCompleted={() => {
            const folderId = folderMenu.folderId
            const f = folderById.get(folderId)
            const newVal = f ? f.hideCompleted !== false : true
            void updateFolder(folderId, { hideCompleted: !newVal })
            setFolderMenu(null)
          }}
          onReorder={(direction) => {
            const folderId = folderMenu.folderId
            const index = prefs.pinnedFolderIds.indexOf(folderId)
            if (index !== -1) {
              const nextIds = [...prefs.pinnedFolderIds]
              if (direction === 'up' && index > 0) {
                const temp = nextIds[index]!
                nextIds[index] = nextIds[index - 1]!
                nextIds[index - 1] = temp
                update({ pinnedFolderIds: nextIds })
              } else if (direction === 'down' && index < nextIds.length - 1) {
                const temp = nextIds[index]!
                nextIds[index] = nextIds[index + 1]!
                nextIds[index + 1] = temp
                update({ pinnedFolderIds: nextIds })
              }
            }
            setFolderMenu(null)
          }}
          onClearCompleted={async () => {
            const folderId = folderMenu.folderId
            const completedItems = items.filter(
              (it) => it.folderId === folderId && it.status === 'done' && !it.clearedAt,
            )
            if (completedItems.length > 0) {
              await bulkUpdateItems({
                ids: completedItems.map((it) => it.id),
                // Oculta da pasta sem removê-la: mantém folderId e status done (ID 036).
                patch: { clearedAt: new Date().toISOString() },
              })
            }
            setFolderMenu(null)
          }}
        />
      ) : null}
    </div>
  )
}

export default function NotasPage() {
  return (
    <Suspense fallback={<div className="px-4 pt-6 font-mono text-[12px] text-navy-500 lg:px-8">Carregando pastas…</div>}>
      <NotasBrowser />
    </Suspense>
  )
}
