'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useItems } from '@/hooks/use-items'
import { useProjects } from '@/hooks/use-projects'
import { useUI } from '@/store/ui'
import { toLocalDateKey } from '@doit/core'

const TOP_NAV = [
  { href: '/today', label: 'Hoje', token: '- [x]' },
  { href: '/inbox', label: 'Inbox', token: 'in' },
  { href: '/upcoming', label: 'Proximos', token: '>>' },
  { href: '/archive', label: 'Arquivo', token: 'ok' },
]

const BOTTOM_NAV = [
  { href: '/audit', label: 'Auditoria', token: 'diff' },
  { href: '/settings', label: 'Configuracoes', token: 'cfg' },
]

function NavLink({
  href,
  label,
  token,
  count,
}: {
  href: string
  label: string
  token?: string
  count?: number
}) {
  const pathname = usePathname()
  const active = pathname === href || pathname.startsWith(href + '/')

  return (
    <Link
      href={href}
      className={`group flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[13px] transition-colors ${
        active
          ? 'bg-surface-selected text-brand-600'
          : 'text-navy-900 hover:bg-surface-soft'
      }`}
    >
      {token && (
        <span
          className={`w-9 shrink-0 font-mono text-[11px] font-semibold ${
            active ? 'text-brand-600' : 'text-navy-300 group-hover:text-navy-500'
          }`}
        >
          {token}
        </span>
      )}
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
    '/archive': items.filter((item) => item.status === 'done' || item.status === 'archived').length,
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
            <NavLink key={p.id} href={`/projects/${p.id}`} label={p.name} token="#" />
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
