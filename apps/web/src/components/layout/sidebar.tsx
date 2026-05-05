'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/inbox', label: 'Inbox' },
  { href: '/today', label: 'Hoje' },
  { href: '/upcoming', label: 'Próximos' },
  { href: '/calendar', label: 'Calendário' },
  { href: '/projects', label: 'Projetos' },
  { href: '/areas', label: 'Áreas' },
  { href: '/audit', label: 'Auditoria' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 shrink-0 h-full bg-surface-subtle border-r border-slate-200 flex flex-col py-4 px-3 gap-1">
      <div className="px-2 mb-4">
        <span className="text-lg font-semibold tracking-tight text-slate-900">Clarity</span>
      </div>

      {NAV.map(({ href, label }) => {
        const active = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              active
                ? 'bg-brand-100 text-brand-700'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            {label}
          </Link>
        )
      })}
    </aside>
  )
}
