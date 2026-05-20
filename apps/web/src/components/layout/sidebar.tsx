'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import useSWR from 'swr'
import { useItems } from '@/hooks/use-items'
import { useFolders, buildFolderTree, createFolder, type FolderTreeNode } from '@/hooks/use-folders'
import { useUI } from '@/store/ui'
import { useDialog } from '@/components/ui/dialog'
import { usePreferences } from '@/hooks/use-preferences'
import { toLocalDateKey } from '@doit/core'

type IconKey = 'today' | 'inbox' | 'upcoming' | 'calendar' | 'settings' | 'folder' | 'tag'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

function NavIcon({ kind, className = 'h-[18px] w-[18px]' }: { kind: IconKey; className?: string }) {
  const common = { fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
  if (kind === 'today') {
    return (
      <svg className={className} {...common}>
        <path d="M8 3v3M16 3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
        <path d="m9 14 2 2 4-4" />
      </svg>
    )
  }
  if (kind === 'inbox') {
    return (
      <svg className={className} {...common}>
        <path d="M20 13V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7m16 0v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-5m16 0h-3.5a1 1 0 0 0-.8.4l-1.4 1.86a1 1 0 0 1-.8.4h-3a1 1 0 0 1-.8-.4l-1.4-1.86A1 1 0 0 0 7.5 13H4" />
      </svg>
    )
  }
  if (kind === 'upcoming') {
    return (
      <svg className={className} {...common}>
        <path d="M8 3v3M16 3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
        <path d="M9 14h4m-2-2 2 2-2 2" />
      </svg>
    )
  }
  if (kind === 'calendar') {
    return (
      <svg className={className} {...common}>
        <path d="M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
        <path d="M8 12h2M12 12h2M16 12h2M8 16h2M12 16h2M16 16h2" />
      </svg>
    )
  }
  if (kind === 'settings') {
    return (
      <svg className={className} {...common}>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1A2 2 0 1 1 4.3 17l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1A2 2 0 1 1 7 4.3l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
      </svg>
    )
  }
  if (kind === 'folder') {
    return (
      <svg className={className} {...common}>
        <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
      </svg>
    )
  }
  return (
    <svg className={className} {...common}>
      <path d="M3 7h18M3 12h18M3 17h12" />
    </svg>
  )
}

function StarIcon({
  filled = false,
  className = 'h-3.5 w-3.5',
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

const TOP_NAV: { href: string; label: string; icon: IconKey }[] = [
  { href: '/inbox', label: 'Inbox', icon: 'inbox' },
  { href: '/today', label: 'Hoje', icon: 'today' },
  { href: '/upcoming', label: 'Próximos', icon: 'upcoming' },
  { href: '/calendar', label: 'Calendario', icon: 'calendar' },
]

const BOTTOM_NAV: { href: string; label: string; icon: IconKey }[] = [
  { href: '/settings', label: 'Configurações', icon: 'settings' },
]

function NavLink({
  href,
  label,
  icon,
  iconNode,
  count,
  collapsed = false,
}: {
  href: string
  label: string
  icon?: IconKey
  iconNode?: React.ReactNode
  count?: number
  collapsed?: boolean
}) {
  const pathname = usePathname()
  const active = pathname === href || pathname.startsWith(href + '/')

  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      aria-label={collapsed ? label : undefined}
      className={`group flex items-center rounded-md py-1.5 text-[13px] transition-colors ${
        collapsed ? 'justify-center px-2' : 'gap-2.5 px-2.5'
      } ${
        active
          ? 'bg-surface-selected text-brand-600'
          : 'text-navy-900 hover:bg-surface-soft'
      }`}
    >
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center ${
          active ? 'text-brand-600' : 'text-navy-400 group-hover:text-navy-700'
        }`}
      >
        {iconNode ?? (icon ? <NavIcon kind={icon} /> : null)}
      </span>
      {!collapsed && <span className="min-w-0 flex-1 truncate">{label}</span>}
      {!collapsed && count !== undefined && (
        <span
          className={`font-mono text-[11px] ${
            active ? 'text-brand-600' : 'text-navy-300'
          }`}
        >
          {count}
        </span>
      )}
    </Link>
  )
}

function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-2.5 pb-1 pt-4">
      <span className="font-mono text-[10px] font-bold uppercase tracking-wide text-navy-300">
        {children}
      </span>
      {action}
    </div>
  )
}

function SidebarToggleIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      className={`h-4 w-4 transition-transform ${collapsed ? 'rotate-180' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 6 9 12l6 6" />
    </svg>
  )
}

function ChevronRight({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-3 w-3 shrink-0 text-navy-400 transition-transform ${open ? 'rotate-90' : ''}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m9 6 6 6-6 6" />
    </svg>
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

function FolderTreeRow({
  node,
  depth,
  expanded,
  toggle,
  pathname,
  pinnedIds,
  togglePinned,
  collapsed = false,
}: {
  node: FolderTreeNode
  depth: number
  expanded: Set<string>
  toggle: (id: string) => void
  pathname: string
  pinnedIds: Set<string>
  togglePinned: (id: string) => void
  collapsed?: boolean
}) {
  const href = `/notas/${node.id}`
  const active = pathname === href || pathname.startsWith(href + '/')
  const hasChildren = node.children.length > 0
  const isOpen = expanded.has(node.id)
  const pinned = pinnedIds.has(node.id)

  return (
    <>
      <div
        title={collapsed ? node.name : undefined}
        className={`group flex items-center rounded-md py-1 text-[13px] transition-colors ${
          collapsed ? 'justify-center px-2' : 'gap-1 pr-1'
        } ${
          active ? 'bg-surface-selected text-brand-600' : 'text-navy-900 hover:bg-surface-soft'
        }`}
        style={collapsed ? undefined : { paddingLeft: `${8 + depth * 14}px` }}
      >
        {!collapsed && hasChildren ? (
          <button
            type="button"
            onClick={() => toggle(node.id)}
            className="flex h-4 w-4 shrink-0 items-center justify-center rounded hover:bg-navy-50"
            aria-label={isOpen ? 'Recolher' : 'Expandir'}
          >
            <ChevronRight open={isOpen} />
          </button>
        ) : !collapsed ? (
          <span className="h-4 w-4 shrink-0" />
        ) : null}
        <Link
          href={href}
          className={`flex min-w-0 items-center ${collapsed ? 'justify-center' : 'flex-1 gap-2'}`}
          aria-label={collapsed ? node.name : undefined}
        >
          <span
            className={`flex h-4 w-4 shrink-0 items-center justify-center ${
              active ? 'text-brand-600' : 'text-navy-400'
            }`}
          >
            <NavIcon kind="folder" className="h-4 w-4" />
          </span>
          {!collapsed && <span className="min-w-0 flex-1 truncate">{node.name}</span>}
        </Link>
        {!collapsed && (
          <button
            type="button"
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              togglePinned(node.id)
            }}
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded opacity-0 transition-opacity hover:bg-white group-hover:opacity-100 ${
              pinned ? 'text-brand-600 opacity-100' : 'text-navy-300 hover:text-navy-700'
            }`}
            title={pinned ? 'Desafixar' : 'Fixar'}
            aria-label={`${pinned ? 'Desafixar' : 'Fixar'} ${node.name}`}
          >
            <StarIcon filled={pinned} />
          </button>
        )}
      </div>
      {!collapsed && hasChildren && isOpen && node.children.map((child) => (
        <FolderTreeRow
          key={child.id}
          node={child}
          depth={depth + 1}
          expanded={expanded}
          toggle={toggle}
          pathname={pathname}
          pinnedIds={pinnedIds}
          togglePinned={togglePinned}
          collapsed={collapsed}
        />
      ))}
      {collapsed && hasChildren && (
        <span className="mx-auto -mt-0.5 mb-0.5 h-1 w-1 rounded-full bg-navy-300" />
      )}
    </>
  )
}

export function Sidebar() {
  const { setQuickCaptureOpen } = useUI()
  const { folders } = useFolders()
  const { items } = useItems()
  const pathname = usePathname()
  const { prefs, update } = usePreferences()
  const { prompt } = useDialog()
  const { data: profileData } = useSWR<{ profile: { name: string; email: string } }>(
    '/api/profile',
    fetcher,
  )
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const collapsed = prefs.sidebarCollapsed
  const profileName = profileData?.profile.name?.trim() || profileData?.profile.email?.trim() || 'Usuário'
  const profileInitial = profileName.slice(0, 1).toLocaleUpperCase('pt-BR')

  const tree = useMemo(() => buildFolderTree(folders), [folders])
  const folderById = useMemo(() => new Map(folders.map((folder) => [folder.id, folder])), [folders])
  const pinnedFolderIds = useMemo(
    () => prefs.pinnedFolderIds.filter((folderId) => folderById.has(folderId)),
    [folderById, prefs.pinnedFolderIds],
  )
  const pinnedFolderIdSet = useMemo(() => new Set(pinnedFolderIds), [pinnedFolderIds])
  const pinnedFolders = useMemo(
    () => pinnedFolderIds.map((folderId) => folderById.get(folderId)).filter(Boolean),
    [folderById, pinnedFolderIds],
  )
  const allParentIds = useMemo(() => collectIds(tree), [tree])
  const allExpanded = allParentIds.length > 0 && allParentIds.every((id) => expanded.has(id))

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
    update({
      pinnedFolderIds: pinnedFolderIds.includes(folderId)
        ? pinnedFolderIds.filter((id) => id !== folderId)
        : [folderId, ...pinnedFolderIds],
    })
  }

  async function handleNewFolder() {
    const name = await prompt({ title: 'Nova pasta', message: 'Nome da pasta', placeholder: 'Nome' })
    if (!name?.trim()) return
    await createFolder({ name: name.trim() })
  }

  const activeItems = items.filter((item) => item.status !== 'archived' && item.status !== 'done')

  const counts = {
    '/today': activeItems.filter((item) => item.dueDate === toLocalDateKey()).length,
    '/inbox': activeItems.filter((item) => {
      if (item.status === 'inbox') return true
      if (item.complexity === 'note') return !item.folderId
      return !item.folderId && !item.dueDate && !item.scheduledDate
    }).length,
    '/upcoming': activeItems.filter((item) => item.dueDate || item.scheduledDate).length,
  } as Record<string, number>

  return (
    <aside
      className={`flex h-full shrink-0 flex-col border-r border-ui-border bg-white transition-[width] duration-200 ${
        collapsed ? 'w-[68px]' : 'w-[260px]'
      }`}
    >
      <div
        className={`flex items-center pb-2.5 pt-3.5 ${
          collapsed ? 'justify-center px-2' : 'gap-2.5 px-3.5'
        }`}
      >
        <img src="/brand/logo-icon.svg" alt="" className="h-7 w-7 rounded-lg" />
        {!collapsed && (
          <span className="min-w-0 flex-1 text-[15px] font-extrabold tracking-normal text-navy-900">
            doit<span className="text-brand-600">.md</span>
          </span>
        )}
        <button
          type="button"
          onClick={() => update({ sidebarCollapsed: !collapsed })}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-navy-400 transition-colors hover:bg-surface-soft hover:text-navy-700"
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
          aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
          aria-pressed={collapsed}
        >
          <SidebarToggleIcon collapsed={collapsed} />
        </button>
      </div>

      <button
        type="button"
        onClick={() => setQuickCaptureOpen(true)}
        className={`mx-3 mb-2 flex items-center rounded-lg border border-ui-border bg-surface-soft py-2 text-left font-mono text-[12px] text-navy-300 transition-colors hover:border-ui-border-strong ${
          collapsed ? 'justify-center px-0' : 'gap-2 px-2.5'
        }`}
        title={collapsed ? 'Capturar novo item' : undefined}
        aria-label={collapsed ? 'Capturar novo item' : undefined}
      >
        <span className="text-[14px] text-navy-500">+</span>
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1 truncate">Capturar ou ir para...</span>
            <kbd className="rounded border border-ui-border-strong bg-white px-1.5 py-0.5 text-[10px] text-navy-500">
              q
            </kbd>
          </>
        )}
      </button>

      {!collapsed && <SectionTitle>Views</SectionTitle>}
      <div className="flex flex-col gap-px px-2">
        {TOP_NAV.filter((n) => n.href !== '/inbox' || prefs.showInbox).map((n) => (
          <NavLink key={n.href} {...n} count={counts[n.href]} collapsed={collapsed} />
        ))}
      </div>

      {collapsed ? (
        <div className="mt-4 flex flex-col items-center gap-1 px-2">
          <button
            type="button"
            onClick={handleNewFolder}
            className="flex h-8 w-8 items-center justify-center rounded-md text-navy-300 hover:bg-surface-soft hover:text-navy-700"
            title="Nova pasta"
            aria-label="Nova pasta"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
            </svg>
          </button>
          <Link
            href="/notas"
            className="flex h-8 w-8 items-center justify-center rounded-md text-navy-400 hover:bg-surface-soft hover:text-navy-700"
            title="Todas as notas"
            aria-label="Todas as notas"
          >
            <NavIcon kind="folder" className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <SectionTitle
          action={
            <div className="flex items-center gap-1">
              {allParentIds.length > 0 && (
                <button
                  type="button"
                  onClick={toggleAll}
                  className="rounded p-1 text-navy-300 hover:bg-surface-soft hover:text-navy-700"
                  title={allExpanded ? 'Recolher tudo' : 'Expandir tudo'}
                  aria-label={allExpanded ? 'Recolher tudo' : 'Expandir tudo'}
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    {allExpanded ? (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                    ) : (
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
                    )}
                  </svg>
                </button>
              )}
              <button
                type="button"
                onClick={handleNewFolder}
                className="rounded p-1 text-navy-300 hover:bg-surface-soft hover:text-navy-700"
                title="Nova pasta"
                aria-label="Nova pasta"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
                </svg>
              </button>
              <Link href="/notas" className="font-mono text-[10px] text-navy-300 hover:text-navy-700">
                Todas
              </Link>
            </div>
          }
        >
          Notas
        </SectionTitle>
      )}
      {!collapsed && pinnedFolders.length > 0 && (
        <>
          <SectionTitle>Fixadas</SectionTitle>
          <div className="flex flex-col gap-px px-2">
            {pinnedFolders.map((folder) =>
              folder ? (
                <Link
                  key={folder.id}
                  href={`/notas/${folder.id}`}
                  className={`group flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors ${
                    pathname === `/notas/${folder.id}` ||
                    pathname.startsWith(`/notas/${folder.id}/`)
                      ? 'bg-surface-selected text-brand-600'
                      : 'text-navy-900 hover:bg-surface-soft'
                  }`}
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center text-brand-600">
                    <StarIcon filled className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{folder.name}</span>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      togglePinned(folder.id)
                    }}
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-navy-300 opacity-0 hover:bg-white hover:text-navy-700 group-hover:opacity-100"
                    title="Desafixar"
                    aria-label={`Desafixar ${folder.name}`}
                  >
                    <StarIcon filled />
                  </button>
                </Link>
              ) : null,
            )}
          </div>
        </>
      )}
      <div className="flex flex-col px-1">
        {tree.length === 0 && !collapsed && (
          <span className="px-2.5 py-1 font-mono text-[11px] text-navy-300">Nenhuma pasta</span>
        )}
        {tree.map((node) => (
          <FolderTreeRow
            key={node.id}
            node={node}
            depth={0}
            expanded={expanded}
            toggle={toggle}
            pathname={pathname}
            pinnedIds={pinnedFolderIdSet}
            togglePinned={togglePinned}
            collapsed={collapsed}
          />
        ))}
      </div>

      <div className="flex-1" />

      <div className="border-t border-ui-border px-2 py-2">
        <div className="mb-2 flex flex-col gap-px">
          {BOTTOM_NAV.map((n) => <NavLink key={n.href} {...n} collapsed={collapsed} />)}
        </div>
        <div
          className={`flex items-center py-1.5 ${
            collapsed ? 'justify-center px-0' : 'gap-2 px-2.5'
          }`}
          title={collapsed ? profileName : undefined}
        >
          <span className="brand-gradient flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white">
            {profileInitial}
          </span>
          {!collapsed && <div className="min-w-0">
            <p className="truncate text-[12px] font-semibold text-navy-900">{profileName}</p>
            <p className="font-mono text-[10px] text-navy-500">Conta conectada</p>
          </div>}
        </div>
      </div>
    </aside>
  )
}
