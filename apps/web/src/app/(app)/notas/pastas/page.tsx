'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { Item } from '@doit/types'
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  useFolders,
  buildFolderTree,
  createFolder,
  deleteFolder,
  updateFolder,
  type FolderTreeNode,
} from '@/hooks/use-folders'
import { useItems } from '@/hooks/use-items'
import { useDialog } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/toast'
import { AgentsEditorModal } from '@/components/agents/agents-editor-modal'
import { usePreferences } from '@/hooks/use-preferences'
import { CardTitle, GlassCard, MetricCard } from '@/components/ui/bento'
import { useUI } from '@/store/ui'
import { buildTagGraph } from '@/lib/note-relations'

function StarIcon({
  filled = false,
  className = 'h-4 w-4',
}: {
  filled?: boolean
  className?: string
}) {
  return (
    <svg
      className={className}
      fill={filled ? 'currentColor' : 'none'}
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m12 3.8 2.6 5.2 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8L12 3.8Z"
      />
    </svg>
  )
}

function FolderRow({
  node,
  depth,
  expanded,
  toggle,
  noteCounts,
  index,
  siblingsCount,
  onMove,
  pinned,
  onTogglePinned,
  busy,
}: {
  node: FolderTreeNode
  depth: number
  expanded: Set<string>
  toggle: (id: string) => void
  noteCounts: Map<string, number>
  index: number
  siblingsCount: number
  onMove: (parentId: string | null, fromIndex: number, direction: -1 | 1) => Promise<void>
  pinned: boolean
  onTogglePinned: (id: string) => void
  busy: boolean
}) {
  const [actionsOpen, setActionsOpen] = useState(false)
  const [agentsOpen, setAgentsOpen] = useState(false)
  const hasChildren = node.children.length > 0
  const isOpen = expanded.has(node.id)
  const noteCount = noteCounts.get(node.id) ?? 0
  const { confirm, prompt } = useDialog()
  const canUp = index > 0 && !busy
  const canDown = index < siblingsCount - 1 && !busy
  const draggableId = `folder:${node.id}`
  const droppableId = `folder-into:${node.id}`
  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    isDragging,
  } = useDraggable({
    id: draggableId,
    data: { folderId: node.id },
  })
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: droppableId,
    data: { folderId: node.id },
  })

  async function handleRename() {
    const next = await prompt({
      title: 'Renomear pasta',
      message: 'Novo nome',
      defaultValue: node.name,
    })
    if (!next?.trim() || next === node.name) return
    await updateFolder(node.id, { name: next.trim() })
  }

  async function handleDelete() {
    const ok = await confirm({
      title: 'Apagar pasta',
      message: `Apagar pasta "${node.name}" e todas as subpastas? As notas voltam para a raiz.`,
      confirmLabel: 'Apagar',
      variant: 'danger',
    })
    if (!ok) return
    await deleteFolder(node.id)
  }

  async function handleNewSub() {
    const name = await prompt({
      title: 'Nova subpasta',
      message: 'Nome da subpasta',
      placeholder: 'Nome',
    })
    if (!name?.trim()) return
    await createFolder({ name: name.trim(), parentId: node.id })
  }

  return (
    <>
      <div
        ref={setDropRef}
        className={`group flex min-h-14 items-center gap-2 border-b border-ui-border-soft py-2 pr-2 text-[14px] last:border-b-0 transition-colors ${
          isDragging ? 'opacity-50' : ''
        } ${isOver ? 'bg-brand-50' : ''}`}
        style={{ paddingLeft: `${10 + depth * 14}px` }}
      >
        <button
          ref={setDragRef}
          {...attributes}
          {...listeners}
          type="button"
          title="Arrastar"
          aria-label={`Arrastar ${node.name}`}
          className="hidden h-9 w-6 shrink-0 cursor-grab touch-none items-center justify-center text-navy-300 hover:text-navy-600 active:cursor-grabbing sm:flex"
        >
          <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
            <path d="M5 3a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm6 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2ZM5 7a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm6 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2ZM5 11a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm6 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => hasChildren && toggle(node.id)}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-transparent ${
            hasChildren
              ? 'bg-surface-soft text-navy-500 hover:border-ui-border-soft hover:bg-white'
              : 'text-transparent'
          }`}
          aria-label={hasChildren ? (isOpen ? 'Recolher' : 'Expandir') : ''}
        >
          {hasChildren ? (
            <svg
              className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-90' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="m9 6 6 6-6 6" />
            </svg>
          ) : null}
        </button>
        <Link
          href={`/notas/pastas/${node.id}`}
          className="flex min-w-0 flex-1 items-center gap-3 text-navy-900 hover:text-brand-600"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-soft text-navy-400">
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"
              />
            </svg>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium leading-5">{node.name}</span>
            <span className="block font-mono text-[10px] leading-4 text-navy-300">
              {node.children.length > 0
                ? `${node.children.length} subpasta${node.children.length === 1 ? '' : 's'}`
                : 'Pasta'}
            </span>
          </span>
          <span className="flex h-7 min-w-7 shrink-0 items-center justify-center rounded-md bg-surface-soft px-2 font-mono text-[11px] text-navy-400">
            {noteCount}
          </span>
        </Link>
        <div className="hidden shrink-0 items-center gap-1 sm:flex">
          <button
            type="button"
            onClick={() => void onMove(node.parentId ?? null, index, -1)}
            disabled={!canUp}
            title="Mover para cima"
            aria-label={`Mover ${node.name} para cima`}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-navy-500 hover:bg-surface-soft disabled:opacity-30"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => void onMove(node.parentId ?? null, index, 1)}
            disabled={!canDown}
            title="Mover para baixo"
            aria-label={`Mover ${node.name} para baixo`}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-navy-500 hover:bg-surface-soft disabled:opacity-30"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12l7 7 7-7" />
            </svg>
          </button>
        </div>
        <div className="hidden shrink-0 items-center gap-1 sm:flex sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
          <button
            type="button"
            onClick={() => onTogglePinned(node.id)}
            className={`flex h-9 w-9 items-center justify-center rounded-lg hover:bg-surface-soft ${
              pinned ? 'text-brand-600' : 'text-navy-500'
            }`}
            title={pinned ? 'Desafixar' : 'Fixar'}
            aria-label={`${pinned ? 'Desafixar' : 'Fixar'} ${node.name}`}
          >
            <StarIcon filled={pinned} />
          </button>
          <button
            type="button"
            onClick={handleNewSub}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-navy-500 hover:bg-surface-soft"
            title="Subpasta"
            aria-label={`Criar subpasta em ${node.name}`}
          >
            +
          </button>
          <button
            type="button"
            onClick={handleRename}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-navy-500 hover:bg-surface-soft"
            title="Renomear"
            aria-label={`Renomear ${node.name}`}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m16.9 4.6 2.5 2.5M4 20h4.5L20 8.5a1.8 1.8 0 0 0 0-2.5L18 4a1.8 1.8 0 0 0-2.5 0L4 15.5V20Z"
              />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => setAgentsOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-navy-500 hover:bg-surface-soft"
            title="AGENTS.md"
            aria-label={`Editar AGENTS.md de ${node.name}`}
          >
            <span className="font-mono text-[10px] font-bold">AI</span>
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-red-500 hover:bg-red-50"
            title="Apagar"
            aria-label={`Apagar ${node.name}`}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 7h14M10 11v6M14 11v6M9 7l1-3h4l1 3M7 7l1 13h8l1-13"
              />
            </svg>
          </button>
        </div>
        <button
          type="button"
          onClick={() => setActionsOpen((open) => !open)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-ui-border-soft bg-white text-navy-500 sm:hidden"
          title="Acoes"
          aria-label={`Acoes de ${node.name}`}
          aria-expanded={actionsOpen}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="5" cy="12" r="1.8" />
            <circle cx="12" cy="12" r="1.8" />
            <circle cx="19" cy="12" r="1.8" />
          </svg>
        </button>
      </div>
      {actionsOpen && (
        <div
          className="grid grid-cols-7 gap-1 border-b border-ui-border-soft bg-surface-soft px-3 py-2 sm:hidden"
          style={{ paddingLeft: `${10 + depth * 14}px` }}
        >
          <button
            type="button"
            onClick={() => void onMove(node.parentId ?? null, index, -1)}
            disabled={!canUp}
            className="h-10 rounded-lg bg-white text-[11px] font-medium text-navy-500 disabled:opacity-30"
          >
            Subir
          </button>
          <button
            type="button"
            onClick={() => void onMove(node.parentId ?? null, index, 1)}
            disabled={!canDown}
            className="h-10 rounded-lg bg-white text-[11px] font-medium text-navy-500 disabled:opacity-30"
          >
            Descer
          </button>
          <button
            type="button"
            onClick={() => onTogglePinned(node.id)}
            className={`h-10 rounded-lg bg-white text-[11px] font-medium ${
              pinned ? 'text-brand-600' : 'text-navy-500'
            }`}
          >
            {pinned ? 'Soltar' : 'Fixar'}
          </button>
          <button
            type="button"
            onClick={handleNewSub}
            className="h-10 rounded-lg bg-white text-[11px] font-medium text-navy-500"
          >
            Sub
          </button>
          <button
            type="button"
            onClick={handleRename}
            className="h-10 rounded-lg bg-white text-[11px] font-medium text-navy-500"
          >
            Editar
          </button>
          <button
            type="button"
            onClick={() => setAgentsOpen(true)}
            className="h-10 rounded-lg bg-white text-[11px] font-medium text-navy-500"
          >
            IA
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="h-10 rounded-lg bg-white text-[11px] font-medium text-red-500"
          >
            Apagar
          </button>
        </div>
      )}
      <AgentsEditorModal
        folderId={node.id}
        title={`AGENTS.md / ${node.name}`}
        open={agentsOpen}
        onClose={() => setAgentsOpen(false)}
      />
      {hasChildren &&
        isOpen &&
        node.children.map((child, childIndex) => (
          <FolderRow
            key={child.id}
            node={child}
            depth={depth + 1}
            expanded={expanded}
            toggle={toggle}
            noteCounts={noteCounts}
            index={childIndex}
            siblingsCount={node.children.length}
            onMove={onMove}
            pinned={pinned}
            onTogglePinned={onTogglePinned}
            busy={busy}
          />
        ))}
    </>
  )
}

function collectIds(nodes: FolderTreeNode[], acc: string[] = []) {
  for (const node of nodes) {
    if (node.children.length > 0) {
      acc.push(node.id)
      collectIds(node.children, acc)
    }
  }
  return acc
}

function RootDropZone() {
  const { setNodeRef, isOver } = useDroppable({
    id: 'folder-into:__root__',
    data: { folderId: null },
  })
  return (
    <div
      ref={setNodeRef}
      className={`mb-3 flex h-12 items-center justify-center rounded-[18px] border border-dashed text-[12px] font-bold transition-colors ${
        isOver
          ? 'border-brand-400 bg-brand-50/90 text-brand-700'
          : 'border-white/65 bg-white/38 text-navy-400'
      }`}
    >
      Solte aqui para mover para a raiz
    </div>
  )
}

const lightCardTone =
  '!border-white/80 !bg-white/[0.86] shadow-[0_1px_0_rgba(255,255,255,.86)_inset,0_-1px_0_rgba(15,35,66,.04)_inset,0_18px_40px_-16px_rgba(15,35,66,.20),0_4px_12px_rgba(15,35,66,.08)]'

const noteAccents = [
  {
    card: 'border-brand-100 bg-white',
    file: 'text-brand-700',
    strip: 'from-brand-500 to-teal-500',
    icon: 'bg-brand-50 text-brand-700',
  },
  {
    card: 'border-violet-100 bg-[#fbf9ff]',
    file: 'text-[#7B5BFF]',
    strip: 'from-[#7B5BFF] to-[#FF6FAE]',
    icon: 'bg-[#f0ecff] text-[#7B5BFF]',
  },
  {
    card: 'border-teal-100 bg-[#f7fffd]',
    file: 'text-teal-600',
    strip: 'from-teal-500 to-cyan-500',
    icon: 'bg-teal-50 text-teal-700',
  },
  {
    card: 'border-pink-100 bg-[#fff8fc]',
    file: 'text-[#c0297a]',
    strip: 'from-[#FF6FAE] to-warning',
    icon: 'bg-[#ffeaf4] text-[#c0297a]',
  },
  {
    card: 'border-amber-100 bg-[#fffdf4]',
    file: 'text-[#b56b00]',
    strip: 'from-warning to-brand-500',
    icon: 'bg-amber-50 text-[#b56b00]',
  },
  {
    card: 'border-cyan-100 bg-[#f7fcff]',
    file: 'text-[#0a7da0]',
    strip: 'from-cyan-500 to-brand-500',
    icon: 'bg-cyan-50 text-[#0a7da0]',
  },
]

type NoteAccent = (typeof noteAccents)[number]

function getNoteAccent(index: number): NoteAccent {
  return noteAccents[index % noteAccents.length] ?? noteAccents[0]!
}

function stripMarkdown(content: string | undefined) {
  return (content ?? '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/!\[[^\]]*]\([^)]*\)/g, '')
    .replace(/\[[^\]]+]\([^)]*\)/g, '$1')
    .replace(/[`*_>#-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function noteFileName(item: Item) {
  if (item.localPath) return item.localPath.split(/[\\/]/).pop() ?? `${item.title}.md`
  const base = item.title
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 34)
  return `${base || 'nota'}.md`
}

