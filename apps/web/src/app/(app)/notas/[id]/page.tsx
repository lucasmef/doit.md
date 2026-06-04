'use client'

import { use, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import type { Folder, Item, UpdateItemInput } from '@doit/types'
import { buildFolderTree, useFolders, type FolderTreeNode } from '@/hooks/use-folders'
import { updateItem, useItems } from '@/hooks/use-items'
import { usePreferences } from '@/hooks/use-preferences'
import { useEscapeClose } from '@/hooks/use-escape-close'
import { MarkdownEditor } from '@/components/items/markdown-editor'
import { findRelatedNotesInFolder, type RelatedNote } from '@/lib/note-relations'

const SIDEBAR_FOLDER_COLORS = ['#2F6BFF', '#7B5BFF', '#28C7B7', '#F5A524', '#FF6FAE', '#1AAED7']

function formatRelative(iso: string): string {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime())
  const sec = Math.round(diff / 1000)
  if (sec < 60) return `${sec}s atras`
  const min = Math.round(sec / 60)
  if (min < 60) return `${min}min atras`
  const hr = Math.round(min / 60)
  if (hr < 24) return `${hr}h atras`
  const days = Math.round(hr / 24)
  return `${days}d atras`
}

type Heading = { id: string; text: string; level: 1 | 2 | 3 }

