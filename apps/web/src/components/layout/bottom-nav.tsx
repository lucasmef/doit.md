'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUI } from '@/store/ui'

function IconInbox() {
  return (
    <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20 13V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7m16 0v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-5m16 0h-2.586a1 1 0 0 0-.707.293l-2.414 2.414a1 1 0 0 1-.707.293h-3.172a1 1 0 0 1-.707-.293L6.293 13.293A1 1 0 0 0 5.586 13H4" />
    </svg>
  )
}

function IconToday() {
  return (
    <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z" />
    </svg>
  )
}

function IconCalendar() {
  return (
    <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 3v3M17 3v3M4 8h16M5 5h14v16H5z" />
    </svg>
  )
}

function IconMenu() {
  return (
    <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  )
}

const MENU_LINKS = [
  { href: '/projects', label: 'Projetos' },
  { href: '/tags', label: 'Tags' },
  { href: '/settings', label: 'Configuracoes' },
  { href: '/settings?tab=archive', label: 'Arquivo' },
  { href: '/settings?tab=audit', label: 'Auditoria' },
]

export function BottomNav() {
  const pathname = usePathname()
  const { setQuickCaptureOpen, setCalendarOpen } = useUI()
  const [menuOpen, setMenuOpen] = useState(false)

  function linkClass(href: string) {
    const path = href.split('?')[0] ?? href
    const active = pathname === path || pathname.startsWith(path + '/')
    return `flex min-h-[72px] flex-1 flex-col items-center justify-center gap-1 py-2 transition-colors ${
      active ? 'text-brand-600' : 'text-slate-400'
    }`
  }

  return (
    <>
      {menuOpen && (
        <div className="fixed inset-0 z-[70] bg-navy-900/30 lg:hidden" onClick={() => setMenuOpen(false)}>
          <div
            className="absolute bottom-[88px] right-3 w-56 overflow-hidden rounded-2xl border border-ui-border bg-white p-1.5 shadow-cool-lg"
            onClick={(event) => event.stopPropagation()}
          >
            {MENU_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="block rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-surface-soft"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      )}

      <nav className="safe-area-bottom fixed inset-x-0 bottom-0 z-[80] flex min-h-[80px] items-center border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(15,35,66,0.08)] lg:hidden">
        <Link href="/inbox" className={linkClass('/inbox')} onClick={(event) => event.stopPropagation()}>
          <IconInbox />
          <span className="text-[10px] font-semibold">Inbox</span>
        </Link>

        <Link href="/today" className={linkClass('/today')} onClick={(event) => event.stopPropagation()}>
          <IconToday />
          <span className="text-[10px] font-semibold">Hoje</span>
        </Link>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            setQuickCaptureOpen(true)
          }}
          className="flex min-h-[72px] flex-1 flex-col items-center justify-center"
          title="Novo item"
        >
          <div className="-translate-y-4 flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-brand-600 shadow-lg shadow-brand-500/30">
            <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
          </div>
        </button>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            setCalendarOpen(true)
          }}
          className="flex min-h-[72px] flex-1 flex-col items-center justify-center gap-1 py-2 text-slate-400 transition-colors"
        >
          <IconCalendar />
          <span className="text-[10px] font-semibold">Calendario</span>
        </button>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation()
            setMenuOpen((open) => !open)
          }}
          className={`flex min-h-[72px] flex-1 flex-col items-center justify-center gap-1 py-2 transition-colors ${
            menuOpen ? 'text-brand-600' : 'text-slate-400'
          }`}
        >
          <IconMenu />
          <span className="text-[10px] font-semibold">Menu</span>
        </button>
      </nav>
    </>
  )
}
