'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useProjects } from '@/hooks/use-projects'

const TOP_NAV = [
  { href: '/inbox', label: 'Inbox' },
  { href: '/today', label: 'Hoje' },
  { href: '/upcoming', label: 'Próximos' },
  { href: '/calendar', label: 'Calendário' },
]

const BOTTOM_NAV = [
  { href: '/areas', label: 'Áreas' },
  { href: '/audit', label: 'Auditoria' },
  { href: '/settings', label: 'Configurações' },
]

function NavLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname()
  const active = pathname === href || pathname.startsWith(href + '/')
  return (
    <Link
      href={href}
      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors truncate ${
        active
          ? 'bg-brand-100 text-brand-700'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      {label}
    </Link>
  )
}

export function Sidebar() {
  const { projects } = useProjects()

  return (
    <aside className="w-56 shrink-0 h-full bg-surface-sidebar border-r border-ui-border flex flex-col py-6 px-3">
      <div className="px-2 mb-5">
        <span className="text-lg font-semibold tracking-tight text-slate-900">doit.md</span>
      </div>

      <div className="flex flex-col gap-0.5">
        {TOP_NAV.map((n) => <NavLink key={n.href} {...n} />)}
      </div>

      {/* Projetos */}
      <div className="mt-5">
        <div className="flex items-center justify-between px-3 mb-1">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
            Projetos
          </span>
          <Link href="/projects" className="text-[10px] text-slate-400 hover:text-slate-700">
            Ver todos
          </Link>
        </div>
        <div className="flex flex-col gap-0.5">
          {projects
            .filter((p) => p.status === 'active')
            .slice(0, 8)
            .map((p) => (
              <NavLink key={p.id} href={`/projects/${p.id}`} label={p.name} />
            ))}
          {projects.length === 0 && (
            <span className="px-3 text-xs text-slate-300">Nenhum projeto</span>
          )}
        </div>
      </div>

      <div className="flex-1" />

      <div className="flex flex-col gap-0.5 border-t border-slate-200 pt-3 mt-3">
        {BOTTOM_NAV.map((n) => <NavLink key={n.href} {...n} />)}
      </div>
    </aside>
  )
}
