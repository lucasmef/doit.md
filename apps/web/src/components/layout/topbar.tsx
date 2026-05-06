'use client'

import { useState, useRef, useEffect } from 'react'
import { useUI } from '@/store/ui'
import useSWR from 'swr'
import type { Item } from '@doit/types'
import { SignOutButton } from '@/components/auth/sign-out-button'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export function Topbar() {
  const { setQuickCaptureOpen, setSelectedItemId, calendarOpen, setCalendarOpen } = useUI()
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 300)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const { data } = useSWR<{ items: Item[] }>(
    debounced.length > 1 ? `/api/items/search?q=${encodeURIComponent(debounced)}` : null,
    fetcher
  )

  const items = data?.items || []

  return (
    <header className="h-14 border-b border-ui-border flex items-center justify-between px-4 bg-surface-window shrink-0 z-30">
      <div className="flex-1 max-w-sm relative" ref={ref}>
        <input
          type="text"
          placeholder="Buscar..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => { if (query) setOpen(true) }}
          className="w-full text-sm px-3 py-1.5 rounded-lg border border-slate-200 bg-surface-muted focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
        {open && debounced.length > 1 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <div className="p-4 text-sm text-slate-500 text-center">Nenhum item encontrado.</div>
            ) : (
              <div className="p-2 space-y-1">
                {items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setOpen(false)
                      setSelectedItemId(item.id)
                    }}
                    className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <span className="font-medium text-slate-900 block truncate">{item.title}</span>
                    {item.dueDate && <span className="text-xs text-slate-400 block mt-0.5">{item.dueDate}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setCalendarOpen(!calendarOpen)}
          className={`p-2 rounded-xl transition-colors ${
            calendarOpen ? 'bg-brand-100 text-brand-700' : 'text-slate-500 hover:bg-slate-100'
          }`}
          title="Alternar Calendário (C)"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </button>
        <button
          onClick={() => setQuickCaptureOpen(true)}
          className="text-[13px] font-medium px-4 py-1.5 rounded-xl bg-brand-600 text-white hover:bg-brand-700 transition-colors shadow-sm"
        >
          + Novo
          <span className="ml-2 text-[10px] opacity-60 hidden sm:inline">⌘K</span>
        </button>
        <SignOutButton />
      </div>
    </header>
  )
}
