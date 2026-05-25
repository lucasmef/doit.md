'use client'

import { useMemo, useState } from 'react'
import type { ItemRecurrence } from '@doit/types'
import {
  createCustomRecurrence,
  formatMonthlyDayOption,
  formatMonthlyWeekdayOption,
  formatRecurrenceLabel,
  parseCustomRecurrence,
  type RecurrenceMonthMode,
  type RecurrenceUnit,
} from '@doit/core'

const RECURRENCE_OPTIONS: Array<{ value: ItemRecurrence | ''; label: string }> = [
  { value: '', label: 'Sem recorrência' },
  { value: 'daily', label: 'Todos os dias' },
  { value: 'weekly', label: 'Toda semana' },
  { value: 'monthly', label: 'Todo mês' },
  { value: 'yearly', label: 'Todo ano' },
]

const WEEKDAY_OPTIONS = [
  { value: 0, label: 'D' },
  { value: 1, label: 'S' },
  { value: 2, label: 'T' },
  { value: 3, label: 'Q' },
  { value: 4, label: 'Q' },
  { value: 5, label: 'S' },
  { value: 6, label: 'S' },
]

const UNIT_OPTIONS: Array<{ value: RecurrenceUnit; singular: string; plural: string }> = [
  { value: 'day', singular: 'dia', plural: 'dias' },
  { value: 'week', singular: 'semana', plural: 'semanas' },
  { value: 'month', singular: 'mês', plural: 'meses' },
  { value: 'year', singular: 'ano', plural: 'anos' },
]

function IconCheck({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path d="m5 12 4 4L19 6" />
    </svg>
  )
}

function IconRepeat({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path d="m17 2 4 4-4 4" />
      <path d="M3 11V9a3 3 0 0 1 3-3h15" />
      <path d="m7 22-4-4 4-4" />
      <path d="M21 13v2a3 3 0 0 1-3 3H3" />
    </svg>
  )
}

type Props = {
  value: ItemRecurrence | ''
  dueDate?: string
  onChange: (value: ItemRecurrence | '') => void
}

export function RecurrencePopover({ value, dueDate, onChange }: Props) {
  const currentRule = value ? parseCustomRecurrence(value) : null
  const [interval, setIntervalValue] = useState(currentRule?.interval ?? 1)
  const [unit, setUnit] = useState<RecurrenceUnit>(currentRule?.unit ?? 'week')
  const [weekdays, setWeekdays] = useState<number[]>(
    currentRule?.weekdays?.length
      ? currentRule.weekdays
      : [new Date(`${dueDate || new Date().toISOString().slice(0, 10)}T12:00:00`).getDay()],
  )
  const [monthMode, setMonthMode] = useState<RecurrenceMonthMode>(
    currentRule?.monthMode ?? 'dayOfMonth',
  )

  const customValue = useMemo(
    () =>
      createCustomRecurrence({
        interval,
        unit,
        weekdays: unit === 'week' ? weekdays : [],
        monthMode: unit === 'month' ? monthMode : undefined,
        anchorDate: dueDate || new Date().toISOString().slice(0, 10),
      }),
    [dueDate, interval, monthMode, unit, weekdays],
  )

  function toggleWeekday(day: number) {
    setWeekdays((current) => {
      if (current.includes(day)) return current.filter((item) => item !== day)
      return [...current, day].sort((a, b) => a - b)
    })
  }

  function applyCustom() {
    onChange(customValue)
  }

  return (
    <div className="absolute left-0 top-9 z-10 w-72 rounded-xl border border-ui-border bg-white p-2 shadow-cool-md">
      <div className="space-y-1">
        {RECURRENCE_OPTIONS.map((option) => (
          <button
            key={option.value || 'none'}
            type="button"
            onClick={() => onChange(option.value)}
            className="flex w-full items-center gap-2 rounded-[10px] bg-surface-soft px-2 py-1.5 text-left text-[12px] text-slate-700 hover:bg-surface-selected"
          >
            <IconRepeat className="h-3.5 w-3.5 text-slate-400" />
            <span className="flex-1">{option.label}</span>
            {value === option.value && <IconCheck className="h-3.5 w-3.5 text-slate-500" />}
          </button>
        ))}
      </div>

      <div className="mt-2 border-t border-ui-border-soft pt-2">
        <div className="mb-2 px-1 text-[11px] font-semibold text-slate-400">Personalizado</div>
        <div className="flex items-center gap-2">
          <span className="text-[12px] text-slate-600">repetir a cada</span>
          <input
            type="number"
            min={1}
            max={999}
            value={interval}
            onChange={(event) => setIntervalValue(Math.max(1, Number(event.target.value) || 1))}
            className="h-8 w-14 rounded-[10px] border border-ui-border-soft bg-surface-soft px-2 text-[12px] text-slate-800 outline-none focus:ring-2 focus:ring-brand-500"
          />
          <select
            value={unit}
            onChange={(event) => setUnit(event.target.value as RecurrenceUnit)}
            className="h-8 flex-1 rounded-[10px] border border-ui-border-soft bg-surface-soft px-2 text-[12px] text-slate-800 outline-none focus:ring-2 focus:ring-brand-500"
          >
            {UNIT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {interval === 1 ? option.singular : option.plural}
              </option>
            ))}
          </select>
        </div>

        {unit === 'week' && (
          <div className="mt-2 flex gap-1">
            {WEEKDAY_OPTIONS.map((day) => (
              <button
                key={day.value}
                type="button"
                onClick={() => toggleWeekday(day.value)}
                className={`h-8 w-8 rounded-full text-[12px] font-semibold transition-colors ${
                  weekdays.includes(day.value)
                    ? 'bg-brand-600 text-white'
                    : 'bg-surface-soft text-slate-500 hover:bg-surface-selected'
                }`}
              >
                {day.label}
              </button>
            ))}
          </div>
        )}

        {unit === 'month' && (
          <div className="mt-2 space-y-1">
            {[
              { value: 'dayOfMonth' as const, label: formatMonthlyDayOption(dueDate) },
              { value: 'weekdayOfMonth' as const, label: formatMonthlyWeekdayOption(dueDate) },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setMonthMode(option.value)}
                className={`flex w-full items-center gap-2 rounded-[10px] px-2 py-1.5 text-left text-[12px] ${
                  monthMode === option.value
                    ? 'bg-surface-selected text-brand-700'
                    : 'bg-surface-soft text-slate-700 hover:bg-surface-selected'
                }`}
              >
                <span className="flex-1">{option.label}</span>
                {monthMode === option.value && <IconCheck className="h-3.5 w-3.5 text-slate-500" />}
              </button>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={applyCustom}
          disabled={unit === 'week' && weekdays.length === 0}
          className="mt-2 flex h-8 w-full items-center justify-center rounded-[10px] bg-brand-600 px-3 text-[12px] font-semibold text-white hover:bg-brand-700 disabled:opacity-40"
        >
          {formatRecurrenceLabel(customValue, dueDate)}
        </button>
      </div>
    </div>
  )
}