function relativeEditedLabel(value: string) {
  const time = new Date(value).getTime()
  if (!Number.isFinite(time)) return 'agora'
  const diff = Date.now() - time
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour
  if (diff < minute) return 'agora'
  if (diff < hour) return `${Math.floor(diff / minute)}m`
  if (diff < day) return `${Math.floor(diff / hour)}h`
  if (diff < day * 7) return `${Math.floor(diff / day)}d`
  return new Date(value)
    .toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
    .replace('.', '')
}

function noteWordCount(item: Item) {
  const text = stripMarkdown(item.contentMd || item.title)
  return text ? text.split(/\s+/).length : 0
}

function NoteLibraryCard({
  item,
  index,
  onOpen,
}: {
  item: Item
  index: number
  onOpen: (id: string) => void
}) {
  const accent = getNoteAccent(index)
  const tags = item.tags.slice(0, 2)
  const snippet =
    stripMarkdown(item.contentMd) || 'Nota sem corpo ainda. Abra para continuar escrevendo.'
  return (
    <button
      type="button"
      onClick={() => onOpen(item.id)}
      className={`group relative flex min-h-[145px] flex-col rounded-[18px] border p-4 text-left shadow-[0_1px_2px_rgba(15,35,66,.04),0_8px_20px_-10px_rgba(15,35,66,.15)] transition hover:-translate-y-0.5 hover:shadow-cool-lg ${accent.card}`}
    >
      <span className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent.strip}`} />
      <span className="flex items-center gap-2">
        <span className={`truncate font-mono text-[10px] font-bold ${accent.file}`}>
          M↓ {noteFileName(item)}
        </span>
        {index < 2 ? (
          <StarIcon filled className="ml-auto h-3.5 w-3.5 shrink-0 text-warning" />
        ) : null}
      </span>
      <span className="mt-3 line-clamp-2 text-[15px] font-black leading-tight text-navy-950">
        {item.title}
      </span>
      <span className="mt-2 line-clamp-2 text-[12px] leading-relaxed text-navy-500">{snippet}</span>
      <span className="mt-auto flex items-center gap-1.5 pt-3">
        {tags.length > 0 ? (
          tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-navy-900/[0.04] px-2 py-0.5 font-mono text-[10px] text-navy-500"
            >
              #{tag}
            </span>
          ))
        ) : (
          <span className="rounded-full bg-navy-900/[0.04] px-2 py-0.5 font-mono text-[10px] text-navy-400">
            #nota
          </span>
        )}
        <span className="ml-auto font-mono text-[10px] text-navy-400">
          {relativeEditedLabel(item.updatedAt)}
        </span>
      </span>
    </button>
  )
}

const starterNotes = [
  {
    file: 'release-notes.md',
    title: 'Ship v0.4',
    snippet: 'Template para notas de release, checkboxes e plano de publicacao.',
    tags: ['release', 'docs'],
  },
  {
    file: 'q3-plan.md',
    title: 'Plano trimestral',
    snippet: 'Metas, apostas, riscos aceitos e decisoes que precisam virar itens.',
    tags: ['planning'],
  },
  {
    file: 'meeting-notes.md',
    title: 'Notas de reuniao',
    snippet: 'Acoes capturadas, responsaveis e proximos passos em uma unica nota.',
    tags: ['meeting'],
  },
  {
    file: 'ideas.md',
    title: 'Spark file',
    snippet: 'Um arquivo vivo para ideias pequenas antes de virarem tarefas ou pastas.',
    tags: ['idea'],
  },
  {
    file: 'reading.md',
    title: 'Lista de leitura',
    snippet: 'Livros, posts e referencias para revisar quando houver tempo.',
    tags: ['reading'],
  },
  {
    file: 'arch.md',
    title: 'Arquitetura',
    snippet: 'Decisoes tecnicas, tradeoffs e links importantes do produto.',
    tags: ['arch'],
  },
]

function StarterNoteCard({
  note,
  index,
  onCreate,
}: {
  note: (typeof starterNotes)[number]
  index: number
  onCreate: () => void
}) {
  const accent = getNoteAccent(index)
  const bg =
    ['#ffffff', '#fbf9ff', '#f7fffd', '#fff8fc', '#fffdf4', '#f7fcff'][index % 6] ?? '#ffffff'
  return (
    <button
      type="button"
      onClick={onCreate}
      className={`group relative flex min-h-[145px] flex-col rounded-[18px] border p-4 text-left shadow-[0_1px_2px_rgba(15,35,66,.04),0_8px_20px_-10px_rgba(15,35,66,.15)] transition hover:-translate-y-0.5 hover:shadow-cool-lg ${accent.card}`}
      style={{ backgroundColor: bg, color: '#0F2342' }}
    >
      <span className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent.strip}`} />
      <span className={`truncate font-mono text-[10px] font-bold ${accent.file}`}>
        M↓ {note.file}
      </span>
      <span
        className="mt-3 line-clamp-2 text-[15px] font-black leading-tight"
        style={{ color: '#0F2342' }}
      >
        {note.title}
      </span>
      <span className="mt-2 line-clamp-2 text-[12px] leading-relaxed" style={{ color: '#46587A' }}>
        {note.snippet}
      </span>
      <span className="mt-auto flex items-center gap-1.5 pt-3">
        {note.tags.map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-navy-900/[0.04] px-2 py-0.5 font-mono text-[10px] text-navy-500"
          >
            #{tag}
          </span>
        ))}
        <span className="ml-auto font-mono text-[10px] text-brand-700">template</span>
      </span>
    </button>
  )
}

