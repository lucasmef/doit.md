'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useUI } from '@/store/ui'
import { usePreferences, type MobileNavItemId } from '@/hooks/use-preferences'

function IconInbox() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M20 13V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7m16 0v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-5m16 0h-2.586a1 1 0 0 0-.707.293l-2.414 2.414a1 1 0 0 1-.707.293h-3.172a1 1 0 0 1-.707-.293L6.293 13.293A1 1 0 0 0 5.586 13H4"
      />
    </svg>
  )
}

function IconToday() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z"
      />
    </svg>
  )
}

function IconUpcoming() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M8 3v3M16 3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm4 9h4m-2-2 2 2-2 2"
      />
    </svg>
  )
}

function IconCalendar() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M7 3v3M17 3v3M4 8h16M5 5h14v16H5z"
      />
    </svg>
  )
}

function IconNotes() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M6 3h9l3 3v15H6zM14 3v4h4M9 12h6M9 16h4"
      />
    </svg>
  )
}

function IconSettings() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <circle cx="12" cy="12" r="3" strokeWidth={1.8} />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1A2 2 0 1 1 4.3 17l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1A2 2 0 1 1 7 4.3l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"
      />
    </svg>
  )
}

export const MOBILE_NAV_LABELS: Record<MobileNavItemId, string> = {
  inbox: 'Inbox',
  today: 'Hoje',
  upcoming: 'Proximos',
  calendar: 'Calendario',
  notas: 'Notas',
  settings: 'Config',
}

const MOBILE_NAV_DEF: Record<MobileNavItemId, { href: string; icon: React.ReactNode }> = {
  inbox: { href: '/inbox', icon: <IconInbox /> },
  today: { href: '/today', icon: <IconToday /> },
  upcoming: { href: '/upcoming', icon: <IconUpcoming /> },
  calendar: { href: '/calendar', icon: <IconCalendar /> },
  notas: { href: '/notas', icon: <IconNotes /> },
  settings: { href: '/settings', icon: <IconSettings /> },
}

export function BottomNav() {
  const pathname = usePathname()
  const { setQuickCaptureOpen } = useUI()
  const { prefs } = usePreferences()

  const visible = prefs.mobileNav.filter((entry) => entry.visible)
  const splitIndex = Math.ceil(visible.length / 2)
  const leftItems = visible.slice(0, splitIndex)
  const rightItems = visible.slice(splitIndex)

  function linkClass(href: string) {
    const path = href.split('?')[0] ?? href
    const active = pathname === path || pathname.startsWith(path + '/')
    return `flex min-h-[68px] flex-1 flex-col items-center justify-center gap-0.5 py-1.5 transition-colors ${
      active ? 'text-brand-600' : 'text-slate-400'
    }`
  }

  function renderLink(id: MobileNavItemId) {
    const def = MOBILE_NAV_DEF[id]
    return (
      <Link
        key={id}
        href={def.href}
        className={linkClass(def.href)}
        onClick={(event) => event.stopPropagation()}
      >
        {def.icon}
        <span className="text-[9px] font-semibold">{MOBILE_NAV_LABELS[id]}</span>
      </Link>
    )
  }

  return (
    <nav className="safe-area-bottom fixed inset-x-0 bottom-0 z-[80] flex min-h-[76px] items-center border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgba(15,35,66,0.08)] lg:hidden">
      {leftItems.map((entry) => renderLink(entry.id))}

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          setQuickCaptureOpen(true)
        }}
        className="flex min-h-[68px] flex-1 flex-col items-center justify-center"
        title="Novo item"
      >
        <div className="-translate-y-3 flex h-12 w-12 items-center justify-center rounded-full border-4 border-white bg-brand-600 shadow-lg shadow-brand-500/30">
          <svg
            className="h-6 w-6 text-white"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.5}
              d="M12 4v16m8-8H4"
            />
          </svg>
        </div>
      </button>

      {rightItems.map((entry) => renderLink(entry.id))}
    </nav>
  )
}
