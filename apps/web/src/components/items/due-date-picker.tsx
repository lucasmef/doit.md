'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

type Props = {
  value: string
  onChange: (value: string) => void
  className?: string
  compact?: boolean
}

type QuickOption = {
  label: string
  detail: string
  date: Date
  tone: string
}

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

function toDateInputValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function fromDateInputValue(value: string) {
  if (!value) return null
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function nextWeekend(date: Date) {
  const day = date.getDay()
  const daysUntilSaturday = day === 6 ? 0 : 6 - day
  return addDays(date, daysUntilSaturday)
}

function nextWeek(date: Date) {
  const day = date.getDay()
  const daysUntilMonday = day === 0 ? 1 : 8 - day
  return addDays(date, daysUntilMonday)
}

function formatDate(value: string) {
  const date = fromDateInputValue(value)
  if (!date) return 'Prazo'

  const today = toDateInputValue(new Date())
  const tomorrow = toDateInputValue(addDays(new Date(), 1))
  if (value === today) return 'Hoje'
  if (value === tomorrow) return 'Amanha'

  return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
}

function formatDetail(date: Date) {
  return date.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

function getMonthDays(monthDate: Date) {
  const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
  const start = new Date(first)
  start.setDate(first.getDate() - first.getDay())

  return Array.from({ length: 42 }, (_, index) => addDays(start, index))
}

export function DueDatePicker({ value, onChange, className = '', compact = false }: Props) {
  const [open, setOpen] = useState(false)
  const selectedDate = fromDateInputValue(value)
  const [visibleMonth, setVisibleMonth] = useState(() => selectedDate ?? new Date())
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (selectedDate) setVisibleMonth(selectedDate)
  }, [value])

  useEffect(() => {
    if (!open) return

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const today = startOfDay(new Date())
  const options = useMemo<QuickOption[]>(() => [
    { label: 'Hoje', detail: formatDetail(today), date: today, tone: 'text-green-600' },
    { label: 'Amanha', detail: formatDetail(addDays(today, 1)), date: addDays(today, 1), tone: 'text-amber-600' },
    { label: 'Fim de semana', detail: formatDetail(nextWeekend(today)), date: nextWeekend(today), tone: 'text-violet-600' },
    { label: 'Proxima semana', detail: formatDetail(nextWeek(today)), date: nextWeek(today), tone: 'text-blue-600' },
  ], [])

  const days = getMonthDays(visibleMonth)
  const selectedValue = selectedDate ? toDateInputValue(selectedDate) : ''
  const isOverdue = value && value < toDateInputValue(today)

  function selectDate(date: Date) {
    onChange(toDateInputValue(date))
    setOpen(false)
  }

  function moveMonth(delta: number) {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + delta, 1))
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`inline-flex items-center justify-between gap-2 border bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all ${
          compact
            ? 'rounded-lg border-slate-200 px-2.5 py-1.5 text-xs font-medium'
            : 'w-full rounded-[10px] border-ui-border-soft px-3 py-2 text-[14px]'
        } ${value ? (isOverdue ? 'text-red-500' : 'text-brand-700') : 'text-slate-500'}`}
      >
        <span className="inline-flex items-center gap-2 min-w-0">
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
          </svg>
          <span className="truncate">{value ? formatDate(value) : 'Prazo'}</span>
        </span>
        <svg className="h-3.5 w-3.5 shrink-0 text-slate-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div className={`absolute left-0 z-[80] mt-2 w-[320px] max-w-[calc(100vw-2rem)] rounded-xl border border-ui-border bg-white shadow-cool-md ${
          compact ? 'bottom-full mb-2 mt-0' : ''
        }`}>
          <div className="p-2">
            {options.map((option) => (
              <button
                key={option.label}
                type="button"
                onClick={() => selectDate(option.date)}
                className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-slate-50 transition-colors"
              >
                <span className="flex items-center gap-3">
                  <span className={`h-2.5 w-2.5 rounded-full bg-current ${option.tone}`} />
                  <span className="text-[14px] font-medium text-slate-800">{option.label}</span>
                </span>
                <span className="text-[12px] text-slate-400 capitalize">{option.detail}</span>
              </button>
            ))}
          </div>

          <div className="border-t border-slate-100 p-3">
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => moveMonth(-1)}
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                aria-label="Mes anterior"
              >
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.83 10l3.94 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                </svg>
              </button>
              <span className="text-[13px] font-semibold capitalize text-slate-700">
                {visibleMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </span>
              <button
                type="button"
                onClick={() => moveMonth(1)}
                className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                aria-label="Proximo mes"
              >
                <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.17 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-slate-400">
              {WEEKDAYS.map((weekday, index) => (
                <div key={`${weekday}-${index}`} className="py-1">{weekday}</div>
              ))}
            </div>

            <div className="mt-1 grid grid-cols-7 gap-1">
              {days.map((day) => {
                const dayValue = toDateInputValue(day)
                const inMonth = day.getMonth() === visibleMonth.getMonth()
                const selected = dayValue === selectedValue
                const current = sameDay(day, today)

                return (
                  <button
                    key={dayValue}
                    type="button"
                    onClick={() => selectDate(day)}
                    className={`aspect-square rounded-md text-[13px] font-medium transition-colors ${
                      selected
                        ? 'bg-brand-600 text-white'
                        : current
                        ? 'bg-green-50 text-green-700 hover:bg-green-100'
                        : inMonth
                        ? 'text-slate-700 hover:bg-slate-100'
                        : 'text-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {day.getDate()}
                  </button>
                )
              })}
            </div>
          </div>

          {value && (
            <div className="border-t border-slate-100 p-2">
              <button
                type="button"
                onClick={() => {
                  onChange('')
                  setOpen(false)
                }}
                className="w-full rounded-lg px-3 py-2 text-left text-[13px] font-medium text-red-500 hover:bg-red-50 transition-colors"
              >
                Remover prazo
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
