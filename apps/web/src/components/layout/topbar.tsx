'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import useSWR from 'swr'
import { useUI } from '@/store/ui'
import { SignOutButton } from '@/components/auth/sign-out-button'
import type { Item } from '@doit/types'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  inbox: 'Inbox',
  today: 'Hoje',
  upcoming: 'Proximos',
  calendar: 'Calendário',
  archive: 'Arquivo',
  projects: 'Pastas',
  tags: 'Tags',
  audit: 'Auditoria',
  settings: 'Configuracoes',
  notas: 'Notas',
}

const DESKTOP_NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: 'dashboard', match: ['/dashboard'] },
  { href: '/itens', label: 'Itens', icon: 'items', match: ['/itens', '/inbox', '/upcoming'] },
  { href: '/today', label: 'Hoje', icon: 'today', match: ['/today'] },
  { href: '/notas', label: 'Notas', icon: 'notes', match: ['/notas'] },
  { href: '/calendar', label: 'Calendário', icon: 'calendar', match: ['/calendar'] },
  { href: '/settings', label: 'Ajustes', icon: 'settings', match: ['/settings'] },
] as const

type MobileIconKind = 'dashboard' | 'today' | 'items' | 'inbox' | 'upcoming' | 'calendar' | 'notes' | 'settings'

const MOBILE_NAV_ITEMS: Array<{ href: string; label: string; icon: MobileIconKind }> = [
  { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { href: '/today', label: 'Hoje', icon: 'today' },
  { href: '/itens', label: 'Itens', icon: 'items' },
  { href: '/inbox', label: 'Inbox', icon: 'inbox' },
  { href: '/upcoming', label: 'Proximos', icon: 'upcoming' },
  { href: '/calendar', label: 'Calendário', icon: 'calendar' },
  { href: '/notas', label: 'Notas', icon: 'notes' },
  { href: '/settings', label: 'Ajustes', icon: 'settings' },
]

function MobileNavIcon({ kind }: { kind: MobileIconKind }) {
  const common = {
    className: 'h-[16px] w-[16px] shrink-0',
    fill: 'none',
    viewBox: '0 0 24 24',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  if (kind === 'dashboard') {
    return (
      <svg {...common}>
        <path d="M3 12 12 3l9 9" />
        <path d="M5 10v10h14V10" />
      </svg>
    )
  }
  if (kind === 'today') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    )
  }
  if (kind === 'inbox') {
    return (
      <svg {...common}>
        <path d="M22 12h-6l-2 3h-4l-2-3H2" />
        <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z" />
      </svg>
    )
  }
  if (kind === 'upcoming') {
    return (
      <svg {...common}>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    )
  }
  if (kind === 'calendar') {
    return (
      <svg {...common}>
        <path d="M7 3v3M17 3v3M4 8h16M5 5h14v16H5z" />
      </svg>
    )
  }
  if (kind === 'notes') {
    return (
      <svg {...common}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
      </svg>
    )
  }
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1A2 2 0 1 1 4.3 17l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1A2 2 0 1 1 7 4.3l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.3-4.3M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4Z" />
    </svg>
  )
}

function MenuIcon() {
  return (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 3v3M17 3v3M4 8h16M5 5h14v16H5z" />
    </svg>
  )
}

function NavIcon({ kind }: { kind: (typeof DESKTOP_NAV_ITEMS)[number]['icon'] }) {
  const common = {
    className: 'h-[15px] w-[15px]',
    fill: 'none',
    viewBox: '0 0 24 24',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  }
  if (kind === 'dashboard') {
    return (
      <svg {...common}>
        <path d="M3 12 12 3l9 9" />
        <path d="M5 10v10h14V10" />
      </svg>
    )
  }
  if (kind === 'today') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
    )
  }
  if (kind === 'items') {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="9" />
        <path d="m8 12 3 3 5-6" />
      </svg>
    )
  }
  if (kind === 'notes') {
    return (
      <svg {...common}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
      </svg>
    )
  }
  if (kind === 'calendar') return <CalendarIcon />
  return (
    <svg {...common}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1A2 2 0 1 1 4.3 17l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1A2 2 0 1 1 7 4.3l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" />
    </svg>
  )
}

