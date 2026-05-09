import type { BuiltInItemRecurrence, CustomItemRecurrence, ItemRecurrence } from '@doit/types'
import { addLocalDays, toLocalDateKey } from './date'

export type RecurrenceUnit = 'day' | 'week' | 'month' | 'year'
export type RecurrenceMonthMode = 'dayOfMonth' | 'weekdayOfMonth'

export type CustomRecurrenceRule = {
  interval: number
  unit: RecurrenceUnit
  weekdays?: number[]
  monthMode?: RecurrenceMonthMode
  anchorDate?: string
}

const BUILT_IN_LABELS: Record<BuiltInItemRecurrence, string> = {
  daily: 'Todos os dias',
  weekdays: 'Dias úteis',
  weekly: 'Toda semana',
  monthly: 'Todo mês',
  yearly: 'Todo ano',
}

const WEEKDAY_LABELS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado']
const SHORT_WEEKDAY_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

function dateFromKey(value: string): Date {
  return new Date(`${value}T12:00:00`)
}

function clampInterval(value: number): number {
  return Math.max(1, Math.min(999, Math.floor(value) || 1))
}

function uniqueWeekdays(values: number[] | undefined): number[] {
  return Array.from(
    new Set((values ?? []).map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)),
  ).sort((a, b) => a - b)
}

function lastDayOfMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate()
}

function addMonthsClamped(date: Date, months: number, preferredDay = date.getDate()): Date {
  const next = new Date(date)
  next.setDate(1)
  next.setMonth(next.getMonth() + months)
  next.setDate(Math.min(preferredDay, lastDayOfMonth(next.getFullYear(), next.getMonth())))
  return next
}

function addYearsClamped(date: Date, years: number, preferredDay = date.getDate()): Date {
  const next = new Date(date)
  next.setDate(1)
  next.setFullYear(next.getFullYear() + years)
  next.setDate(Math.min(preferredDay, lastDayOfMonth(next.getFullYear(), next.getMonth())))
  return next
}

function monthDiff(from: Date, to: Date): number {
  return (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth())
}

function nthWeekdayOfMonth(date: Date) {
  return Math.floor((date.getDate() - 1) / 7) + 1
}

function dateForNthWeekday(year: number, monthIndex: number, weekday: number, nth: number): Date {
  const first = new Date(year, monthIndex, 1, 12)
  const offset = (weekday - first.getDay() + 7) % 7
  const day = 1 + offset + (nth - 1) * 7
  const lastDay = lastDayOfMonth(year, monthIndex)
  if (day <= lastDay) return new Date(year, monthIndex, day, 12)
  return new Date(year, monthIndex, day - 7, 12)
}

export function createCustomRecurrence(rule: CustomRecurrenceRule): CustomItemRecurrence {
  const interval = clampInterval(rule.interval)
  const weekdays = uniqueWeekdays(rule.weekdays).join(',')
  const monthMode = rule.monthMode ?? ''
  const anchorDate = rule.anchorDate ?? ''
  return `custom:${rule.unit}:${interval}:${weekdays}:${monthMode}:${anchorDate}`
}

export function parseCustomRecurrence(recurrence: ItemRecurrence): CustomRecurrenceRule | null {
  if (!recurrence.startsWith('custom:')) return null

  const [, unit, intervalText, weekdaysText = '', monthModeText = '', anchorDate = ''] =
    recurrence.split(':')
  if (unit !== 'day' && unit !== 'week' && unit !== 'month' && unit !== 'year') return null

  const monthMode =
    monthModeText === 'weekdayOfMonth' || monthModeText === 'dayOfMonth'
      ? monthModeText
      : undefined

  return {
    unit,
    interval: clampInterval(Number(intervalText)),
    weekdays: uniqueWeekdays(weekdaysText ? weekdaysText.split(',').map(Number) : []),
    monthMode,
    anchorDate: /^\d{4}-\d{2}-\d{2}$/.test(anchorDate) ? anchorDate : undefined,
  }
}

export function formatMonthlyWeekdayOption(dateKey: string | undefined, todayKey = toLocalDateKey()) {
  const anchor = dateFromKey(dateKey || todayKey)
  const positions = ['primeiro', 'segundo', 'terceiro', 'quarto', 'quinto']
  return `mensal no ${positions[nthWeekdayOfMonth(anchor) - 1] ?? 'último'} ${
    WEEKDAY_LABELS[anchor.getDay()]
  }`
}

export function formatMonthlyDayOption(dateKey: string | undefined, todayKey = toLocalDateKey()) {
  const anchor = dateFromKey(dateKey || todayKey)
  return `mensal no dia ${String(anchor.getDate()).padStart(2, '0')}`
}