function MobileNoteRow({
  item,
  index,
  onOpen,
}: {
  item: Item
  index: number
  onOpen: (id: string) => void
}) {
  const accent = getNoteAccent(index)
  const tags = item.tags.slice(0, 2)
  return (
    <button
      type="button"
      onClick={() => onOpen(item.id)}
      className={`relative w-full overflow-hidden rounded-[18px] border bg-white/88 p-4 text-left shadow-cool-sm ${accent.card}`}
    >
      <div className="flex items-center gap-2">
        <span className={`truncate font-mono text-[10px] font-bold ${accent.file}`}>
          M↓ {noteFileName(item)}
        </span>
        {index < 2 ? <StarIcon filled className="h-3.5 w-3.5 text-warning" /> : null}
        <span className="ml-auto font-mono text-[10px] text-navy-400">
          {relativeEditedLabel(item.updatedAt)}
        </span>
      </div>
      <div className="mt-2 line-clamp-1 text-[16px] font-black text-navy-950">{item.title}</div>
      <div className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-navy-500">
        {stripMarkdown(item.contentMd) || 'Toque para continuar esta nota.'}
      </div>
      <div className="mt-3 flex items-center gap-1.5">
        {(tags.length ? tags : ['nota']).map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-navy-900/[0.04] px-2 py-0.5 font-mono text-[10px] text-navy-500"
          >
            #{tag}
          </span>
        ))}
        <span className="ml-auto text-navy-300">→</span>
      </div>
    </button>
  )
}