function parseHeadings(markdown: string): Heading[] {
  if (!markdown) return []
  const lines = markdown.split('\n')
  const result: Heading[] = []
  for (const line of lines) {
    const match = line.match(/^(#{1,3})\s+(.+)$/)
    if (!match || !match[1] || !match[2]) continue
    const level = match[1].length as 1 | 2 | 3
    const text = match[2].trim()
    if (!text) continue
    const id = text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 60)
    result.push({ id, text, level })
  }
  return result
}

function countWords(markdown: string) {
  const text = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#>*_`[\]()!-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return text ? text.split(' ').length : 0
}

function taskProgress(markdown: string) {
  const matches = markdown.match(/^\s*[-*]\s+\[[ xX]\]\s+/gm) ?? []
  const done = matches.filter((line) => /\[[xX]\]/.test(line)).length
  const total = matches.length
  const percent = total > 0 ? Math.round((done / total) * 100) : 0
  return { done, total, percent }
}

function formatReadableDate(date?: string) {
  if (!date) return null
  const parsed = new Date(`${date}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return date
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed)
}

function normalizeFileName(item: Item) {
  if (item.localPath) return item.localPath.split(/[\\/]/).pop() ?? item.localPath
  return `${(item.title || 'nota').toLowerCase().replace(/\s+/g, '-')}.md`
}

function buildFolderPath(folders: Folder[], folderId?: string): Folder[] {
  if (!folderId) return []
  const map = new Map(folders.map((f) => [f.id, f]))
  const path: Folder[] = []
  let cur: Folder | undefined = map.get(folderId)
  while (cur) {
    path.unshift(cur)
    cur = cur.parentId ? map.get(cur.parentId) : undefined
  }
  return path
}

function FolderIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  )
}

function ChevronIcon({ open, className = 'h-3 w-3' }: { open?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" className={`${className} ${open ? 'rotate-90' : ''} transition-transform`}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}

function SidebarTree({
  tree,
  itemCounts,
  expanded,
  toggle,
  depth = 0,
}: {
  tree: FolderTreeNode[]
  itemCounts: Map<string, number>
  expanded: Set<string>
  toggle: (id: string) => void
  depth?: number
}) {
  return (
    <div className="flex flex-col gap-px">
      {tree.map((node, i) => {
        const isOpen = expanded.has(node.id)
        const hasChildren = node.children.length > 0
        const color = SIDEBAR_FOLDER_COLORS[(depth + i) % SIDEBAR_FOLDER_COLORS.length] ?? '#2F6BFF'
        return (
          <div key={node.id}>
            <div
              className="flex items-center gap-2 rounded-[7px] px-2 py-1.5 text-[13px] text-navy-900 hover:bg-navy-900/[0.05]"
              style={{ paddingLeft: `${8 + depth * 14}px` }}
            >
              <button
                type="button"
                onClick={() => toggle(node.id)}
                className="inline-flex h-3 w-3 items-center justify-center text-navy-400 hover:text-navy-900"
                aria-label={hasChildren ? 'Expandir/colapsar' : 'Pasta vazia'}
              >
                {hasChildren ? <ChevronIcon open={isOpen} /> : <span className="block h-1 w-1 rounded-full bg-navy-300" />}
              </button>
              <Link
                href={`/notas?folder=${node.id}`}
                className="flex min-w-0 flex-1 items-center gap-2 truncate"
                style={{ color }}
              >
                <FolderIcon className="h-4 w-4 shrink-0" />
                <span className="truncate text-navy-900">{node.name}</span>
                <span className="ml-auto font-mono text-[10px] text-navy-500">{itemCounts.get(node.id) ?? 0}</span>
              </Link>
            </div>
            {hasChildren && isOpen ? (
              <SidebarTree tree={node.children} itemCounts={itemCounts} expanded={expanded} toggle={toggle} depth={depth + 1} />
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

function Sidebar({
  folders,
  notes,
  itemCounts,
  parentFolderId,
  currentItemId,
}: {
  folders: Folder[]
  notes: Item[]
  itemCounts: Map<string, number>
  parentFolderId?: string
  currentItemId: string
}) {
  const tree = useMemo(() => buildFolderTree(folders), [folders])
  const visibleNotes = useMemo(() => {
    const scoped = parentFolderId
      ? notes.filter((note) => note.folderId === parentFolderId)
      : notes
    return scoped.slice(0, 6)
  }, [notes, parentFolderId])
  const favoriteNotes = useMemo(() => notes.filter((note) => note.priority === 1).slice(0, 2), [notes])
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const initial = new Set<string>()
    if (parentFolderId) initial.add(parentFolderId)
    return initial
  })
  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  return (
    <aside className="hidden lg:flex lg:flex-col lg:overflow-hidden lg:rounded-[24px] lg:border lg:border-white/80 lg:bg-white/[.86] lg:shadow-[0_1px_0_rgba(255,255,255,.7)_inset,0_18px_40px_-16px_rgba(15,35,66,.18),0_4px_12px_rgba(15,35,66,.06)] lg:backdrop-blur-2xl">
      <div className="flex items-center gap-2.5 border-b border-navy-900/[0.06] px-4 py-3.5">
        <Link href="/today" className="flex items-center gap-2.5 hover:opacity-80">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#F8FAFC] shadow-[0_1px_2px_rgba(15,35,66,.08)]">
            <img src="/brand/logo-icon.svg" alt="" className="h-[18px] w-[18px]" />
          </span>
          <span className="text-[14px] font-black tracking-tight text-navy-900">
            doit<span className="text-brand-600">.md</span>
          </span>
        </Link>
        <Link
          href="/notas"
          className="ml-auto inline-flex h-[26px] w-[26px] items-center justify-center rounded-lg bg-navy-900/[0.05] text-navy-500 hover:bg-navy-900/[0.10] hover:text-navy-900"
          title="Voltar para biblioteca"
          aria-label="Voltar"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
      </div>

      <Link
        href="/notas"
        className="mx-3 my-3 flex items-center gap-2 rounded-[10px] bg-navy-900/[0.05] px-3 py-2 font-mono text-[12px] text-navy-500 hover:bg-navy-900/[0.08]"
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-4-4" />
        </svg>
        Buscar notas...
        <span className="ml-auto rounded border border-navy-900/[0.08] bg-white px-1.5 text-[10px]">⌘K</span>
      </Link>

      <div className="flex items-center gap-1.5 px-4 pb-1 pt-1.5 font-mono text-[10px] font-bold uppercase tracking-wider text-navy-500">
        notebooks
        <Link href="/notas" className="ml-auto inline-flex h-[18px] w-[18px] items-center justify-center rounded text-navy-500 hover:bg-navy-900/[0.08] hover:text-navy-900" aria-label="Gerenciar pastas">
          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </Link>
      </div>

      <div className="flex-1 overflow-auto px-2 pb-2">
        {tree.length === 0 ? (
          <Link href="/notas" className="mt-2 block rounded-lg border border-dashed border-navy-900/15 px-3 py-2 text-center font-mono text-[11px] text-navy-500 hover:border-brand-300 hover:text-brand-600">
            criar pastas
          </Link>
        ) : (
          <SidebarTree tree={tree} itemCounts={itemCounts} expanded={expanded} toggle={toggle} />
        )}

        <div className="mt-3 px-2 pb-1 pt-2 font-mono text-[10px] font-bold uppercase tracking-wider text-navy-500">
          files
        </div>
        <div className="flex flex-col gap-px">
          {visibleNotes.map((note) => (
            <Link
              key={note.id}
              href={`/notas/${note.id}`}
              className={`flex items-center gap-2 rounded-[7px] px-2 py-1.5 font-mono text-[12px] ${
                note.id === currentItemId
                  ? 'bg-[linear-gradient(135deg,rgba(47,107,255,.10),rgba(40,199,183,.10))] font-semibold text-navy-900 shadow-[inset_0_0_0_1px_rgba(47,107,255,.18)]'
                  : 'text-navy-700 hover:bg-navy-900/[0.05]'
              }`}
            >
              <span className="shrink-0 text-[11px] font-bold text-brand-600">M↓</span>
              <span className="truncate">{normalizeFileName(note)}</span>
              {note.priority === 1 ? <span className="ml-auto text-[#F5A524]">*</span> : null}
            </Link>
          ))}
        </div>

        <div className="mt-3 px-2 pb-1 pt-2 font-mono text-[10px] font-bold uppercase tracking-wider text-navy-500">
          favorites
        </div>
        <div className="flex flex-col gap-px">
          {(favoriteNotes.length > 0 ? favoriteNotes : notes.slice(0, 2)).map((note) => (
            <Link
              key={`fav-${note.id}`}
              href={`/notas/${note.id}`}
              className="flex items-center gap-2 rounded-[7px] px-2 py-1.5 font-mono text-[12px] text-navy-700 hover:bg-navy-900/[0.05]"
            >
              <span className="shrink-0 text-[11px] font-bold text-brand-600">M↓</span>
              <span className="truncate">{normalizeFileName(note)}</span>
            </Link>
          ))}
        </div>

        <div className="mt-3 px-2 pb-1 pt-2 font-mono text-[10px] font-bold uppercase tracking-wider text-navy-500">
          trash
        </div>
      </div>

      <div className="flex items-center gap-2.5 border-t border-navy-900/[0.06] px-4 py-2.5">
        <span className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-full border border-white/70 bg-[linear-gradient(135deg,#FFB1D5,#B59BFF_60%,#28C7B7)] text-[10px] font-bold text-white">
          LF
        </span>
        <div className="min-w-0 text-[12px] font-semibold text-navy-900">
          doit.md
          <small className="block truncate font-mono text-[10px] font-normal text-navy-500">
            synced just now
          </small>
        </div>
      </div>
    </aside>
  )
}

function RailTitle({ children }: { children: React.ReactNode }) {
  return (
    <h4 className="mb-2 mt-4 font-mono text-[10px] font-bold uppercase tracking-wider text-navy-500 first:mt-0">
      {children}
    </h4>
  )
}

function flattenFolderOptions(folders: Folder[]): Array<{ id: string; name: string; depth: number }> {
  const out: Array<{ id: string; name: string; depth: number }> = []
  const walk = (nodes: FolderTreeNode[], depth: number) => {
    for (const node of nodes) {
      out.push({ id: node.id, name: node.name, depth })
      if (node.children.length > 0) walk(node.children, depth + 1)
    }
  }
  walk(buildFolderTree(folders), 0)
  return out
}

function PanelField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-wider text-navy-500">
        {label}
      </span>
      {children}
    </label>
  )
}

function panelControlClass() {
  return 'w-full rounded-[8px] border border-navy-900/10 bg-white/70 px-2.5 py-2 text-[12px] text-navy-900 outline-none transition focus:border-brand-300 focus:ring-2 focus:ring-brand-100'
}

function NotePropertiesPanel({
  item,
  folders,
  wordCount,
  tagsDraft,
  onTagsDraftChange,
  onPatch,
}: {
  item: Item
  folders: Folder[]
  wordCount: number
  tagsDraft: string
  onTagsDraftChange: (value: string) => void
  onPatch: (patch: UpdateItemInput) => void
}) {
  const normalizeTags = (value: string) =>
    Array.from(
      new Set(
        value
          .split(',')
          .map((tag) => tag.trim().replace(/^#/, ''))
          .filter(Boolean),
      ),
    )

  return (
    <div className="space-y-3 rounded-[12px] bg-white/46 p-3 shadow-[inset_0_0_0_1px_rgba(15,35,66,.05)]">
      <PanelField label="pasta">
        <select
          value={item.folderId ?? ''}
          onChange={(event) =>
            onPatch({ folderId: (event.target.value || null) as unknown as string })
          }
          className={panelControlClass()}
        >
          <option value="">inbox</option>
          {flattenFolderOptions(folders).map(({ id, name, depth }) => (
            <option key={id} value={id}>
              {`${'  '.repeat(depth)}${depth > 0 ? '↳ ' : ''}${name}`}
            </option>
          ))}
        </select>
      </PanelField>

      <PanelField label="data">
        <input
          type="date"
          value={item.dueDate ?? ''}
          onChange={(event) =>
            onPatch({ dueDate: (event.target.value || null) as unknown as string })
          }
          className={panelControlClass()}
        />
      </PanelField>

      <PanelField label="tags">
        <input
          value={tagsDraft}
          onChange={(event) => onTagsDraftChange(event.target.value)}
          onBlur={(event) => onPatch({ tags: normalizeTags(event.target.value) })}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              event.currentTarget.blur()
            }
          }}
          placeholder="docs, baixo-risco"
          className={panelControlClass()}
        />
      </PanelField>

      <div className="font-mono text-[10px] text-navy-400">
        editado {formatRelative(item.updatedAt)} · {wordCount} palavras
      </div>
    </div>
  )
}

function MobileNoteActions({
  item,
  folders,
  attachmentsOpen,
  onToggleAttachments,
  onPatch,
}: {
  item: Item
  folders: Folder[]
  attachmentsOpen: boolean
  onToggleAttachments: () => void
  onPatch: (patch: UpdateItemInput) => void
}) {
  return (
    <div className="border-b border-[#ECF0F5] bg-white/96 px-3 py-2 lg:hidden">
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={onToggleAttachments}
          aria-expanded={attachmentsOpen}
          className={`inline-flex h-10 items-center justify-center gap-1.5 rounded-[12px] border px-2 text-[12px] font-semibold ${
            attachmentsOpen
              ? 'border-brand-200 bg-brand-50 text-brand-700'
              : 'border-navy-900/[0.08] bg-white text-navy-600'
          }`}
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.44 11.05 12 20.49a6 6 0 0 1-8.49-8.49l9.44-9.44a4 4 0 0 1 5.66 5.66l-9.44 9.44a2 2 0 1 1-2.83-2.83l8.49-8.49" />
          </svg>
          Anexos
        </button>
        <label className="min-w-0">
          <span className="sr-only">Pasta</span>
          <select
            value={item.folderId ?? ''}
            onChange={(event) => onPatch({ folderId: (event.target.value || null) as unknown as string })}
            className="h-10 w-full rounded-[12px] border border-navy-900/[0.08] bg-white px-2 text-[12px] font-semibold text-navy-700 outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
            aria-label="Editar pasta da nota"
          >
            <option value="">Inbox</option>
            {flattenFolderOptions(folders).map(({ id, name, depth }) => (
              <option key={id} value={id}>
                {`${'  '.repeat(depth)}${depth > 0 ? '- ' : ''}${name}`}
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-0">
          <span className="sr-only">Data</span>
          <input
            type="date"
            value={item.dueDate ?? ''}
            onChange={(event) => onPatch({ dueDate: (event.target.value || null) as unknown as string })}
            className="h-10 w-full rounded-[12px] border border-navy-900/[0.08] bg-white px-2 text-[12px] font-semibold text-navy-700 outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100"
            aria-label="Editar data da nota"
          />
        </label>
      </div>
      {item.dueDate ? (
        <button
          type="button"
          onClick={() => onPatch({ dueDate: null as unknown as string })}
          className="mt-2 h-8 rounded-full bg-navy-900/[0.05] px-3 text-[12px] font-semibold text-navy-500"
        >
          Remover data
        </button>
      ) : null}
      {attachmentsOpen ? (
        <div className="mt-3 rounded-[16px] border border-navy-900/[0.08] bg-navy-900/[0.03] p-2">
          <div id="note-editor-mobile-attachments" />
        </div>
      ) : null}
    </div>
  )
}

function OutlineRail({
  headings,
  progress,
  relatedNotes,
  item,
  folders,
  wordCount,
  tagsDraft,
  dueLabel,
  onTagsDraftChange,
  onPatch,
}: {
  headings: Heading[]
  progress: { done: number; total: number; percent: number }
  relatedNotes: RelatedNote[]
  item: Item
  folders: Folder[]
  wordCount: number
  tagsDraft: string
  dueLabel: string | null
  onTagsDraftChange: (value: string) => void
  onPatch: (patch: UpdateItemInput) => void
}) {
  const progressLabel =
    progress.total > 0 ? `${progress.done} / ${progress.total} feito` : 'sem tarefas'

  return (
    <aside className="hidden lg:flex lg:flex-col lg:overflow-hidden lg:rounded-[24px] lg:border lg:border-white/80 lg:bg-white/[.86] lg:shadow-[0_1px_0_rgba(255,255,255,.7)_inset,0_18px_40px_-16px_rgba(15,35,66,.18),0_4px_12px_rgba(15,35,66,.06)] lg:backdrop-blur-2xl">
      <div className="flex-1 overflow-auto p-4">
        <RailTitle>propriedades</RailTitle>
        <NotePropertiesPanel
          item={item}
          folders={folders}
          wordCount={wordCount}
          tagsDraft={tagsDraft}
          onTagsDraftChange={onTagsDraftChange}
          onPatch={onPatch}
        />

        <RailTitle>anexos</RailTitle>
        <div id="note-editor-attachments" />

        <RailTitle>progresso</RailTitle>
        <div className="rounded-[12px] bg-white/46 p-3 shadow-[inset_0_0_0_1px_rgba(15,35,66,.05)]">
          <div className="flex items-center justify-between font-mono text-[11px] text-navy-500">
            <span>{progressLabel}</span>
            <b className="text-navy-900">{progress.percent}%</b>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-navy-900/[0.08]">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#2F6BFF,#28C7B7)]"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
          <div className="mt-2 font-mono text-[10px] text-navy-400">
            {dueLabel ? `due ${dueLabel}` : 'sem vencimento'}
          </div>
        </div>

        <RailTitle>outline</RailTitle>
        {headings.length === 0 ? (
          <div className="rounded-[10px] bg-white/35 px-3 py-2 font-mono text-[11px] text-navy-300">
            use # ## ### para criar uma estrutura
          </div>
        ) : (
          <nav className="flex flex-col gap-1">
            {headings.map((h, i) => (
              <a
                key={`${h.id}-${i}`}
                href={`#${h.id}`}
                className={`flex items-center gap-2 truncate rounded-[7px] px-2 py-1.5 text-[12px] hover:bg-navy-900/[0.05] hover:text-navy-900 ${
                  i === 0 ? 'bg-[rgba(47,107,255,.10)] font-semibold text-brand-600' : 'text-navy-700'
                }`}
                style={{ paddingLeft: `${8 + (h.level - 1) * 12}px` }}
              >
                <span className="font-mono text-[10px] text-navy-400">
                  {'#'.repeat(h.level)}
                </span>
                <span className="truncate">{h.text}</span>
              </a>
            ))}
          </nav>
        )}

        <RailTitle>relacionadas - {relatedNotes.length}</RailTitle>
        <div className="flex flex-col gap-2">
          {relatedNotes.length === 0 ? (
            <div className="rounded-[10px] bg-white/35 px-3 py-2 font-mono text-[11px] text-navy-300">
              adicione tags em comum nesta pasta
            </div>
          ) : (
            relatedNotes.map((relation) => (
              <Link
                key={relation.item.id}
                href={`/notas/${relation.item.id}`}
                className="rounded-[10px] bg-white/46 p-3 shadow-[inset_0_0_0_1px_rgba(15,35,66,.05)] hover:bg-white/70"
              >
                <div className="font-mono text-[10px] font-semibold text-brand-600">
                  M↓ {normalizeFileName(relation.item)}
                </div>
                <div className="mt-1 truncate text-[12px] font-semibold text-navy-900">
                  {relation.item.title}
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {relation.sharedTags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-brand-500/10 px-1.5 py-0.5 font-mono text-[10px] text-brand-700"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
                <div className="mt-1 line-clamp-2 text-[11px] leading-4 text-navy-500">
                  {(relation.item.contentMd ?? '').replace(/\s+/g, ' ').slice(0, 90) || 'Nota relacionada por tags'}
                </div>
              </Link>
            ))
          )}
        </div>

      </div>
    </aside>
  )
}