export function formatRecurrenceLabel(
  recurrence: ItemRecurrence | '',
  dateKey?: string,
  todayKey = toLocalDateKey(),
): string {
  if (!recurrence) return 'Recorrência'
  if (!recurrence.startsWith('custom:')) return BUILT_IN_LABELS[recurrence as BuiltInItemRecurrence]

  const rule = parseCustomRecurrence(recurrence)
  if (!rule) return 'Recorrência personalizada'

  const unitLabels: Record<RecurrenceUnit, [string, string]> = {
    day: ['dia', 'dias'],
    week: ['semana', 'semanas'],
    month: ['mês', 'meses'],
    year: ['ano', 'anos'],
  }
  const unitLabel = rule.interval === 1 ? unitLabels[rule.unit][0] : unitLabels[rule.unit][1]
  const prefix = `A cada ${rule.interval} ${unitLabel}`

  if (rule.unit === 'week' && rule.weekdays?.length) {
    return `${prefix} (${rule.weekdays.map((day) => SHORT_WEEKDAY_LABELS[day]).join(' ')})`
  }
  if (rule.unit === 'month' && rule.monthMode === 'weekdayOfMonth') {
    return `${prefix}, ${formatMonthlyWeekdayOption(dateKey, todayKey)}`
  }
  if (rule.unit === 'month') return `${prefix}, ${formatMonthlyDayOption(dateKey, todayKey)}`
  return prefix
}

export function nextRecurringDate(
  current: string | undefined,
  recurrence: ItemRecurrence,
  todayKey = toLocalDateKey(),
): string {
  const today = dateFromKey(todayKey)
  const anchor = dateFromKey(current || todayKey)

  if (recurrence === 'daily') {
    let next = addLocalDays(anchor, 1)
    while (next <= today) next = addLocalDays(next, 1)
    return toLocalDateKey(next)
  }
  if (recurrence === 'weekdays') {
    let next = addLocalDays(anchor < today ? today : anchor, 1)
    while (next.getDay() === 0 || next.getDay() === 6) next = addLocalDays(next, 1)
    return toLocalDateKey(next)
  }
  if (recurrence === 'weekly') {
    let next = addLocalDays(anchor, 7)
    while (next <= today) next = addLocalDays(next, 7)
    return toLocalDateKey(next)
  }
  if (recurrence === 'monthly') {
    let months = Math.max(1, monthDiff(anchor, today))
    let next = addMonthsClamped(anchor, months, anchor.getDate())
    while (next <= today) {
      months += 1
      next = addMonthsClamped(anchor, months, anchor.getDate())
    }
    return toLocalDateKey(next)
  }
  if (recurrence === 'yearly') {
    let years = Math.max(1, today.getFullYear() - anchor.getFullYear())
    let next = addYearsClamped(anchor, years, anchor.getDate())
    while (next <= today) {
      years += 1
      next = addYearsClamped(anchor, years, anchor.getDate())
    }
    return toLocalDateKey(next)
  }

  const rule = parseCustomRecurrence(recurrence)
  if (!rule) return toLocalDateKey(addLocalDays(anchor < today ? today : anchor, 1))
  const customAnchor = dateFromKey(rule.anchorDate || current || todayKey)
  const base = anchor < today ? today : anchor

  if (rule.unit === 'day') {
    let next = addLocalDays(customAnchor, rule.interval)
    while (next <= today) next = addLocalDays(next, rule.interval)
    return toLocalDateKey(next)
  }
  if (rule.unit === 'year') {
    let years = Math.max(rule.interval, today.getFullYear() - customAnchor.getFullYear())
    years = Math.ceil(years / rule.interval) * rule.interval
    let next = addYearsClamped(customAnchor, years, customAnchor.getDate())
    while (next <= today) {
      years += rule.interval
      next = addYearsClamped(customAnchor, years, customAnchor.getDate())
    }
    return toLocalDateKey(next)
  }
  if (rule.unit === 'week') {
    const weekdays = rule.weekdays?.length ? rule.weekdays : [customAnchor.getDay()]
    for (let offset = 1; offset <= rule.interval * 14 + 7; offset += 1) {
      const candidate = addLocalDays(base, offset)
      const weeks = Math.floor(
        (candidate.getTime() - customAnchor.getTime()) / (7 * 24 * 60 * 60 * 1000),
      )
      if (weeks % rule.interval === 0 && weekdays.includes(candidate.getDay())) {
        return toLocalDateKey(candidate)
      }
    }
    return toLocalDateKey(addLocalDays(base, rule.interval * 7))
  }

  if (rule.monthMode === 'weekdayOfMonth') {
    const nth = nthWeekdayOfMonth(customAnchor)
    for (let months = rule.interval; months <= rule.interval * 24; months += rule.interval) {
      const candidateMonth = addMonthsClamped(customAnchor, months, 1)
      const candidate = dateForNthWeekday(
        candidateMonth.getFullYear(),
        candidateMonth.getMonth(),
        customAnchor.getDay(),
        nth,
      )
      if (candidate > base) return toLocalDateKey(candidate)
    }
  }

  let months = Math.max(
    rule.interval,
    Math.ceil((monthDiff(customAnchor, base) + 1) / rule.interval) * rule.interval,
  )
  let next = addMonthsClamped(customAnchor, months, customAnchor.getDate())
  while (next <= base) {
    months += rule.interval
    next = addMonthsClamped(customAnchor, months, customAnchor.getDate())
  }
  return toLocalDateKey(next)
}
