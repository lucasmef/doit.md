'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useItems } from '@/hooks/use-items'
import { useProjects } from '@/hooks/use-projects'
import { useUI } from '@/store/ui'
import { toLocalDateKey } from '@doit/core'

type IconKey = 'today' | 'inbox' | 'upcoming' | 'settings' | 'project' | 'tag'

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
  if (kind === 'settings') {
    return (
      <svg className={className} {...common}>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1A2 2 0 1 1 4.3 17l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1A2 2 0 1 1 7 4.3l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
      </svg>
    )
  }
  if (kind === 'tag') {
    return (
      <svg className={className} {...common}>
        <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0l-7.2-7.2a2 2 0 0 1-.6-1.4V5a2 2 0 0 1 2-2h7a2 2 0 0 1 1.4.6l7.4 7.4a2 2 0 0 1 0 2.8Z" />
        <circle cx="8" cy="8" r="1.4" />
      </svg>
    )
  }
  return (
    <svg className={className} {...common}>
      <path d="M3 7h18M3 12h18M3 17h12" />
    </svg>
  )
}

const TOP_NAV: { href: string; label: string; icon: IconKey }[] = [
  { href: '/today', label: 'Hoje', icon: 'today' },
  { href: '/inbox', label: 'Inbox', icon: 'inbox' },
  { href: '/upcoming', label: 'Proximos', icon: 'upcoming' },
]

const BOTTOM_NAV: { href: string; label: string; icon: IconKey }[] = [
  { href: '/settings', label: 'Configuracoes', icon: 'settings' },
]

function NavLink({
  href,
  label,
  icon,
  iconNode,
  count,
}: {
  href: string
  label: string
  icon?: IconKey
  iconNode?: React.ReactNode
  count?: number
}) {
  const pathname = usePathname()
  const active = pathname === href || pathname.startsWith(href + '/')

  return (
    <Link
      href={href}
      className={`group flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-colors ${
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
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {count !== undefined && (
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

export function Sidebar() {
  const { setQuickCaptureOpen } = useUI()
  const { projects } = useProjects()
  const { items } = useItems()

  const activeItems = items.filter((item) => item.status !== 'archived')
  const tags = Array.from(
    new Set(activeItems.flatMap((item) => item.tags ?? []).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b, 'pt-BR'))

  const counts = {
    '/today': activeItems.filter((item) => item.dueDate === toLocalDateKey()).length,
    '/inbox': activeItems.filter((item) => item.status === 'inbox' || (!item.projectId && !item.dueDate && !item.scheduledDate)).length,
    '/upcoming': activeItems.filter((item) => item.dueDate || item.scheduledDate).length,
  } as Record<string, number>

  return (
    <aside className="flex h-full w-[260px] shrink-0 flex-col border-r border-ui-border bg-white">
      <div className="flex items-center gap-2.5 px-3.5 pb-2.5 pt-3.5">
        <img src="/brand/logo-icon.svg" alt="" className="h-7 w-7 rounded-lg" />
        <span className="text-[15px] font-extrabold tracking-normal text-navy-900">
          doit<span className="text-brand-600">.md</span>
        </span>
      </div>

      <button
        type="button"
        onClick={() => setQuickCaptureOpen(true)}
        className="mx-3 mb-2 flex items-center gap-2 rounded-lg border border-ui-border bg-surface-soft px-2.5 py-2 text-left font-mono text-[12px] text-navy-300 transition-colors hover:border-ui-border-strong"
      >
        <span className="text-[14px] text-navy-500">+</span>
        <span className="min-w-0 flex-1 truncate">Capture or jump...</span>
        <kbd className="rounded border border-ui-border-strong bg-white px-1.5 py-0.5 text-[10px] text-navy-500">
          q
        </kbd>
      </button>

      <SectionTitle>Views</SectionTitle>
      <div className="flex flex-col gap-px px-2">
        {TOP_NAV.map((n) => (
          <NavLink key={n.href} {...n} count={counts[n.href]} />
        ))}
      </div>

      <SectionTitle
        action={
          <Link href="/projects" className="font-mono text-[10px] text-navy-300 hover:text-navy-700">
            Todos
          </Link>
        }
      >
        Projetos
      </SectionTitle>
      <div className="flex flex-col gap-px px-2">
        {projects
          .filter((p) => p.status === 'active')
          .slice(0, 8)
          .map((p) => (
            <NavLink
              key={p.id}
              href={`/projects/${p.id}`}
              label={p.name}
              iconNode={
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: p.color ?? '#94a3b8' }}
                />
              }
            />
          ))}
        {projects.length === 0 && (
          <span className="px-2.5 py-1 font-mono text-[11px] text-navy-300">Nenhum projeto</span>
        )}
      </div>

      <SectionTitle
        action={
          <Link href="/tags" className="font-mono text-[10px] text-navy-300 hover:text-navy-700">
            Todas
          </Link>
        }
      >
        Tags
      </SectionTitle>
      <div className="flex flex-col gap-px px-2">
        {tags.slice(0, 10).map((tag, index) => (
          <Link
            key={tag}
            href={`/tags/${encodeURIComponent(tag)}`}
            className="flex items-center gap-2 rounded-md px-2.5 py-1.5 font-mono text-[12px] text-navy-700 transition-colors hover:bg-surface-soft"
          >
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: index % 2 === 0 ? '#2f6bff' : '#28c7b7' }}
            />
            <span className="min-w-0 flex-1 truncate">#{tag}</span>
          </Link>
        ))}
        {tags.length === 0 && (
          <span className="px-2.5 py-1 font-mono text-[11px] text-navy-300">Nenhuma tag</span>
        )}
      </div>

      <div className="flex-1" />

      <div className="border-t border-ui-border px-2 py-2">
        <div className="mb-2 flex flex-col gap-px">
          {BOTTOM_NAV.map((n) => <NavLink key={n.href} {...n} />)}
        </div>
        <div className="flex items-center gap-2 px-2.5 py-1.5">
          <span className="brand-gradient flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold text-white">
            L
          </span>
          <div className="min-w-0">
            <p className="truncate text-[12px] font-semibold text-navy-900">Lucas</p>
            <p className="font-mono text-[10px] text-navy-300">local workspace</p>
          </div>
        </div>
      </div>
    </aside>
  )
}