function EditorTopBar({
  crumbs,
  saveStatus,
  onArchive,
  onDownload,
  isPinned,
  onTogglePin,
}: {
  crumbs: Array<{ label: string; href?: string; isFile?: boolean }>
  saveStatus: 'idle' | 'saving' | 'saved'
  onArchive: () => void
  onDownload: () => void
  isPinned?: boolean
  onTogglePin?: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <div className="flex shrink-0 items-center gap-3 border-b border-[#ECF0F5] px-6 py-3.5">
      <nav className="flex min-w-0 flex-wrap items-center gap-1.5 font-mono text-[12px] text-navy-500">
        {crumbs.map((crumb, i) => (
          <span key={`${crumb.label}-${i}`} className="inline-flex items-center gap-1.5">
            {crumb.href ? (
              <Link href={crumb.href} className={crumb.isFile ? 'font-semibold text-brand-600' : 'text-navy-500 hover:text-navy-900'}>
                {crumb.label}
              </Link>
            ) : (
              <span className={crumb.isFile ? 'font-semibold text-brand-600' : ''}>{crumb.label}</span>
            )}
            {i < crumbs.length - 1 ? <span className="text-navy-900/20">/</span> : null}
          </span>
        ))}
      </nav>

      <span
        className={`ml-auto inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold ${
          saveStatus === 'saving' ? 'text-navy-500' : 'text-teal-600'
        }`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            saveStatus === 'saving'
              ? 'animate-pulse bg-navy-400'
              : 'bg-teal-500 shadow-[0_0_6px_#28C7B7]'
          }`}
        />
        {saveStatus === 'saving' ? 'saving...' : 'saved · now'}
      </span>

      <div className="hidden sm:flex">
        <span className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-full border-2 border-white bg-[linear-gradient(135deg,#2F6BFF,#28C7B7)] text-[9px] font-bold text-white">
          LF
        </span>
      </div>

      <div className="h-[18px] w-px bg-[#D9E1EA]" />

      {onTogglePin && (
        <button
          type="button"
          onClick={onTogglePin}
          className={`inline-flex h-7 w-7 items-center justify-center rounded-[7px] text-[14px] ${
            isPinned
              ? 'bg-warning/[0.15] text-[#B47410] hover:bg-warning/[0.20]'
              : 'text-navy-500 hover:bg-[#ECF0F5] hover:text-navy-900'
          }`}
          title={isPinned ? 'Remover destaque' : 'Destacar nota'}
        >
          {isPinned ? '★' : '☆'}
        </button>
      )}

      <button
        type="button"
        onClick={() => window.print()}
        className="hidden h-7 items-center gap-1.5 rounded-[7px] px-2.5 text-[12px] font-medium text-navy-500 hover:bg-[#ECF0F5] hover:text-navy-900 sm:inline-flex"
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M7 8V4h10v4" />
          <path d="M7 17H5a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2" />
          <path d="M7 14h10v6H7z" />
        </svg>
        Imprimir
      </button>
      <button
        type="button"
        onClick={onDownload}
        className="hidden h-8 items-center gap-1.5 rounded-lg bg-navy-900 px-3 text-[12px] font-semibold text-white hover:bg-navy-700 sm:inline-flex"
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 4v10" />
          <path d="m8 10 4 4 4-4" />
          <path d="M5 20h14" />
        </svg>
        Baixar
      </button>
      <div className="relative hidden sm:block">
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label="Mais acoes"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          title="Mais acoes"
          className="inline-flex h-7 w-7 items-center justify-center rounded-[7px] text-navy-500 hover:bg-[#ECF0F5] hover:text-navy-900"
        >
          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
            <circle cx="5" cy="12" r="1.2" />
            <circle cx="12" cy="12" r="1.2" />
            <circle cx="19" cy="12" r="1.2" />
          </svg>
        </button>
        {menuOpen ? (
          <>
            <button
              type="button"
              aria-hidden="true"
              tabIndex={-1}
              onClick={() => setMenuOpen(false)}
              className="fixed inset-0 z-40 cursor-default"
            />
            <div
              role="menu"
              className="absolute right-0 top-[calc(100%+6px)] z-50 w-44 overflow-hidden rounded-[12px] border border-navy-900/10 bg-white py-1 shadow-[0_12px_32px_rgba(15,35,66,.20),0_2px_8px_rgba(15,35,66,.08)]"
            >
              {onTogglePin && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false)
                    onTogglePin()
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] font-medium text-navy-700 hover:bg-navy-50"
                >
                  <span className="text-[14px] leading-none">{isPinned ? '★' : '☆'}</span>
                  {isPinned ? 'Remover destaque' : 'Destacar nota'}
                </button>
              )}
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false)
                  onArchive()
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] font-medium text-red-600 hover:bg-red-50"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="4" rx="1" />
                  <path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8" />
                  <path d="M10 12h4" />
                </svg>
                Arquivar nota
              </button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}

export default function NoteEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const searchParams = useSearchParams()
  const folderParam = searchParams.get('folder')
  const router = useRouter()
  const { items, isLoading } = useItems()
  const { folders } = useFolders()
  const { prefs, update: updatePrefs } = usePreferences()

  const isPinned = prefs.pinnedNoteIds?.includes(id) ?? false
  const handleTogglePin = useCallback(() => {
    const next = isPinned
      ? (prefs.pinnedNoteIds ?? []).filter((noteId) => noteId !== id)
      : [id, ...(prefs.pinnedNoteIds ?? [])]
    updatePrefs({ pinnedNoteIds: next })
  }, [id, isPinned, prefs.pinnedNoteIds, updatePrefs])

  const item = useMemo(() => items.find((it) => it.id === id), [items, id])



  const itemCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const it of items) {
      if (it.folderId) counts.set(it.folderId, (counts.get(it.folderId) ?? 0) + 1)
    }
    return counts
  }, [items])

  const [localContent, setLocalContent] = useState('')
  const [tagsDraft, setTagsDraft] = useState('')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [hydrated, setHydrated] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const [mobileAttachmentsOpen, setMobileAttachmentsOpen] = useState(false)
  
  useEscapeClose(!focusMode, () => {
    if (folderParam) router.push(`/notas?folder=${folderParam}`)
    else router.push('/notas')
  })
  const contentTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!item || hydrated) return
    setLocalContent(item.contentMd ?? '')
    setTagsDraft(item.tags.join(', '))
    setHydrated(true)
  }, [item, hydrated])

  useEffect(() => {
    if (!item) return
    setTagsDraft(item.tags.join(', '))
  }, [item?.id, item?.tags])

  const persist = useCallback(
    async (patch: UpdateItemInput) => {
      if (!item) return
      setSaveStatus('saving')
      try {
        await updateItem(item.id, patch)
        setSaveStatus('saved')
      } catch {
        setSaveStatus('idle')
      }
    },
    [item],
  )

  const onContentChange = useCallback(
    (value: string) => {
      setLocalContent(value)
      if (contentTimer.current) clearTimeout(contentTimer.current)
      contentTimer.current = setTimeout(() => {
        void persist({ contentMd: value })
      }, 600)
    },
    [persist],
  )

  const onCollapsedHeadingsChange = useCallback(
    (indices: number[]) => {
      if (!item) return
      void persist({ collapsedHeadingIndices: indices })
    },
    [item, persist],
  )

  useEffect(() => {
    return () => {
      if (contentTimer.current) clearTimeout(contentTimer.current)
    }
  }, [])

  useEffect(() => {
    if (!focusMode) return undefined
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setFocusMode(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focusMode])

  const folderPath = useMemo(() => buildFolderPath(folders, item?.folderId), [folders, item])
  const headings = useMemo(() => parseHeadings(localContent), [localContent])
  const noteItems = useMemo(() => items.filter((it) => it.complexity === 'note'), [items])
  const progress = useMemo(() => taskProgress(localContent), [localContent])
  const wordCount = useMemo(() => countWords(localContent), [localContent])
  const relatedNotes = useMemo(
    () => (item ? findRelatedNotesInFolder(item, noteItems) : []),
    [item, noteItems],
  )
  const dueLabel = useMemo(() => formatReadableDate(item?.dueDate), [item?.dueDate])
  const fileName = useMemo(() => {
    if (!item) return 'nota.md'
    if (item.localPath) return item.localPath
    return `${(item.title || 'nota').toLowerCase().replace(/\s+/g, '-')}.md`
  }, [item])

  const crumbs = useMemo(() => {
    const list: Array<{ label: string; href?: string; isFile?: boolean }> = [
      { label: 'notas', href: '/notas' },
    ]
    folderPath.forEach((folder) => list.push({ label: folder.name, href: `/notas?folder=${folder.id}` }))
    list.push({ label: `M↓ ${fileName}`, isFile: true })
    return list
  }, [folderPath, fileName])

  const handleArchive = async () => {
    if (!item) return
    await updateItem(item.id, { status: 'archived' })
    router.push('/notas')
  }

  const handleMetadataPatch = (patch: UpdateItemInput) => {
    if (!item) return
    setSaveStatus('saving')
    void updateItem(item.id, patch)
      .then(() => setSaveStatus('saved'))
      .catch(() => setSaveStatus('idle'))
  }

  const handleDownload = useCallback(() => {
    const base = (fileName.split(/[\\/]/).pop() || 'nota').replace(/\.md$/i, '')
    const blob = new Blob([localContent], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${base}.md`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }, [fileName, localContent])

  const attachmentsPortalId = mobileAttachmentsOpen ? 'note-editor-mobile-attachments' : 'note-editor-attachments'

  if (isLoading) {
    return (
      <div className="grid h-full place-items-center font-mono text-sm text-navy-500">
        carregando nota...
      </div>
    )
  }

  if (!item) {
    return (
      <div className="grid h-full place-items-center gap-4 px-6 text-center">
        <div className="font-mono text-sm text-navy-500">nota nao encontrada</div>
        <Link href="/notas" className="rounded-full bg-navy-900 px-4 py-2 text-[13px] font-bold text-white shadow-cool-sm hover:bg-navy-800">
          Voltar para biblioteca
        </Link>
      </div>
    )
  }

  return (
    <div
      className={`grid h-full grid-cols-1 gap-3.5 p-3.5 ${
        focusMode ? 'lg:grid-cols-1' : 'lg:grid-cols-[220px_minmax(0,1fr)_240px] xl:grid-cols-[230px_minmax(0,1fr)_250px]'
      }`}
    >
      {focusMode ? null : (
        <Sidebar
          folders={folders}
          notes={noteItems}
          itemCounts={itemCounts}
          parentFolderId={item.folderId}
          currentItemId={item.id}
        />
      )}

      <main className="flex min-w-0 flex-col overflow-hidden rounded-[24px] border border-white/70 bg-white shadow-[0_18px_40px_-16px_rgba(15,35,66,.18),0_4px_12px_rgba(15,35,66,.06)]">
        <EditorTopBar
          crumbs={crumbs}
          saveStatus={saveStatus}
          onArchive={handleArchive}
          onDownload={handleDownload}
          isPinned={isPinned}
          onTogglePin={handleTogglePin}
        />
        {focusMode ? null : (
          <MobileNoteActions
            item={item}
            folders={folders}
            attachmentsOpen={mobileAttachmentsOpen}
            onToggleAttachments={() => setMobileAttachmentsOpen((open) => !open)}
            onPatch={handleMetadataPatch}
          />
        )}
        <div id="note-editor-toolbar" />

        <div className="flex-1 overflow-auto" data-note-scroll-container="true">
          <div
            className={`mx-auto w-full px-5 pb-20 pt-8 sm:px-6 ${
              focusMode
                ? 'max-w-[1180px] lg:px-16 xl:px-20'
                : 'max-w-[980px] lg:px-4 xl:max-w-[1040px] xl:px-6'
            }`}
          >
            <MarkdownEditor
              value={localContent}
              onChange={onContentChange}
              itemId={item.id}
              minHeight="min-h-[420px]"
              hideDocumentActions
              variant="sheet"
              toolbarPortalId="note-editor-toolbar"
              attachmentsPortalId={attachmentsPortalId}
              focusMode={focusMode}
              onToggleFocus={() => setFocusMode((value) => !value)}
              collapsedHeadingIndices={
                Array.isArray(item.collapsedHeadingIndices) ? item.collapsedHeadingIndices : undefined
              }
              onCollapsedHeadingIndicesChange={onCollapsedHeadingsChange}
            />
          </div>
        </div>
      </main>

      {focusMode ? null : (
        <OutlineRail
          headings={headings}
          progress={progress}
          relatedNotes={relatedNotes}
          item={item}
          folders={folders}
          wordCount={wordCount}
          tagsDraft={tagsDraft}
          dueLabel={dueLabel}
          onTagsDraftChange={setTagsDraft}
          onPatch={handleMetadataPatch}
        />
      )}
    </div>
  )
}