function EditorSpotlight({
  note,
  folderName,
  onOpen,
  onNewNote,
}: {
  note?: Item
  folderName?: string
  onOpen: () => void
  onNewNote: () => void
}) {
  const body = note ? stripMarkdown(note.contentMd) : ''
  const words = note ? noteWordCount(note) : 0
  return (
    <div className="relative z-10 flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-navy-500">
        <span className="text-navy-400">notes</span>
        <span className="text-navy-300">/</span>
        <span className="font-semibold text-brand-700">{folderName ?? 'inbox'}</span>
        <span className="text-navy-300">/</span>
        <span className="font-semibold text-brand-700">
          {note ? noteFileName(note) : 'nova-nota.md'}
        </span>
        <span className="ml-auto inline-flex items-center gap-1.5 font-semibold text-teal-600">
          <span className="h-1.5 w-1.5 rounded-full bg-teal-500 shadow-[0_0_6px_#28c7b7]" />
          synced
        </span>
      </div>
      <button type="button" onClick={note ? onOpen : onNewNote} className="mt-3 text-left">
        <h2 className="text-[34px] font-black leading-[1.03] text-navy-950 sm:text-[40px]">
          {note ? note.title : 'nova nota'}
          <span className="block bg-[linear-gradient(120deg,#2F6BFF,#7B5BFF_45%,#28C7B7)] bg-clip-text text-transparent">
            markdown vivo.
          </span>
        </h2>
      </button>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {(note?.tags?.length ? note.tags.slice(0, 3) : ['draft', 'notes', 'sync']).map(
          (tag, index) => (
            <span
              key={`${tag}-${index}`}
              className={`rounded px-2 py-1 font-mono text-[11px] ${
                index === 1
                  ? 'bg-teal-500/15 text-teal-700'
                  : index === 2
                    ? 'bg-[#7B5BFF]/12 text-[#7B5BFF]'
                    : 'bg-brand-500/10 text-brand-700'
              }`}
            >
              #{tag}
            </span>
          ),
        )}
      </div>
      <div className="mt-3 flex-1 overflow-hidden text-[13px] leading-relaxed text-navy-700">
        {body ? (
          <p className="line-clamp-5">{body}</p>
        ) : (
          <p>
            Capture ideias, referencias e checklists em Markdown. Cada nota continua sendo um Item
            sincronizavel.
          </p>
        )}
      </div>
      <div className="mt-3 flex items-center gap-3 font-mono text-[11px] text-navy-500">
        <span>{words} words</span>
        <span>{note ? relativeEditedLabel(note.updatedAt) : 'ready'}</span>
        <button
          type="button"
          onClick={note ? onOpen : onNewNote}
          className="ml-auto h-9 rounded-full bg-navy-900 px-4 text-[12px] font-bold text-white hover:bg-navy-800"
        >
          {note ? 'abrir nota' : 'criar nota'}
        </button>
      </div>
    </div>
  )
}

function NotesGraph({ notes }: { notes: Item[] }) {
  const graph = buildTagGraph(notes, 7)
  const positions = [
    { x: 190, y: 160, className: 'left-1/2 top-1/2' },
    { x: 62, y: 80, className: 'left-[16%] top-[25%]' },
    { x: 300, y: 64, className: 'left-[78%] top-[20%]' },
    { x: 54, y: 250, className: 'left-[14%] top-[78%]' },
    { x: 310, y: 260, className: 'left-[80%] top-[82%]' },
    { x: 228, y: 34, className: 'left-[60%] top-[12%]' },
    { x: 152, y: 292, className: 'left-[40%] top-[90%]' },
  ]
  return (
    <div className="relative min-h-0 flex-1 overflow-hidden rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,#0b1733,#0f2342_62%,#122a55)]">
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 380 320"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="notes-edge" x1="0" y1="0" x2="380" y2="320">
            <stop offset="0" stopColor="#2F6BFF" stopOpacity=".55" />
            <stop offset=".55" stopColor="#28C7B7" stopOpacity=".5" />
            <stop offset="1" stopColor="#7B5BFF" stopOpacity=".5" />
          </linearGradient>
        </defs>
        {graph.edges.map((edge, index) => {
          const source = positions[edge.sourceIndex]
          const target = positions[edge.targetIndex]
          if (!source || !target) return null
          return (
            <line
              key={`${edge.sourceIndex}-${edge.targetIndex}-${index}`}
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              stroke="url(#notes-edge)"
              strokeWidth={1 + Math.min(2, edge.score * 3)}
              strokeOpacity={0.42 + Math.min(0.36, edge.score)}
            />
          )
        })}
      </svg>
      {graph.nodes.length === 0 ? (
        <div className="absolute inset-0 grid place-items-center px-8 text-center text-sm text-white/58">
          Crie notas com tags dentro de pastas para formar o mapa.
        </div>
      ) : (
        graph.nodes.map((node, index) => (
          <span
            key={node.item.id}
            title={
              node.primaryTag
                ? `#${node.primaryTag} / ${node.relatedCount} relacoes na pasta`
                : 'sem tags compartilhadas'
            }
            className={`absolute max-w-[130px] -translate-x-1/2 -translate-y-1/2 truncate rounded-full border px-2.5 py-1.5 font-mono text-[10px] font-bold shadow-[0_10px_28px_rgba(0,0,0,.18)] ${
              index === 0
                ? 'border-white/25 bg-white text-navy-900'
                : index % 3 === 1
                  ? 'border-[#7B5BFF]/35 bg-[#7B5BFF]/25 text-white'
                  : index % 3 === 2
                    ? 'border-teal-300/35 bg-teal-400/20 text-teal-50'
                    : 'border-white/15 bg-white/12 text-white'
            } ${positions[index]?.className ?? ''}`}
          >
            {noteFileName(node.item)}
          </span>
        ))
      )}
      {graph.nodes.length > 0 && graph.edges.length === 0 ? (
        <div className="absolute bottom-3 left-3 right-3 rounded-full bg-white/10 px-3 py-1.5 text-center font-mono text-[10px] text-white/62">
          sem tags compartilhadas nesta pasta
        </div>
      ) : null}
    </div>
  )
}

