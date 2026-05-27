'use client'

import { use, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { Folder, Item } from '@doit/types'
import { buildFolderTree, useFolders, type FolderTreeNode } from '@/hooks/use-folders'
import { updateItem, useItems } from '@/hooks/use-items'
import { MarkdownEditor } from '@/components/items/markdown-editor'

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
                href={`/notas/pastas/${node.id}`}
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
  itemCounts,
  parentFolderId,
}: {
  folders: Folder[]
  itemCounts: Map<string, number>
  parentFolderId?: string
}) {
  const tree = useMemo(() => buildFolderTree(folders), [folders])
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
    <aside className="hidden lg:flex lg:flex-col lg:overflow-hidden lg:rounded-[24px] lg:border lg:border-white/70 lg:bg-white/72 lg:shadow-[0_1px_0_rgba(255,255,255,.7)_inset,0_18px_40px_-16px_rgba(15,35,66,.18),0_4px_12px_rgba(15,35,66,.06)] lg:backdrop-blur-2xl">
      <div className="flex items-center gap-2.5 border-b border-navy-900/[0.06] px-4 py-3.5">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[#F8FAFC] shadow-[0_1px_2px_rgba(15,35,66,.08)]">
          <img src="/brand/logo-icon.svg" alt="" className="h-[18px] w-[18px]" />
        </span>
        <span className="text-[14px] font-black tracking-tight text-navy-900">
          doit<span className="text-brand-600">.md</span>
        </span>
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
        Pastas
        <Link href="/notas/pastas" className="ml-auto inline-flex h-[18px] w-[18px] items-center justify-center rounded text-navy-500 hover:bg-navy-900/[0.08] hover:text-navy-900" aria-label="Gerenciar pastas">
          <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </Link>
      </div>

      <div className="flex-1 overflow-auto px-2 pb-2">
        {tree.length === 0 ? (
          <Link href="/notas/pastas" className="mt-2 block rounded-lg border border-dashed border-navy-900/15 px-3 py-2 text-center font-mono text-[11px] text-navy-500 hover:border-brand-300 hover:text-brand-600">
            criar pastas
          </Link>
        ) : (
          <SidebarTree tree={tree} itemCounts={itemCounts} expanded={expanded} toggle={toggle} />
        )}
      </div>

      <div className="border-t border-navy-900/[0.06] px-4 py-2.5">
        <Link href="/dashboard" className="font-mono text-[11px] text-navy-500 hover:text-navy-900">
          ← dashboard
        </Link>
      </div>
    </aside>
  )
}

