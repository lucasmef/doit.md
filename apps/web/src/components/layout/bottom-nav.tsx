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

function IconDashboard() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.8}
        d="M4 5a1 1 0 0 1 1-1h5v7H4V5ZM14 4h5a1 1 0 0 1 1 1v4h-6V4ZM4 15h6v5H5a1 1 0 0 1-1-1v-4ZM14 13h6v6a1 1 0 0 1-1 1h-5v-7Z"
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
  dashboard: 'Painel',
  inbox: 'Inbox',
  today: 'Hoje',
  upcoming: 'Próximos',
  calendar: 'Calendário',
  notas: 'Notas',
  settings: 'Config',
}

const MOBILE_NAV_DEF: Record<MobileNavItemId, { href: string; icon: React.ReactNode }> = {
  dashboard: { href: '/dashboard', icon: <IconDashboard /> },
  inbox: { href: '/inbox', icon: <IconInbox /> },
  today: { href: '/today', icon: <IconToday /> },
  upcoming: { href: '/upcoming', icon: <IconUpcoming /> },
  calendar: { href: '/calendar', icon: <IconCalendar /> },
  notas: { href: '/notas', icon: <IconNotes /> },
  settings: { href: '/settings', icon: <IconSettings /> },
}

export function BottomNav() {
  const pathname = usePathname()
  const { quickCaptureOpen, quickCaptureEditId, selectedItemId, openCapture } = useUI()
  const { prefs } = usePreferences()
  const overlayOpen = quickCaptureOpen || !!quickCaptureEditId || !!selectedItemId

  if (overlayOpen) return null

  const visible = prefs.mobileNav.filter((entry) => entry.visible).slice(0, 4)
  const splitIndex = Math.ceil(visible.length / 2)
  const leftItems = visible.slice(0, splitIndex)
  const rightItems = visible.slice(splitIndex)

  function renderLink(id: MobileNavItemId) {
    const def = MOBILE_NAV_DEF[id]
    const path = def.href.split('?')[0] ?? def.href
    const active = pathname === path || pathname.startsWith(path + '/')
    return (
      <Link
        key={id}
        href={def.href}
        onClick={(event) => event.stopPropagation()}
        className="relative flex h-full min-w-0 flex-1 items-center justify-center"
      >
        <span
          className={`flex h-[52px] w-full max-w-[68px] flex-col items-center justify-center gap-0.5 rounded-2xl transition-all ${
            active
              ? 'bg-white text-navy-900 shadow-cool-sm'
              : 'text-navy-400 hover:text-navy-700'
          }`}
        >
          <span className={active ? 'text-brand-600' : ''}>{def.icon}</span>
          <span className="font-mono text-[9px] font-bold uppercase tracking-wider">{MOBILE_NAV_LABELS[id]}</span>
        </span>
      </Link>
    )
  }

  return (
    <nav
      className="fixed inset-x-3 z-[80] flex h-[64px] items-center gap-1 rounded-[24px] border border-white/55 bg-white/72 px-2 shadow-[0_1px_0_rgba(255,255,255,.72)_inset,0_18px_40px_-16px_rgba(15,35,66,.18),0_4px_12px_rgba(15,35,66,.06)] backdrop-blur-2xl lg:hidden"
      style={{ bottom: 'max(env(safe-area-inset-bottom), 12px)' }}
    >
      {leftItems.map((entry) => renderLink(entry.id))}

      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          openCapture()
        }}
        className="relative flex h-full min-w-0 flex-1 items-center justify-center"
        title="Novo item"
      >
        <div className="-translate-y-4 inline-flex h-12 w-12 items-center justify-center rounded-full border-2 border-white bg-[linear-gradient(135deg,#2F6BFF_0%,#7B5BFF_55%,#28C7B7_100%)] text-white shadow-[0_8px_22px_rgba(47,107,255,.45),0_4px_12px_rgba(40,199,183,.32)] transition-transform hover:translate-y-[-1.25rem]">
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.6}
              d="M12 4v16m8-8H4"
            />
          </svg>
        </div>
      </button>

      {rightItems.map((entry) => renderLink(entry.id))}
    </nav>
  )
}