export default function NotasPage() {
  const { folders, isLoading } = useFolders()
  const { items } = useItems()
  const { prompt } = useDialog()
  const { toast } = useToast()
  const { prefs, update } = usePreferences()
  const { setSingleSelection, openCapture } = useUI()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [reorderBusy, setReorderBusy] = useState(false)
  const [dragging, setDragging] = useState(false)

  const tree = useMemo(() => buildFolderTree(folders), [folders])
  const folderById = useMemo(() => new Map(folders.map((folder) => [folder.id, folder])), [folders])
  const pinnedFolderIds = useMemo(
    () => prefs.pinnedFolderIds.filter((folderId) => folderById.has(folderId)),
    [folderById, prefs.pinnedFolderIds],
  )
  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
  )

  function isDescendant(ancestorId: string, candidateId: string): boolean {
    if (ancestorId === candidateId) return true
    const queue = folders.filter((f) => f.parentId === ancestorId)
    while (queue.length > 0) {
      const next = queue.shift()
      if (!next) break
      if (next.id === candidateId) return true
      queue.push(...folders.filter((f) => f.parentId === next.id))
    }
    return false
  }

  async function handleDragEnd(event: DragEndEvent) {
    setDragging(false)
    const { active, over } = event
    if (!over) return
    const activeId = String(active.id)
    const overId = String(over.id)
    if (!activeId.startsWith('folder:') || !overId.startsWith('folder-into:')) return

    const sourceId = activeId.slice('folder:'.length)
    const targetKey = overId.slice('folder-into:'.length)
    const targetId = targetKey === '__root__' ? null : targetKey
    if (sourceId === targetId) return
    if (targetId && isDescendant(sourceId, targetId)) {
      toast('Não é possível mover uma pasta para dentro dela mesma.', 'error')
      return
    }
    const source = folders.find((f) => f.id === sourceId)
    if (!source) return
    if ((source.parentId ?? null) === targetId) return

    setReorderBusy(true)
    try {
      await updateFolder(sourceId, { parentId: targetId ?? null } as never)
      toast('Pasta movida', 'success')
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Erro ao mover pasta', 'error')
    } finally {
      setReorderBusy(false)
    }
  }

  async function handleMove(parentId: string | null, fromIndex: number, direction: -1 | 1) {
    if (reorderBusy) return
    const siblings = folders
      .filter((folder) => (folder.parentId ?? null) === parentId)
      .slice()
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'pt-BR'))
    const toIndex = fromIndex + direction
    if (fromIndex < 0 || fromIndex >= siblings.length) return
    if (toIndex < 0 || toIndex >= siblings.length) return

    const reordered = siblings.slice()
    const [moved] = reordered.splice(fromIndex, 1)
    if (!moved) return
    reordered.splice(toIndex, 0, moved)

    setReorderBusy(true)
    try {
      await Promise.all(
        reordered.map((folder, index) =>
          folder.order === (index + 1) * 1000
            ? null
            : updateFolder(folder.id, { order: (index + 1) * 1000 }),
        ),
      )
    } finally {
      setReorderBusy(false)
    }
  }
  const allParentIds = useMemo(() => collectIds(tree), [tree])
  const allExpanded = allParentIds.length > 0 && allParentIds.every((id) => expanded.has(id))

  const noteCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const item of items) {
      if (item.status === 'archived' || item.status === 'done') continue
      if (!item.folderId) continue
      counts.set(item.folderId, (counts.get(item.folderId) ?? 0) + 1)
    }
    return counts
  }, [items])
  const activeNoteCount = useMemo(
    () =>
      items.filter(
        (item) =>
          item.complexity === 'note' && item.status !== 'archived' && item.status !== 'done',
      ).length,
    [items],
  )
  const looseNoteCount = useMemo(
    () =>
      items.filter(
        (item) =>
          item.complexity === 'note' &&
          item.status !== 'archived' &&
          item.status !== 'done' &&
          !item.folderId,
      ).length,
    [items],
  )
  const activeNotes = useMemo(
    () =>
      items
        .filter(
          (item) =>
            item.complexity === 'note' && item.status !== 'archived' && item.status !== 'done',
        )
        .slice()
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [items],
  )
  const recentNotes = activeNotes.slice(0, 9)
  const featuredNote = activeNotes[0]
  const folderNameById = useMemo(
    () => new Map(folders.map((folder) => [folder.id, folder.name])),
    [folders],
  )
  const pinnedNotes = useMemo(() => {
    const pinnedSet = new Set(pinnedFolderIds)
    const fromPinnedFolders = activeNotes
      .filter((item) => item.folderId && pinnedSet.has(item.folderId))
      .slice(0, 4)
    return fromPinnedFolders.length > 0 ? fromPinnedFolders : activeNotes.slice(0, 4)
  }, [activeNotes, pinnedFolderIds])
  const topTags = useMemo(() => {
    const counts = new Map<string, number>()
    for (const note of activeNotes) {
      for (const tag of note.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR'))
      .slice(0, 5)
  }, [activeNotes])
  const totalWords = useMemo(
    () => activeNotes.reduce((sum, note) => sum + noteWordCount(note), 0),
    [activeNotes],
  )
  const weeklyEdited = useMemo(() => {
    const since = Date.now() - 7 * 24 * 60 * 60 * 1000
    return activeNotes.filter((note) => new Date(note.updatedAt).getTime() >= since).length
  }, [activeNotes])

  function toggle(id: string) {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    setExpanded(allExpanded ? new Set() : new Set(allParentIds))
  }

  function togglePinned(folderId: string) {
    const next = pinnedFolderIds.includes(folderId)
      ? pinnedFolderIds.filter((id) => id !== folderId)
      : [folderId, ...pinnedFolderIds]
    update({ pinnedFolderIds: next })
  }

  async function handleNewRoot() {
    const name = await prompt({
      title: 'Nova pasta',
      message: 'Nome da pasta',
      placeholder: 'Nome',
    })
    if (!name?.trim()) return
    await createFolder({ name: name.trim() })
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] px-4 pb-28 pt-4 sm:px-6 lg:px-8 lg:pb-8 lg:pt-1">
      <div className="lg:hidden">
        <header className="mb-4 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[11px] text-navy-500">
              {activeNoteCount} notas / synced
            </div>
            <h1 className="mt-1 text-[34px] font-black leading-none text-navy-950">
              <span className="bg-[linear-gradient(120deg,#2F6BFF,#7B5BFF_60%,#28C7B7)] bg-clip-text text-transparent">
                notes
              </span>
            </h1>
          </div>
          <button
            type="button"
            onClick={handleNewRoot}
            className="grid h-10 w-10 place-items-center rounded-[14px] border border-white/70 bg-white/68 text-navy-800 shadow-cool-sm backdrop-blur-xl"
            aria-label="Nova pasta"
            title="Nova pasta"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => openCapture('note')}
            className="grid h-10 w-10 place-items-center rounded-[14px] bg-[linear-gradient(135deg,#2F6BFF,#28C7B7)] text-white shadow-cool-md"
            aria-label="Nova nota"
            title="Nova nota"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
            </svg>
          </button>
        </header>

        <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
          <span className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-brand-500/25 bg-brand-500/10 px-4 text-[13px] font-bold text-brand-700">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
            all <span className="font-mono text-[10px]">{activeNoteCount}</span>
          </span>
          {folders.slice(0, 8).map((folder, index) => (
            <Link
              key={folder.id}
              href={`/notas/pastas/${folder.id}`}
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-white/65 bg-white/70 px-4 text-[13px] font-bold text-navy-800 backdrop-blur-xl"
            >
              <span
                className={`h-1.5 w-1.5 rounded-full ${index % 3 === 0 ? 'bg-teal-500' : index % 3 === 1 ? 'bg-[#7B5BFF]' : 'bg-warning'}`}
              />
              {folder.name}
              <span className="font-mono text-[10px] text-navy-400">
                {noteCounts.get(folder.id) ?? 0}
              </span>
            </Link>
          ))}
        </div>

        {pinnedNotes.length > 0 && (
          <>
            <div className="mb-2 flex items-center px-1 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-navy-500">
              Pinned <span className="ml-auto">{pinnedNotes.length}</span>
            </div>
            <div className="-mx-4 mb-5 flex gap-3 overflow-x-auto px-4 pb-2 [scrollbar-width:none]">
              {pinnedNotes.map((note, index) => {
                const accent = getNoteAccent(index)
                return (
                  <button
                    type="button"
                    key={note.id}
                    onClick={() => setSingleSelection(note.id)}
                    className={`relative w-[180px] shrink-0 overflow-hidden rounded-[18px] border bg-white p-3 text-left shadow-cool-sm ${accent.card}`}
                  >
                    <span
                      className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent.strip}`}
                    />
                    <div className={`truncate font-mono text-[10px] font-bold ${accent.file}`}>
                      M↓ {noteFileName(note)}
                    </div>
                    <div className="mt-2 line-clamp-2 text-[14px] font-black leading-tight text-navy-950">
                      {note.title}
                    </div>
                    <div className="mt-2 line-clamp-2 text-[11px] leading-relaxed text-navy-500">
                      {stripMarkdown(note.contentMd) || 'Sem corpo ainda.'}
                    </div>
                    <div className="mt-3 font-mono text-[10px] text-navy-400">
                      {relativeEditedLabel(note.updatedAt)}
                    </div>
                  </button>
                )
              })}
            </div>
          </>
        )}

        <div className="mb-2 flex items-center px-1 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-navy-500">
          Recent <span className="ml-auto">edited</span>
        </div>
        <div className="space-y-3">
          {recentNotes.length === 0
            ? starterNotes.slice(0, 5).map((note, index) => {
                const accent = getNoteAccent(index)
                const bg =
                  ['#ffffff', '#fbf9ff', '#f7fffd', '#fff8fc', '#fffdf4'][index] ?? '#ffffff'
                return (
                  <button
                    type="button"
                    key={note.file}
                    onClick={() => openCapture('note')}
                    className={`relative w-full overflow-hidden rounded-[18px] border bg-white/88 p-4 text-left shadow-cool-sm ${accent.card}`}
                    style={{ backgroundColor: bg, color: '#0F2342' }}
                  >
                    <div className="flex items-center gap-2">
                      <span className={`truncate font-mono text-[10px] font-bold ${accent.file}`}>
                        M↓ {note.file}
                      </span>
                      <span className="ml-auto font-mono text-[10px] text-brand-700">template</span>
                    </div>
                    <div
                      className="mt-2 line-clamp-1 text-[16px] font-black"
                      style={{ color: '#0F2342' }}
                    >
                      {note.title}
                    </div>
                    <div
                      className="mt-1 line-clamp-2 text-[12px] leading-relaxed"
                      style={{ color: '#46587A' }}
                    >
                      {note.snippet}
                    </div>
                    <div className="mt-3 flex items-center gap-1.5">
                      {note.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-navy-900/[0.04] px-2 py-0.5 font-mono text-[10px] text-navy-500"
                        >
                          #{tag}
                        </span>
                      ))}
                      <span className="ml-auto text-navy-300">→</span>
                    </div>
                  </button>
                )
              })
            : recentNotes.map((note, index) => (
                <MobileNoteRow
                  key={note.id}
                  item={note}
                  index={index}
                  onOpen={setSingleSelection}
                />
              ))}
        </div>
      </div>

      <div className="hidden lg:block">
        <div className="grid auto-rows-[230px] grid-cols-12 gap-[18px]">
          <GlassCard className={`col-span-3 flex flex-col p-5 ${lightCardTone}`}>
            <div className="mb-3 flex items-center justify-between">
              <CardTitle className="text-[14px] normal-case tracking-normal text-navy-900">
                writing stats
              </CardTitle>
              <span className="rounded-full bg-navy-900/[0.05] px-2.5 py-1 font-mono text-[11px] text-navy-500">
                week
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div
                className="grid h-[86px] w-[86px] place-items-center rounded-full"
                style={{
                  background: `conic-gradient(#2F6BFF 0deg, #7B5BFF ${Math.min(100, weeklyEdited * 12) * 1.8}deg, #28C7B7 ${Math.min(100, weeklyEdited * 12) * 3.6}deg, rgba(15,35,66,.10) 0deg)`,
                }}
              >
                <div className="grid h-[68px] w-[68px] place-items-center rounded-full bg-white/88 text-center shadow-cool-sm">
                  <b className="bg-[linear-gradient(120deg,#7B5BFF,#2F6BFF,#28C7B7)] bg-clip-text text-xl font-black leading-none text-transparent">
                    {Math.min(99, Math.max(1, weeklyEdited * 12))}%
                  </b>
                </div>
              </div>
              <div>
                <div className="text-[34px] font-black leading-none text-navy-950">
                  {activeNoteCount}
                </div>
                <div className="mt-1 font-mono text-[11px] text-navy-500">active notes</div>
              </div>
            </div>
            <div className="mt-auto grid grid-cols-2 gap-2 border-t border-navy-900/[0.06] pt-3">
              <MetricCard
                label="words"
                value={totalWords}
                detail="markdown"
                className="!bg-white/50"
              />
              <MetricCard
                label="loose"
                value={looseNoteCount}
                detail="inbox"
                className="!bg-white/50"
              />
            </div>
          </GlassCard>

          <GlassCard className={`relative col-span-6 overflow-hidden p-6 ${lightCardTone}`}>
            <div className="pointer-events-none absolute -right-20 -top-20 h-[360px] w-[360px] rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(123,91,255,.30),transparent_60%),radial-gradient(circle_at_70%_70%,rgba(40,199,183,.25),transparent_60%)] blur-xl" />
            <EditorSpotlight
              note={featuredNote}
              folderName={
                featuredNote?.folderId ? folderNameById.get(featuredNote.folderId) : undefined
              }
              onOpen={() => {
                if (featuredNote) setSingleSelection(featuredNote.id)
              }}
              onNewNote={() => openCapture('note')}
            />
          </GlassCard>

          <GlassCard className={`col-span-3 flex flex-col p-5 ${lightCardTone}`}>
            <div className="mb-3 flex items-center justify-between">
              <CardTitle className="text-[14px] normal-case tracking-normal text-navy-900">
                pinned shelf
              </CardTitle>
              <span className="rounded-full bg-navy-900/[0.05] px-2.5 py-1 font-mono text-[11px] text-navy-500">
                {pinnedNotes.length}
              </span>
            </div>
            <div className="min-h-0 flex-1 space-y-2 overflow-hidden">
              {pinnedNotes.length === 0 ? (
                <div className="rounded-[18px] bg-white/48 px-4 py-8 text-center text-sm text-navy-500">
                  Fixe pastas para destacar notas aqui.
                </div>
              ) : (
                pinnedNotes.slice(0, 4).map((note, index) => {
                  const accent = getNoteAccent(index)
                  return (
                    <button
                      type="button"
                      key={note.id}
                      onClick={() => setSingleSelection(note.id)}
                      className="flex w-full items-center gap-3 rounded-[14px] border border-navy-900/[0.04] bg-white px-3 py-2 text-left shadow-cool-sm hover:shadow-cool-md"
                    >
                      <span
                        className={`grid h-8 w-8 shrink-0 place-items-center rounded-[10px] font-mono text-[10px] font-black ${accent.icon}`}
                      >
                        MD
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-bold text-navy-950">
                          {note.title}
                        </span>
                        <span className="block truncate font-mono text-[10px] text-navy-400">
                          {noteFileName(note)}
                        </span>
                      </span>
                    </button>
                  )
                })
              )}
            </div>
          </GlassCard>

          <GlassCard className={`col-span-8 row-span-2 flex flex-col p-5 ${lightCardTone}`}>
            <div className="mb-3 flex items-center justify-between">
              <CardTitle className="text-[14px] normal-case tracking-normal text-navy-900">
                library
              </CardTitle>
              <span className="font-mono text-[11px] text-navy-500">
                sort / <b className="text-navy-900">edited</b>
              </span>
            </div>
            <div className="mb-3 flex gap-2 overflow-hidden">
              <span className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-navy-900 shadow-cool-sm">
                all
              </span>
              {topTags.map(([tag]) => (
                <span
                  key={tag}
                  className="rounded-full bg-navy-900/[0.05] px-3 py-1.5 text-xs font-bold text-navy-500"
                >
                  #{tag}
                </span>
              ))}
              {topTags.length === 0 ? (
                <span className="rounded-full bg-navy-900/[0.05] px-3 py-1.5 text-xs font-bold text-navy-500">
                  drafts
                </span>
              ) : null}
            </div>
            <div className="grid min-h-0 flex-1 grid-cols-3 gap-3 overflow-hidden">
              {recentNotes.length === 0
                ? starterNotes.map((note, index) => (
                    <StarterNoteCard
                      key={note.file}
                      note={note}
                      index={index}
                      onCreate={() => openCapture('note')}
                    />
                  ))
                : recentNotes
                    .slice(0, 6)
                    .map((note, index) => (
                      <NoteLibraryCard
                        key={note.id}
                        item={note}
                        index={index}
                        onOpen={setSingleSelection}
                      />
                    ))}
            </div>
          </GlassCard>

          <GlassCard className="col-span-4 row-span-2 flex flex-col overflow-hidden border-white/10 bg-transparent p-0 text-white shadow-[0_24px_60px_rgba(15,35,66,.28)]">
            <div className="flex h-full flex-col bg-[linear-gradient(180deg,#0b1733,#0f2342_62%,#122a55)] p-5">
              <div className="mb-4 flex items-center justify-between">
                <CardTitle className="text-[14px] normal-case tracking-normal text-white">
                  graph view
                </CardTitle>
                <span className="rounded-full bg-white/10 px-2.5 py-1 font-mono text-[11px] text-white/62">
                  {activeNotes.length} nodes
                </span>
              </div>
              <NotesGraph notes={activeNotes} />
              <div className="mt-3 flex gap-3 font-mono text-[10px]">
                <span className="text-[#79A6FF]">mesma pasta</span>
                <span className="text-[#5BE3D4]">tags em comum</span>
                <span className="text-[#B59BFF]">cluster</span>
              </div>
            </div>
          </GlassCard>

          <GlassCard className={`col-span-4 flex flex-col p-5 ${lightCardTone}`}>
            <div className="mb-3 flex items-center justify-between">
              <CardTitle className="text-[14px] normal-case tracking-normal text-navy-900">
                reading stack
              </CardTitle>
              <button
                type="button"
                onClick={() => openCapture('note')}
                className="rounded-full bg-navy-900/[0.05] px-3 py-1 font-mono text-[11px] font-bold text-navy-600"
              >
                nova
              </button>
            </div>
            <div className="flex min-h-0 flex-1 items-end gap-3">
              {(recentNotes.length > 0 ? recentNotes.slice(0, 5) : starterNotes.slice(0, 5)).map(
                (note, index) => (
                  <button
                    type="button"
                    key={'id' in note ? note.id : note.file}
                    onClick={() => {
                      if ('id' in note) setSingleSelection(note.id)
                      else openCapture('note')
                    }}
                    className={`flex min-h-[126px] flex-1 items-end rounded-[12px] px-2 pb-3 text-left shadow-cool-sm ${
                      index % 3 === 0
                        ? 'bg-[#fff7d6]'
                        : index % 3 === 1
                          ? 'bg-[#dbfbf5]'
                          : 'bg-[#eee8ff]'
                    }`}
                    style={{ transform: `rotate(${[-4, 3, -2, 4, -3][index] ?? 0}deg)` }}
                  >
                    <span className="line-clamp-4 [writing-mode:vertical-rl] font-mono text-[10px] font-bold text-navy-700">
                      {note.title}
                    </span>
                  </button>
                ),
              )}
            </div>
          </GlassCard>

          <GlassCard className={`col-span-5 flex flex-col p-5 ${lightCardTone}`}>
            <div className="mb-3 flex items-center justify-between">
              <CardTitle className="text-[14px] normal-case tracking-normal text-navy-900">
                folders garden
              </CardTitle>
              <div className="flex items-center gap-2">
                {allParentIds.length > 0 && (
                  <button
                    type="button"
                    onClick={toggleAll}
                    className="rounded-full bg-white/60 px-3 py-1 font-mono text-[11px] font-bold text-navy-600"
                  >
                    {allExpanded ? 'recolher' : 'expandir'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleNewRoot}
                  className="rounded-full bg-navy-900 px-3 py-1 font-mono text-[11px] font-bold text-white"
                >
                  pasta
                </button>
              </div>
            </div>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-12 animate-pulse rounded-[16px] bg-white/42" />
                ))}
              </div>
            ) : tree.length === 0 ? (
              <div className="rounded-[22px] border border-dashed border-white/70 bg-white/38 px-5 py-10 text-center">
                <p className="text-sm font-bold text-navy-900">Nenhuma pasta criada</p>
                <p className="mt-1 text-sm text-navy-500">
                  Crie a primeira pasta para organizar suas notas.
                </p>
              </div>
            ) : (
              <DndContext
                sensors={dndSensors}
                onDragStart={() => setDragging(true)}
                onDragCancel={() => setDragging(false)}
                onDragEnd={handleDragEnd}
              >
                {dragging && <RootDropZone />}
                <div
                  className={`min-h-0 flex-1 overflow-hidden rounded-[22px] border border-white/48 bg-white/38 ${reorderBusy ? 'opacity-70' : ''}`}
                >
                  <div className="max-h-[176px] overflow-y-auto">
                    {tree.map((node, index) => (
                      <FolderRow
                        key={node.id}
                        node={node}
                        depth={0}
                        expanded={expanded}
                        toggle={toggle}
                        noteCounts={noteCounts}
                        index={index}
                        siblingsCount={tree.length}
                        onMove={handleMove}
                        pinned={pinnedFolderIds.includes(node.id)}
                        onTogglePinned={togglePinned}
                        busy={reorderBusy}
                      />
                    ))}
                  </div>
                </div>
              </DndContext>
            )}
          </GlassCard>

          <GlassCard className={`col-span-3 flex flex-col p-5 ${lightCardTone}`}>
            <div className="mb-3 flex items-center justify-between">
              <CardTitle className="text-[14px] normal-case tracking-normal text-navy-900">
                writing
              </CardTitle>
              <span className="rounded-full bg-navy-900/[0.05] px-2.5 py-1 font-mono text-[11px] text-navy-500">
                {weeklyEdited}/7d
              </span>
            </div>
            <div className="text-[44px] font-black leading-none text-navy-950">{totalWords}</div>
            <div className="mt-1 font-mono text-[11px] text-navy-500">words in active notes</div>
            <div className="mt-auto space-y-2">
              {topTags.slice(0, 3).map(([tag, count]) => (
                <div key={tag} className="flex items-center gap-2">
                  <span className="w-20 truncate font-mono text-[10px] text-navy-500">#{tag}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-navy-900/10">
                    <span
                      className="block h-full rounded-full bg-[linear-gradient(90deg,#2F6BFF,#28C7B7)]"
                      style={{ width: `${Math.max(16, Math.min(100, count * 22))}%` }}
                    />
                  </span>
                </div>
              ))}
              <button
                type="button"
                onClick={() => openCapture('note')}
                className="h-10 w-full rounded-full bg-navy-900 text-sm font-bold text-white hover:bg-navy-800"
              >
                nova nota
              </button>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  )
}