function OutlineRail({ headings, savedAt }: { headings: Heading[]; savedAt?: string }) {
  return (
    <aside className="hidden lg:flex lg:flex-col lg:overflow-hidden lg:rounded-[24px] lg:border lg:border-white/70 lg:bg-white/72 lg:shadow-[0_1px_0_rgba(255,255,255,.7)_inset,0_18px_40px_-16px_rgba(15,35,66,.18),0_4px_12px_rgba(15,35,66,.06)] lg:backdrop-blur-2xl">
      <div className="border-b border-navy-900/[0.06] px-4 py-3">
        <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-navy-500">Outline</div>
        <div className="mt-1 font-mono text-[10px] text-navy-300">{headings.length} headings</div>
      </div>
      <div className="flex-1 overflow-auto px-3 py-3">
        {headings.length === 0 ? (
          <div className="text-center font-mono text-[11px] text-navy-300">use # ## ### para criar uma estrutura</div>
        ) : (
          <ul className="flex flex-col gap-1">
            {headings.map((h, i) => (
              <li key={`${h.id}-${i}`}>
                <a
                  href={`#${h.id}`}
                  className="block truncate rounded-md px-2 py-1 text-[12px] text-navy-700 hover:bg-navy-900/[0.05] hover:text-navy-900"
                  style={{ paddingLeft: `${8 + (h.level - 1) * 12}px` }}
                >
                  {h.text}
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
      {savedAt ? (
        <div className="border-t border-navy-900/[0.06] px-4 py-2.5 font-mono text-[10px] text-navy-500">
          atualizada {formatRelative(savedAt)}
        </div>
      ) : null}
    </aside>
  )
}

function CoverGradient() {
  return (
    <div
      className="relative h-[120px] w-full overflow-hidden"
      style={{
        background:
          'radial-gradient(circle at 20% 30%, rgba(123,91,255,.55), transparent 60%), radial-gradient(circle at 80% 70%, rgba(40,199,183,.55), transparent 60%), linear-gradient(135deg, #2F6BFF 0%, #7B5BFF 50%, #28C7B7 100%)',
      }}
      aria-hidden="true"
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,.06) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.06) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
    </div>
  )
}

function StatusPill({ status }: { status: Item['status'] }) {
  const tone: Record<string, { bg: string; text: string; dot: string }> = {
    open: { bg: 'bg-[rgba(47,107,255,.10)]', text: 'text-brand-600', dot: 'bg-brand-600' },
    done: { bg: 'bg-[rgba(40,199,183,.14)]', text: 'text-teal-600', dot: 'bg-teal-500' },
    archived: { bg: 'bg-navy-900/[0.06]', text: 'text-navy-500', dot: 'bg-navy-400' },
    snoozed: { bg: 'bg-[rgba(245,165,36,.16)]', text: 'text-[#B56B00]', dot: 'bg-[#F5A524]' },
  }
  const t = tone[status] ?? tone.open ?? { bg: 'bg-navy-900/[0.06]', text: 'text-navy-500', dot: 'bg-navy-400' }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${t.bg} ${t.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} />
      {status}
    </span>
  )
}

function PropsGrid({
  item,
  folderPath,
}: {
  item: Item
  folderPath: Folder[]
}) {
  return (
    <dl className="mb-7 grid grid-cols-[110px_1fr] gap-x-4 gap-y-1 border-b border-navy-900/[0.04] pb-6 text-[13px]">
      <dt className="flex items-center gap-1.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-navy-500">
        Status
      </dt>
      <dd className="flex items-center gap-2 py-1">
        <StatusPill status={item.status} />
      </dd>

      <dt className="flex items-center gap-1.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-navy-500">
        Tags
      </dt>
      <dd className="flex flex-wrap items-center gap-1.5 py-1">
        {item.tags.length === 0 ? (
          <button type="button" className="rounded border border-dashed border-navy-900/15 px-2 py-0.5 text-[11px] text-navy-500">
            adicionar tag
          </button>
        ) : (
          item.tags.map((tag, i) => {
            const tones = [
              'bg-[rgba(47,107,255,.10)] text-brand-600',
              'bg-[rgba(40,199,183,.14)] text-teal-600',
              'bg-[rgba(123,91,255,.12)] text-violet-500',
              'bg-[rgba(255,111,174,.12)] text-pink-600',
            ]
            return (
              <span key={tag} className={`rounded font-mono text-[11px] px-2 py-0.5 ${tones[i % tones.length]}`}>
                #{tag}
              </span>
            )
          })
        )}
      </dd>

      <dt className="flex items-center gap-1.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-navy-500">
        Pasta
      </dt>
      <dd className="flex items-center gap-2 py-1 font-mono text-[12px] text-navy-500">
        {folderPath.length === 0 ? (
          <span>inbox</span>
        ) : (
          folderPath.map((f, i) => (
            <span key={f.id} className="inline-flex items-center gap-2">
              <Link href={`/notas/pastas/${f.id}`} className="hover:text-navy-900">
                {f.name}
              </Link>
              {i < folderPath.length - 1 ? <span className="text-navy-900/25">/</span> : null}
            </span>
          ))
        )}
      </dd>

      {item.dueDate ? (
        <>
          <dt className="flex items-center gap-1.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-navy-500">
            Vencimento
          </dt>
          <dd className="py-1 font-mono text-[12px] text-navy-700">
            {item.dueDate}
            {item.dueTime ? ` · ${item.dueTime}` : ''}
          </dd>
        </>
      ) : null}

      <dt className="flex items-center gap-1.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wider text-navy-500">
        Atualizada
      </dt>
      <dd className="py-1 font-mono text-[12px] text-navy-500">{formatRelative(item.updatedAt)}</dd>
    </dl>
  )
}

function EditorTopBar({
  crumbs,
  saveStatus,
  onArchive,
}: {
  crumbs: Array<{ label: string; href?: string; isFile?: boolean }>
  saveStatus: 'idle' | 'saving' | 'saved'
  onArchive: () => void
}) {
  return (
    <div className="flex shrink-0 items-center gap-3 border-b border-navy-900/[0.04] px-6 py-3">
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
        {saveStatus === 'saving' ? 'salvando...' : 'salvo'}
      </span>

      <button
        type="button"
        onClick={onArchive}
        className="hidden h-7 items-center gap-1.5 rounded-md px-2.5 text-[12px] font-medium text-navy-500 hover:bg-navy-900/[0.05] hover:text-navy-900 sm:inline-flex"
      >
        <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="4" rx="1" />
          <path d="M5 8v12a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8" />
          <path d="M10 12h4" />
        </svg>
        Arquivar
      </button>
    </div>
  )
}

export default function NoteEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { items, isLoading } = useItems()
  const { folders } = useFolders()

  const item = useMemo(() => items.find((it) => it.id === id), [items, id])

  const itemCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const it of items) {
      if (it.folderId) counts.set(it.folderId, (counts.get(it.folderId) ?? 0) + 1)
    }
    return counts
  }, [items])

  const [localTitle, setLocalTitle] = useState('')
  const [localContent, setLocalContent] = useState('')
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const [hydrated, setHydrated] = useState(false)
  const titleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const contentTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!item || hydrated) return
    setLocalTitle(item.title)
    setLocalContent(item.contentMd ?? '')
    setHydrated(true)
  }, [item, hydrated])

  const persist = useCallback(
    async (patch: { title?: string; contentMd?: string }) => {
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

  const onTitleChange = (value: string) => {
    setLocalTitle(value)
    if (titleTimer.current) clearTimeout(titleTimer.current)
    titleTimer.current = setTimeout(() => {
      if (value.trim().length > 0) void persist({ title: value })
    }, 600)
  }

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

  useEffect(() => {
    return () => {
      if (titleTimer.current) clearTimeout(titleTimer.current)
      if (contentTimer.current) clearTimeout(contentTimer.current)
    }
  }, [])

  const folderPath = useMemo(() => buildFolderPath(folders, item?.folderId), [folders, item])
  const headings = useMemo(() => parseHeadings(localContent), [localContent])
  const fileName = useMemo(() => {
    if (!item) return 'nota.md'
    if (item.localPath) return item.localPath
    return `${(item.title || 'nota').toLowerCase().replace(/\s+/g, '-')}.md`
  }, [item])

  const crumbs = useMemo(() => {
    const list: Array<{ label: string; href?: string; isFile?: boolean }> = [
      { label: 'notas', href: '/notas' },
    ]
    folderPath.forEach((folder) => list.push({ label: folder.name, href: `/notas/pastas/${folder.id}` }))
    list.push({ label: `M↓ ${fileName}`, isFile: true })
    return list
  }, [folderPath, fileName])

  const handleArchive = async () => {
    if (!item) return
    await updateItem(item.id, { status: 'archived' })
    router.push('/notas')
  }

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
    <div className="grid h-full grid-cols-1 gap-3 px-3 pb-3 lg:grid-cols-[260px_1fr_280px] lg:gap-3.5 lg:px-3.5 lg:pb-3.5">
      <Sidebar
        folders={folders}
        itemCounts={itemCounts}
        parentFolderId={item.folderId}
      />

      <main className="flex min-w-0 flex-col overflow-hidden rounded-[24px] border border-white/55 bg-white shadow-[0_18px_40px_-16px_rgba(15,35,66,.18),0_4px_12px_rgba(15,35,66,.06)]">
        <EditorTopBar crumbs={crumbs} saveStatus={saveStatus} onArchive={handleArchive} />

        <div className="flex-1 overflow-auto" data-note-scroll-container="true">
          <CoverGradient />
          <div className="mx-auto w-full max-w-[760px] px-6 pb-20 lg:px-16">
            <span className="-mt-10 mb-4 inline-flex h-[72px] w-[72px] items-center justify-center rounded-[18px] border border-navy-900/[0.04] bg-white font-mono text-[26px] font-bold text-brand-600 shadow-[0_8px_20px_rgba(15,35,66,.15)]">
              M↓
            </span>

            <input
              type="text"
              value={localTitle}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Sem titulo"
              className="mb-3 w-full bg-transparent text-[42px] font-black leading-[1.05] -tracking-[.03em] text-navy-900 outline-none placeholder:text-navy-200"
              aria-label="Titulo"
            />

            <PropsGrid item={item} folderPath={folderPath} />

            <div className="-mx-1 rounded-2xl border border-navy-900/[0.04]">
              <MarkdownEditor
                value={localContent}
                onChange={onContentChange}
                itemId={item.id}
                minHeight="min-h-[420px]"
              />
            </div>
          </div>
        </div>
      </main>

      <OutlineRail headings={headings} savedAt={item.updatedAt} />
    </div>
  )
}
