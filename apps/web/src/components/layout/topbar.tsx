'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useUI } from '@/store/ui'
import useSWR from 'swr'
import type { Item } from '@doit/types'
import { SignOutButton } from '@/components/auth/sign-out-button'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const ROUTE_LABELS: Record<string, string> = {
  inbox: 'Inbox',
  today: 'Hoje',
  upcoming: 'Próximos',
  calendar: 'Calendário',
  archive: 'Arquivo',
  projects: 'Projetos',
  tags: 'Tags',
  audit: 'Auditoria',
  settings: 'Configurações',
  notas: 'Notas',
}

function SearchIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m21 21-4.3-4.3M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4Z"
      />
    </svg>
  )
}

function MenuIcon() {
  return (
    <svg
      className="h-5 w-5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M7 3v3M17 3v3M4 8h16M5 5h14v16H5z" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6 6 18" />
    </svg>
  )
}

function formatSearchDate(dateStr: string): string {
  const today = toDateKey(new Date())
  const tomorrowDate = new Date()
  tomorrowDate.setDate(tomorrowDate.getDate() + 1)
  const tomorrow = toDateKey(tomorrowDate)
  if (dateStr === today) return 'Hoje'
  if (dateStr === tomorrow) return 'Amanhã'
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'short',
  })
}

function toDateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const MOBILE_NAV_ITEMS = [
  { href: '/today', label: 'Hoje' },
  { href: '/calendar', label: 'Calendario' },
  { href: '/inbox', label: 'Inbox' },
  { href: '/upcoming', label: 'Proximos' },
  { href: '/notas', label: 'Notas' },
  { href: '/settings', label: 'Configuracoes' },
]

export function Topbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { setQuickCaptureOpen, setSelectedItemId, calendarOpen, setCalendarOpen } = useUI()
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [open, setOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const crumbs = useMemo(() => {
    const parts = pathname.split('/').filter(Boolean)
    if (parts.length === 0) return ['doit.md']
    return ['doit.md', ...parts.map((part) => ROUTE_LABELS[part] ?? part)]
  }, [pathname])

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
    if (!last) return 'Hoje'
    if (parts[0] === 'notas' && parts.length > 1) return 'Notas'
    if (last === 'calendar') return 'Calendario'
    if (last === 'upcoming') return 'Proximos'
    if (last === 'settings') return 'Configuracoes'
    return ROUTE_LABELS[last] ?? last
  }, [pathname])

  return (
    <header className="z-30 flex h-14 shrink-0 items-center gap-3 border-b border-ui-border bg-surface-window/85 px-4 backdrop-blur-md">
      <div className="hidden min-w-0 items-center gap-1.5 font-mono text-[12px] text-navy-300 sm:flex">
        {crumbs.map((crumb, index) => (
          <span key={`${crumb}-${index}`} className="flex min-w-0 items-center gap-1.5">
            {index > 0 && <span className="text-navy-200">/</span>}
            <span className={index === crumbs.length - 1 ? 'truncate text-navy-900' : 'truncate'}>
              {index === 0 ? (
                <>
                  <span className="text-brand-600">.</span>md
                </>
              ) : (
                crumb
              )}
            </span>
          </span>
        ))}
      </div>

      <div
        className={`min-w-0 flex-1 items-center gap-2 sm:hidden ${mobileSearchOpen ? 'hidden' : 'flex'}`}
      >
        <button
          type="button"
          onClick={() => setMobileMenuOpen(true)}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-navy-600 hover:bg-surface-soft"
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
        className={`h-10 w-10 shrink-0 items-center justify-center rounded-md border border-ui-border bg-white text-navy-500 sm:hidden ${
          mobileSearchOpen ? 'hidden' : 'inline-flex'
        }`}
        aria-label="Buscar"
        title="Buscar"
      >
        <SearchIcon />
      </button>

      <div
        className={`relative ml-0 flex-1 sm:ml-auto sm:max-w-sm ${
          mobileSearchOpen ? 'absolute inset-x-3 top-2 z-50 sm:static' : 'hidden sm:block'
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
          className="h-10 w-full rounded-lg border border-ui-border bg-surface-soft py-1.5 pl-9 pr-12 text-[16px] text-navy-900 outline-none transition-colors placeholder:font-mono placeholder:text-navy-300 focus:border-brand-300 sm:h-9 sm:pr-16 sm:text-[13px]"
        />
        <button
          type="button"
          onClick={() => {
            setMobileSearchOpen(false)
            setOpen(false)
          }}
          className="absolute right-1 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-navy-400 sm:hidden"
          aria-label="Fechar busca"
        >
          <CloseIcon />
        </button>
        <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-ui-border-strong bg-white px-1.5 py-0.5 font-mono text-[10px] text-navy-500 sm:block">
          Ctrl K
        </kbd>
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-navy-300">
          <SearchIcon />
        </span>

        {open && debounced.length > 1 && (
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
                    onClick={() => {
                      setOpen(false)
                      setSelectedItemId(item.id)
                    }}
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
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => {
            setCalendarOpen(false)
            window.dispatchEvent(new Event('doit:open-calendar-view'))
            router.push('/upcoming?view=calendar')
          }}
          className={`hidden h-9 w-9 items-center justify-center rounded-md transition-colors lg:inline-flex ${
            calendarOpen || pathname === '/upcoming'
              ? 'bg-surface-selected text-brand-600'
              : 'text-navy-500 hover:bg-surface-soft'
          }`}
          title="Abrir calendário (Shift+C)"
        >
          <CalendarIcon />
        </button>
        <button
          onClick={() => setQuickCaptureOpen(true)}
          className="hidden h-9 items-center gap-2 rounded-md bg-brand-600 px-3 text-[13px] font-semibold text-white transition-colors hover:bg-brand-700 sm:inline-flex"
        >
          + Novo
        </button>
        <SignOutButton className="hidden sm:inline-flex" />
      </div>

      {mobileMenuOpen ? (
        <div
          className="fixed inset-0 z-[80] bg-navy-900/30 backdrop-blur-sm sm:hidden"
          role="dialog"
          aria-modal="true"
          onClick={(event) => {
            if (event.target === event.currentTarget) setMobileMenuOpen(false)
          }}
        >
          <div className="h-full w-[min(82vw,320px)] border-r border-ui-border bg-surface-window px-3 py-3 shadow-cool-lg">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-mono text-[12px] font-bold text-navy-900">
                doit<span className="text-brand-600">.md</span>
              </span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex h-9 w-9 items-center justify-center rounded-md text-navy-500 hover:bg-surface-soft"
                aria-label="Fechar menu"
              >
                <CloseIcon />
              </button>
            </div>
            <nav className="space-y-1">
              {MOBILE_NAV_ITEMS.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex h-11 items-center rounded-md px-3 text-[15px] font-medium ${
                      active
                        ? 'bg-surface-selected text-brand-700'
                        : 'text-navy-700 hover:bg-surface-soft'
                    }`}
                  >
                    {item.label}
                  </Link>
                )
              })}
            </nav>
            <div className="mt-3 border-t border-ui-border-soft pt-3">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false)
                  setQuickCaptureOpen(true)
                }}
                className="flex h-11 w-full items-center rounded-md bg-brand-600 px-3 text-[15px] font-semibold text-white"
              >
                Novo item
              </button>
              <div className="mt-3">
                <SignOutButton className="w-full justify-center" />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  )
}