function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatSearchDate(dateStr: string): string {
  const today = toDateKey(new Date())
  const tomorrowDate = new Date()
  tomorrowDate.setDate(tomorrowDate.getDate() + 1)
  const tomorrow = toDateKey(tomorrowDate)
  if (dateStr === today) return 'Hoje'
  if (dateStr === tomorrow) return 'Amanha'
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'short',
  })
}

export function Topbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { setQuickCaptureOpen, setSelectedItemId } = useUI()
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [open, setOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const { data: profileData } = useSWR<{ profile: { name: string; email: string } }>('/api/profile', fetcher)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setMobileSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  useEffect(() => {
    const focusSearch = () => {
      setMobileSearchOpen(true)
      setOpen(Boolean(query))
      window.requestAnimationFrame(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      })
    }
    window.addEventListener('doit:focus-search', focusSearch)
    return () => window.removeEventListener('doit:focus-search', focusSearch)
  }, [query])

  const { data, isLoading, isValidating } = useSWR<{ items: Item[] }>(
    debounced.length > 1 ? `/api/items/search?q=${encodeURIComponent(debounced)}` : null,
    fetcher,
  )

  const items = data?.items || []
  const isSearching = query.trim().length > 1 && (query !== debounced || isLoading || isValidating)
  const mobilePageTitle = useMemo(() => {
    const parts = pathname.split('/').filter(Boolean)
    const last = parts[parts.length - 1]
    if (!last) return 'Dashboard'
    if (parts[0] === 'notas' && parts.length > 1) return 'Notas'
    return ROUTE_LABELS[last] ?? last
  }, [pathname])
  const profileName = profileData?.profile.name?.trim() || profileData?.profile.email?.trim() || 'Usuario'
  const profileInitial = profileName.slice(0, 1).toLocaleUpperCase('pt-BR')

  function isActive(match: readonly string[]) {
    return match.some((href) => pathname === href || pathname.startsWith(`${href}/`))
  }

  return (
    <>
      <header className="z-[130] flex h-14 shrink-0 items-center gap-3 border-b border-white/45 bg-white/58 px-4 shadow-[0_1px_0_rgba(255,255,255,.65)_inset,0_10px_30px_rgba(15,35,66,.08)] backdrop-blur-2xl lg:mb-6 lg:grid lg:h-auto lg:grid-cols-[1fr_auto_1fr] lg:gap-[18px] lg:border-none lg:bg-transparent lg:px-0 lg:py-0 lg:shadow-none lg:backdrop-blur-none">
        <Link
          href="/dashboard"
          className="hidden w-max items-center gap-3 rounded-full border border-white/60 bg-white/55 py-2 pl-2 pr-4 shadow-cool-sm backdrop-blur-xl lg:inline-flex"
        >
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-[9px] bg-[#F8FAFC] shadow-[0_1px_2px_rgba(15,35,66,.08)]">
            <img src="/brand/logo-icon.svg" alt="" className="h-[22px] w-[22px]" />
          </span>
          <span className="text-[16px] font-black tracking-normal text-navy-900">
            doit<span className="text-brand-600">.md</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1 rounded-full border border-white/60 bg-white/55 p-1.5 shadow-cool-sm backdrop-blur-xl lg:inline-flex">
          {DESKTOP_NAV_ITEMS.map((item) => {
            const active = isActive(item.match)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`inline-flex h-9 items-center gap-2 rounded-full px-4 text-[13px] transition-colors ${
                  active
                    ? 'bg-white font-bold text-navy-900 shadow-cool-sm'
                    : 'font-medium text-navy-500 hover:text-navy-900'
                }`}
              >
                <NavIcon kind={item.icon} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div
          className={`min-w-0 flex-1 items-center gap-2 lg:hidden ${mobileSearchOpen ? 'hidden' : 'flex'}`}
        >
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/55 bg-white/45 text-navy-600 hover:bg-white/75"
            aria-label="Abrir menu"
            title="Menu"
          >
            <MenuIcon />
          </button>
          <span className="min-w-0 truncate text-[17px] font-semibold text-navy-900">
            {mobilePageTitle}
          </span>
        </div>

        <button
          type="button"
          onClick={() => setMobileSearchOpen(true)}
          className={`h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/55 bg-white/55 text-navy-500 lg:hidden ${
            mobileSearchOpen ? 'hidden' : 'inline-flex'
          }`}
          aria-label="Buscar"
          title="Buscar"
        >
          <SearchIcon />
        </button>

        <div className="hidden min-w-0 items-center justify-end gap-2 lg:flex">
          <div className="relative w-[min(27vw,330px)]" ref={ref}>
            <input
              ref={inputRef}
              type="text"
              placeholder="Buscar itens, notas..."
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setOpen(true)
              }}
              onFocus={() => {
                if (query) setOpen(true)
              }}
              className="h-10 w-full rounded-full border border-white/60 bg-white/60 py-1.5 pl-9 pr-16 text-[13px] text-navy-900 outline-none shadow-cool-sm transition-colors placeholder:font-mono placeholder:text-navy-300 focus:border-brand-300 focus:bg-white/80"
            />
            <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-white/70 bg-white/72 px-1.5 py-0.5 font-mono text-[10px] text-navy-500">
              Ctrl K
            </kbd>
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-navy-300">
              <SearchIcon />
            </span>
            {open && debounced.length > 1 && (
              <SearchResults
                items={items}
                isSearching={isSearching}
                onSelect={(itemId) => {
                  setOpen(false)
                  setSelectedItemId(itemId)
                }}
              />
            )}
          </div>
          <button
            onClick={() => router.push('/calendar')}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
              pathname === '/calendar'
                ? 'bg-white/80 text-brand-600 shadow-cool-sm'
                : 'text-navy-500 hover:bg-white/65'
            }`}
            title="Abrir calendario (Shift+C)"
          >
            <CalendarIcon />
          </button>
          <button
            onClick={() => setQuickCaptureOpen(true)}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-brand-600 px-4 text-[13px] font-bold text-white shadow-cool-sm transition-colors hover:bg-brand-700"
          >
            + Novo
          </button>
          <div className="flex h-[42px] w-[42px] items-center justify-center rounded-full border-2 border-white/70 bg-gradient-to-br from-pink-400 via-violet-400 to-teal-500 text-[13px] font-bold text-white shadow-[0_2px_8px_rgba(15,35,66,.18)]">
            {profileInitial}
          </div>
          <SignOutButton className="hidden xl:inline-flex" />
        </div>

        <div
          className={`relative flex-1 lg:hidden ${
            mobileSearchOpen ? 'absolute inset-x-3 top-2 z-50' : 'hidden'
          }`}
          ref={ref}
        >
          <input
            ref={inputRef}
            type="text"
            placeholder="Buscar ou ir para..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setOpen(true)
            }}
            onFocus={() => {
              if (query) setOpen(true)
            }}
            className="h-10 w-full rounded-full border border-white/60 bg-white/80 py-1.5 pl-9 pr-12 text-[16px] text-navy-900 outline-none shadow-cool-sm placeholder:font-mono placeholder:text-navy-300"
          />
          <button
            type="button"
            onClick={() => {
              setMobileSearchOpen(false)
              setOpen(false)
            }}
            className="absolute right-1 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-navy-400"
            aria-label="Fechar busca"
          >
            <CloseIcon />
          </button>
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-navy-300">
            <SearchIcon />
          </span>
          {open && debounced.length > 1 && (
            <SearchResults
              items={items}
              isSearching={isSearching}
              onSelect={(itemId) => {
                setOpen(false)
                setMobileSearchOpen(false)
                setSelectedItemId(itemId)
              }}
            />
          )}
        </div>
      </header>

      {mobileMenuOpen ? (
        <div
          className="fixed inset-0 z-[220] isolate bg-navy-900/40 backdrop-blur-md lg:hidden"
          role="dialog"
          aria-modal="true"
          onClick={(event) => {
            if (event.target === event.currentTarget) setMobileMenuOpen(false)
          }}
        >
          <div className="absolute inset-y-3 left-3 flex w-[min(82vw,340px)] flex-col overflow-hidden rounded-[24px] border border-white/55 bg-white/72 shadow-[0_1px_0_rgba(255,255,255,.7)_inset,0_24px_60px_rgba(15,35,66,.28),0_4px_12px_rgba(15,35,66,.06)] backdrop-blur-2xl">
            <div className="flex items-center gap-3 border-b border-navy-900/[0.06] px-4 pb-3 pt-4">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-[9px] bg-[#F8FAFC] shadow-[0_1px_2px_rgba(15,35,66,.08)]">
                <img src="/brand/logo-icon.svg" alt="" className="h-[18px] w-[18px]" />
              </span>
              <span className="text-[15px] font-black tracking-tight text-navy-900">
                doit<span className="text-brand-600">.md</span>
              </span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-full bg-navy-900/[0.05] text-navy-500 hover:bg-navy-900/[0.10] hover:text-navy-900"
                aria-label="Fechar menu"
              >
                <CloseIcon />
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false)
                window.dispatchEvent(new Event('doit:focus-search'))
              }}
              className="mx-3 mt-3 flex items-center gap-2 rounded-full border border-white/60 bg-white/55 px-4 py-2.5 font-mono text-[12px] text-navy-500 shadow-cool-sm backdrop-blur-xl hover:bg-white/75"
            >
              <SearchIcon />
              <span>Buscar itens, notas...</span>
              <span className="ml-auto rounded-md border border-navy-900/[0.08] bg-white px-1.5 py-0.5 text-[10px]">
                ⌘K
              </span>
            </button>

            <div className="px-5 pb-1.5 pt-4 font-mono text-[10px] font-bold uppercase tracking-wider text-navy-500">
              Paginas
            </div>
            <nav className="flex flex-1 flex-col gap-1 overflow-auto px-2.5 pb-2">
              {MOBILE_NAV_ITEMS.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex h-11 items-center gap-3 rounded-full px-3.5 text-[14px] transition-colors ${
                      active
                        ? 'bg-white font-bold text-navy-900 shadow-cool-sm'
                        : 'font-medium text-navy-700 hover:bg-white/55'
                    }`}
                  >
                    <MobileNavIcon kind={item.icon} />
                    {item.label}
                  </Link>
                )
              })}
            </nav>

            <div className="space-y-2 border-t border-navy-900/[0.06] p-3">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false)
                  setQuickCaptureOpen(true)
                }}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-navy-900 text-[14px] font-bold text-white shadow-[0_6px_14px_rgba(15,35,66,.22)] transition-all hover:translate-y-[-1px] hover:bg-navy-800 hover:shadow-[0_10px_22px_rgba(15,35,66,.28)]"
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Novo item
              </button>
              <SignOutButton className="w-full justify-center" />
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

function SearchResults({
  items,
  isSearching,
  onSelect,
}: {
  items: Item[]
  isSearching: boolean
  onSelect: (itemId: string) => void
}) {
  return (
    <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-80 overflow-y-auto rounded-xl border border-ui-border bg-white p-1.5 shadow-cool-md">
      {isSearching ? (
        <div className="p-4 text-center text-sm text-navy-500">Buscando...</div>
      ) : items.length === 0 ? (
        <div className="p-4 text-center text-sm text-navy-500">Nenhum item encontrado.</div>
      ) : (
        <div className="space-y-1">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => onSelect(item.id)}
              className="w-full rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-surface-soft"
            >
              <span className="block truncate font-medium text-navy-900">{item.title}</span>
              {item.dueDate && (
                <span className="mt-0.5 block font-mono text-[11px] text-navy-500">
                  {formatSearchDate(item.dueDate)}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
