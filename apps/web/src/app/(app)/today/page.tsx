'use client'

import { useMemo, useState } from 'react'
import { createItem, updateItem, useItems } from '@/hooks/use-items'
import { useCalendarEvents } from '@/hooks/use-calendar-events'
import { usePreferences } from '@/hooks/use-preferences'
import { EventSheet } from '@/components/calendar/calendar-board'
import { useToast } from '@/components/ui/toast'
import { isLooseInboxItem, sortTodayWithInboxBelow } from '@/lib/item-order'
import { useUI } from '@/store/ui'
import { CardTitle, DarkGlowCard } from '@/components/ui/bento'
import { isOverdue, isToday, toLocalDateKey } from '@doit/core'
import type { CalendarEvent, Item, ItemStatus } from '@doit/types'

type BoardColumn = {
  id: 'backlog' | 'today' | 'doing' | 'done'
  title: string
  status: ItemStatus
  items: Item[]
}

type ActivityRow = {
  id: string
  initials: string
  title: string
  verb: string
  when: string
  done?: boolean
}

function CheckIcon({ className = 'h-3 w-3' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 12 9 17 20 6" />
    </svg>
  )
}

function PlusIcon({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function PlayIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M8 5v14l11-7L8 5z" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  )
}

function FilterIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
    </svg>
  )
}

function SortIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18M6 12h12M10 18h4" />
    </svg>
  )
}

function formatShortDate(dateKey?: string) {
  if (!dateKey) return 'sem data'
  const today = toLocalDateKey()
  const tomorrowDate = new Date()
  tomorrowDate.setDate(tomorrowDate.getDate() + 1)
  const tomorrow = toLocalDateKey(tomorrowDate)
  if (dateKey === today) return 'hoje'
  if (dateKey === tomorrow) return 'amanha'
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
}

function formatTimeAgo(dateText: string) {
  const time = new Date(dateText).getTime()
  if (Number.isNaN(time)) return 'agora'
  const diff = Date.now() - time
  const minutes = Math.max(1, Math.round(diff / 60000))
  if (minutes < 60) return `${minutes} min atrás`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h atrás`
  const days = Math.round(hours / 24)
  return `${days}d atrás`
}

function localWeekDays(today: string) {
  const start = new Date(`${today}T12:00:00`)
  return Array.from({ length: 4 }, (_, index) => {
    const d = new Date(start)
    d.setDate(start.getDate() + index)
    return {
      key: toLocalDateKey(d),
      day: d.getDate(),
      label: d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
      month: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
      isToday: index === 0,
    }
  })
}

function statusTone(status: ItemStatus, overdue: boolean) {
  if (status === 'done') return 'text-teal-700'
  if (overdue) return 'text-red-600'
  if (status === 'doing') return 'text-violet-600'
  if (status === 'waiting') return 'text-amber-600'
  return 'text-navy-500'
}

function itemProgress(item: Item, today: string) {
  if (item.status === 'done') return 100
  if (item.status === 'doing') return 68
  if (item.dueDate === today || item.scheduledDate === today) return 42
  if (item.dueDate && item.dueDate < today) return 24
  return item.priority ? Math.max(18, 62 - item.priority * 10) : 26
}

function primaryTag(item: Item) {
  return item.tags[0] ?? (item.complexity === 'note' ? 'nota' : 'item')
}

function mobileAccent(item: Item, today: string) {
  if (item.status === 'done') return 'bg-slate-300'
  if (item.status === 'doing') return 'bg-[#7B5BFF]'
  if (item.dueDate && item.dueDate < today) return 'bg-[#F04438]'
  return 'bg-[#2F6BFF]'
}

function mobileTagTone(index: number) {
  return [
    'bg-[#2F6BFF]/10 text-[#2F6BFF]',
    'bg-[#28C7B7]/15 text-[#0f8d80]',
    'bg-[#7B5BFF]/12 text-[#7B5BFF]',
    'bg-[#F04438]/10 text-[#b3271d]',
  ][index % 4]
}

function MobileSectionHeader({
  title,
  count,
  tone,
}: {
  title: string
  count: number
  tone: 'violet' | 'blue' | 'teal'
}) {
  const dot =
    tone === 'violet'
      ? 'bg-[#7B5BFF] shadow-[0_0_6px_#7B5BFF]'
      : tone === 'blue'
      ? 'bg-[#2F6BFF] shadow-[0_0_6px_#2F6BFF]'
      : 'bg-[#28C7B7]'
  return (
    <div className="flex items-center gap-2 px-1 pb-0.5 pt-1 font-mono text-[10px] font-bold uppercase tracking-[0.04em] text-navy-500">
      <span className={`h-[7px] w-[7px] rounded-full ${dot}`} />
      <span>{title}</span>
      <span className="ml-auto">{count}</span>
    </div>
  )
}

function MobileTaskCard({
  item,
  today,
  onOpen,
  onMove,
}: {
  item: Item
  today: string
  onOpen: (id: string) => void
  onMove: (item: Item, status: ItemStatus) => void
}) {
  const done = item.status === 'done'
  const overdue = Boolean(item.dueDate && item.dueDate < today && item.status !== 'done')
  const progress = itemProgress(item, today)
  const tags = item.tags.length ? item.tags.slice(0, 2) : [primaryTag(item)]
  return (
    <div className="relative flex flex-col gap-2 overflow-hidden rounded-2xl border border-white/70 bg-white/85 px-3.5 py-3 shadow-[0_1px_0_rgba(255,255,255,.7)_inset,0_-1px_0_rgba(15,35,66,.04)_inset,0_14px_32px_-14px_rgba(15,35,66,.18),0_3px_10px_rgba(15,35,66,.06)] backdrop-blur-xl">
      <span className={`absolute bottom-3 left-0 top-3 w-[3px] rounded-r ${mobileAccent(item, today)}`} />
      <div className="flex items-start gap-2.5">
        <button
          type="button"
          onClick={() => onMove(item, done ? 'todo' : 'done')}
          className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md border-[1.5px] transition-colors ${done ? 'border-[#28C7B7] bg-[#28C7B7] text-white' : 'border-[#B6C2D2] bg-white text-white hover:border-[#28C7B7] hover:bg-[#28C7B7]'}`}
          aria-label={done ? `Reabrir ${item.title}` : `Concluir ${item.title}`}
        >
          {done ? <CheckIcon className="h-3 w-3" /> : null}
        </button>
        <button
          type="button"
          onClick={() => onOpen(item.id)}
          className={`min-w-0 flex-1 text-left text-[14px] font-semibold leading-snug ${done ? 'text-navy-500 line-through' : 'text-navy-900'}`}
        >
          {item.title}
          {item.localPath ? (
            <span className="mt-1 inline-flex max-w-full items-center gap-1 truncate rounded bg-[#2F6BFF]/[0.08] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[#2F6BFF]">
              M {item.localPath.split(/[\\/]/).pop()}
            </span>
          ) : null}
        </button>
      </div>
      {item.status === 'doing' ? (
        <div className="h-1 overflow-hidden rounded-full bg-navy-900/[0.06]">
          <div className="h-full rounded-full bg-[linear-gradient(90deg,#2F6BFF,#28C7B7)]" style={{ width: `${progress}%` }} />
        </div>
      ) : null}
      <div className="flex min-w-0 items-center gap-1.5">
        {tags.map((tag, index) => (
          <span key={`${item.id}-${tag}`} className={`truncate rounded px-1.5 py-0.5 font-mono text-[10px] ${mobileTagTone(index)}`}>
            #{tag}
          </span>
        ))}
        <span className={`ml-auto shrink-0 font-mono text-[10px] ${overdue ? 'font-bold text-[#F04438]' : item.dueDate === today ? 'font-bold text-[#b56b00]' : 'text-navy-500'}`}>
          {overdue ? 'overdue' : formatShortDate(item.dueDate ?? item.scheduledDate)}
        </span>
      </div>
    </div>
  )
}

function TaskCard({
  item,
  today,
  targetStatus,
  onOpen,
  onMove,
}: {
  item: Item
  today: string
  targetStatus: ItemStatus
  onOpen: (id: string) => void
  onMove: (item: Item, status: ItemStatus) => void
}) {
  const done = item.status === 'done'
  const overdue = Boolean(item.dueDate && item.dueDate < today && item.status !== 'done')
  const progress = itemProgress(item, today)
  return (
    <div className={`flex flex-col gap-2 rounded-xl border border-navy-900/[0.04] bg-white px-3 py-2.5 shadow-[0_1px_2px_rgba(15,35,66,.04),0_6px_14px_-8px_rgba(15,35,66,.12)] ${done ? 'opacity-80' : ''}`}>
      <div className="flex items-start gap-2">
        <button
          type="button"
          onClick={() => onMove(item, done ? 'todo' : 'done')}
          className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-[5px] border text-white transition-colors ${done ? 'border-teal-500 bg-teal-500' : 'border-navy-200 bg-white hover:border-teal-500 hover:bg-teal-500'}`}
          aria-label={done ? `Reabrir ${item.title}` : `Concluir ${item.title}`}
        >
          {done ? <CheckIcon className="h-2.5 w-2.5" /> : null}
        </button>
        <button type="button" onClick={() => onOpen(item.id)} className={`min-w-0 flex-1 text-left text-[13px] font-semibold leading-snug ${done ? 'text-navy-500 line-through' : 'text-navy-900'}`}>
          {item.title}
        </button>
      </div>
      <div className="flex min-w-0 items-center gap-1.5">
        <span className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ${item.tags.length ? 'bg-brand-50 text-brand-700' : 'bg-teal-50 text-teal-700'}`}>
          #{primaryTag(item)}
        </span>
        {item.localPath ? (
          <span className="min-w-0 truncate rounded bg-brand-50 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-brand-700">
            M {item.localPath.split(/[\\/]/).pop()}
          </span>
        ) : null}
        <span className={`ml-auto shrink-0 font-mono text-[10px] font-semibold ${statusTone(item.status, overdue)}`}>
          {overdue ? 'atrasado' : formatShortDate(item.dueDate ?? item.scheduledDate)}
        </span>
      </div>
      {targetStatus === 'doing' || item.status === 'doing' ? (
        <div className="h-[3px] overflow-hidden rounded-full bg-navy-900/[0.06]">
          <div className="h-full rounded-full bg-[linear-gradient(90deg,#2F6BFF,#28C7B7)]" style={{ width: `${progress}%` }} />
        </div>
      ) : null}
    </div>
  )
}

function StatRing({ percent }: { percent: number }) {
  const safe = Math.max(0, Math.min(100, percent))
  const offset = 213.6 - (safe / 100) * 213.6
  return (
    <div className="relative h-20 w-20 shrink-0">
      <svg width="80" height="80" viewBox="0 0 80 80" className="-rotate-90">
        <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,.22)" strokeWidth="7" />
        <circle cx="40" cy="40" r="34" fill="none" stroke="white" strokeWidth="7" strokeLinecap="round" strokeDasharray="213.6" strokeDashoffset={offset} />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-[22px] font-black leading-none text-white drop-shadow">
        {safe}%
      </div>
    </div>
  )
}

export default function TodayPage() {
  const { items, isLoading } = useItems()
  const { prefs } = usePreferences()
  const { toast } = useToast()
  const { setSingleSelection, openCapture } = useUI()
  const [openEvent, setOpenEvent] = useState<CalendarEvent | null>(null)
  const [quickTitle, setQuickTitle] = useState('')
  const [quickSaving, setQuickSaving] = useState(false)
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [mobileTab, setMobileTab] = useState<'today' | 'upcoming' | 'done'>('today')
  const today = toLocalDateKey()
  const now = new Date()
  const tomorrowDate = new Date(now)
  tomorrowDate.setDate(now.getDate() + 1)
  const tomorrow = toLocalDateKey(tomorrowDate)
  const { events } = useCalendarEvents(today + 'T00:00:00Z', `${tomorrow}T23:59:59Z`)

  const activeItems = items.filter((item) => item.status !== 'archived')
  const openItems = activeItems.filter((item) => item.status !== 'done')
  const datedTodayItems = activeItems.filter((item) => isToday(item) || isOverdue(item))
  const hiddenInboxItems = prefs.showInbox
    ? []
    : activeItems.filter((item) => item.status !== 'done' && isLooseInboxItem(item))
  const todayItems = sortTodayWithInboxBelow(datedTodayItems, hiddenInboxItems)
  const overdueItems = datedTodayItems.filter((item) => item.dueDate && item.dueDate < today && item.status !== 'done')
  const doingItems = activeItems.filter((item) => item.status === 'doing' && item.complexity !== 'note')
  const upcomingItems = activeItems
    .filter((item) => item.status !== 'done' && item.complexity !== 'note' && !isToday(item) && !isOverdue(item))
    .sort((a, b) => (a.dueDate ?? a.scheduledDate ?? '9999').localeCompare(b.dueDate ?? b.scheduledDate ?? '9999'))
  const doneItems = activeItems
    .filter((item) => item.status === 'done' && item.complexity !== 'note')
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  const filteredItems = selectedTag ? activeItems.filter((item) => item.tags.includes(selectedTag)) : activeItems
  const completedThisWeek = activeItems.filter((item) => item.status === 'done').length
  const totalWorkItems = Math.max(1, activeItems.length)
  const completion = Math.round((completedThisWeek / totalWorkItems) * 100)
  const focusItem =
    openItems.find((item) => item.status === 'doing') ??
    todayItems.find((item) => item.status !== 'done') ??
    openItems[0]

  function currentTimeIsAfter(time: string) {
    const [hourText, minuteText] = time.split(':')
    const hour = Number(hourText)
    const minute = Number(minuteText)
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return false
    return now.getHours() * 60 + now.getMinutes() >= hour * 60 + minute
  }

  function shouldHidePastEvent(end: string, allDay: boolean) {
    if (allDay) return false
    const endTime = new Date(end).getTime()
    if (Number.isNaN(endTime)) return false
    const graceMs = prefs.todayCalendarHidePastAfterHours * 60 * 60 * 1000
    return now.getTime() - endTime >= graceMs
  }

  const showTomorrowEvents = currentTimeIsAfter(prefs.todayCalendarShowTomorrowAfterTime)
  const visibleEvents = events
    .filter((event) => {
      const day = event.start.slice(0, 10)
      if (day !== today && !(showTomorrowEvents && day === tomorrow)) return false
      return !shouldHidePastEvent(event.end, event.allDay)
    })
    .sort((a, b) => a.start.localeCompare(b.start))

  const columns: BoardColumn[] = useMemo(() => {
    const source = filteredItems.filter((item) => item.complexity !== 'note')
    const backlog = source.filter((item) => !['doing', 'done'].includes(item.status) && !isToday(item) && !isOverdue(item)).slice(0, 5)
    const due = source
      .filter((item) => item.status !== 'done' && item.status !== 'doing' && (isToday(item) || isOverdue(item)))
      .slice(0, 5)
    const doing = source.filter((item) => item.status === 'doing').slice(0, 5)
    const done = source.filter((item) => item.status === 'done').slice(0, 5)
    return [
      { id: 'backlog', title: 'backlog', status: 'todo', items: backlog },
      { id: 'today', title: 'today', status: 'todo', items: due },
      { id: 'doing', title: 'in progress', status: 'doing', items: doing },
      { id: 'done', title: 'feito', status: 'done', items: done },
    ]
  }, [filteredItems])

  const tagStats = useMemo(() => {
    const counts = new Map<string, number>()
    for (const item of activeItems) {
      for (const tag of item.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'pt-BR'))
      .slice(0, 10)
  }, [activeItems])

  const activityRows: ActivityRow[] = activeItems
    .slice()
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 4)
    .map((item, index) => ({
      id: item.id,
      initials: index === 0 ? 'LF' : item.status === 'done' ? 'OK' : item.status === 'doing' ? 'IP' : 'MD',
      title: item.title,
      verb: item.status === 'done' ? 'completed' : item.status === 'doing' ? 'moved to in progress' : 'updated',
      when: formatTimeAgo(item.updatedAt),
      done: item.status === 'done',
    }))

  const weekDays = localWeekDays(today)
  const mobileDateLabel = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).toLowerCase()
  const mobileMainItems =
    mobileTab === 'upcoming'
      ? upcomingItems.slice(0, 8)
      : mobileTab === 'done'
      ? doneItems.slice(0, 8)
      : todayItems.filter((item) => item.status !== 'doing' && item.status !== 'done' && item.complexity !== 'note').slice(0, 8)

  async function moveItem(item: Item, status: ItemStatus) {
    try {
      await updateItem(item.id, { status })
      toast(status === 'done' ? 'Item concluido.' : 'Item atualizado.', 'success')
    } catch {
      toast('Erro ao atualizar item.', 'error')
    }
  }

  async function saveQuickCapture() {
    const title = quickTitle.trim()
    if (!title) {
      openCapture('task')
      return
    }
    setQuickSaving(true)
    try {
      const created = await createItem({
        title,
        complexity: 'task',
        status: 'todo',
        dueDate: today,
        tags: selectedTag ? [selectedTag] : [],
      })
      setQuickTitle('')
      toast('Item criado para hoje.', 'success')
      setSingleSelection(created.id)
    } catch {
      toast('Erro ao criar item.', 'error')
    } finally {
      setQuickSaving(false)
    }
  }

  function eventTime(event: CalendarEvent) {
    if (event.allDay) return 'dia todo'
    return new Date(event.start).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <>
      <div className="mx-auto w-full max-w-[430px] px-3 pb-28 pt-3 lg:hidden">
        <header className="mb-3 flex items-center gap-3 px-1">
          <div className="min-w-0 flex-1">
            <div className="font-mono text-[11px] text-navy-500">{mobileDateLabel}</div>
            <h1 className="bg-[linear-gradient(120deg,#2F6BFF,#7B5BFF_60%,#28C7B7)] bg-clip-text text-[28px] font-black leading-none tracking-normal text-transparent">
              tasks
            </h1>
          </div>
          <button
            type="button"
            onClick={() => setSelectedTag(null)}
            className="grid h-10 w-10 place-items-center rounded-xl border border-white/70 bg-white/70 text-navy-800 shadow-cool-sm backdrop-blur-xl"
            aria-label="Limpar filtro"
            title="Limpar filtro"
          >
            <FilterIcon />
          </button>
          <button
            type="button"
            onClick={() => setMobileTab((current) => (current === 'today' ? 'upcoming' : current === 'upcoming' ? 'done' : 'today'))}
            className="grid h-10 w-10 place-items-center rounded-xl border border-white/70 bg-white/70 text-navy-800 shadow-cool-sm backdrop-blur-xl"
            aria-label="Alternar lista"
            title="Alternar lista"
          >
            <SortIcon />
          </button>
        </header>

        <div className="flex flex-col gap-3">
          <article className="overflow-hidden rounded-[22px] border border-white/40 bg-[linear-gradient(160deg,#2F6BFF_0%,#4F4BE9_50%,#28C7B7_100%)] px-4 py-3.5 text-white shadow-[0_1px_0_rgba(255,255,255,.7)_inset,0_14px_32px_-14px_rgba(15,35,66,.18),0_3px_10px_rgba(15,35,66,.06)]">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-xs font-bold lowercase">progress</h2>
              <span className="rounded-full bg-white/18 px-2 py-0.5 font-mono text-[10px]">this week</span>
            </div>
            <div className="flex items-center gap-3.5">
              <div className="relative h-[76px] w-[76px] shrink-0">
                <svg width="76" height="76" viewBox="0 0 76 76" className="-rotate-90">
                  <circle cx="38" cy="38" r="32" fill="none" stroke="rgba(255,255,255,.22)" strokeWidth="6" />
                  <circle
                    cx="38"
                    cy="38"
                    r="32"
                    fill="none"
                    stroke="white"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray="201"
                    strokeDashoffset={201 - (Math.max(0, Math.min(100, completion)) / 100) * 201}
                  />
                </svg>
                <div className="absolute inset-0 grid place-items-center text-[20px] font-black leading-none text-white drop-shadow">
                  {completion}%
                </div>
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[26px] font-black leading-none tracking-normal">{completedThisWeek} / {activeItems.length}</div>
                <div className="mt-1 font-mono text-[11px] text-white/85">tasks completed</div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/18 pt-3 font-mono text-[10px] text-white/90">
              <div><b className="mb-0.5 block font-sans text-base">{todayItems.length}</b>today</div>
              <div><b className="mb-0.5 block font-sans text-base text-[#FFD59E]">{overdueItems.length}</b>overdue</div>
            </div>
          </article>

          <div className="flex gap-1.5 rounded-full border border-white/60 bg-white/55 p-1 backdrop-blur-xl">
            {[
              ['today', todayItems.length],
              ['upcoming', upcomingItems.length],
              ['done', doneItems.length],
            ].map(([id, count]) => (
              <button
                key={id}
                type="button"
                onClick={() => setMobileTab(id as 'today' | 'upcoming' | 'done')}
                className={`inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-full text-[12px] font-semibold ${mobileTab === id ? 'bg-white text-navy-900 shadow-cool-sm' : 'text-navy-500'}`}
              >
                {id}
                <span className={`rounded-full px-1.5 py-px font-mono text-[10px] ${mobileTab === id ? 'bg-brand-500/10 text-brand-600' : 'bg-navy-900/[0.06] text-navy-500'}`}>
                  {count}
                </span>
              </button>
            ))}
          </div>

          {mobileTab === 'today' && doingItems.length > 0 ? (
            <>
              <MobileSectionHeader title="in progress" count={doingItems.length} tone="violet" />
              {doingItems.slice(0, 3).map((item) => (
                <MobileTaskCard key={item.id} item={item} today={today} onOpen={setSingleSelection} onMove={moveItem} />
              ))}
            </>
          ) : null}

          <MobileSectionHeader
            title={mobileTab === 'today' ? 'today' : mobileTab === 'upcoming' ? 'upcoming' : 'done / today'}
            count={mobileMainItems.length}
            tone={mobileTab === 'done' ? 'teal' : 'blue'}
          />
          {isLoading ? (
            <div className="rounded-2xl border border-white/70 bg-white/70 px-4 py-8 text-center text-sm text-navy-500 shadow-cool-sm">
              Carregando...
            </div>
          ) : mobileMainItems.length === 0 ? (
            <button
              type="button"
              onClick={() => openCapture('task')}
              className="rounded-2xl border border-dashed border-white/70 bg-white/45 px-4 py-8 text-center font-mono text-[12px] text-navy-500 shadow-cool-sm backdrop-blur-xl"
            >
              add task
            </button>
          ) : (
            mobileMainItems.map((item) => (
              <MobileTaskCard key={item.id} item={item} today={today} onOpen={setSingleSelection} onMove={moveItem} />
            ))
          )}

          <article className="relative overflow-hidden rounded-[22px] border border-transparent bg-[linear-gradient(180deg,#0B1733_0%,#0F2342_60%,#122A55_100%)] px-4 py-3.5 text-white shadow-[0_0_40px_2px_rgba(40,199,183,.20),0_0_40px_2px_rgba(47,107,255,.18)]">
            <div className="mb-2.5 flex items-center justify-between">
              <CardTitle className="text-white/85">captura rapida</CardTitle>
              <span className="rounded-full border border-white/14 bg-white/[0.08] px-2 py-0.5 font-mono text-[10px] text-white/85">swipe up</span>
            </div>
            <textarea
              value={quickTitle}
              onChange={(event) => setQuickTitle(event.target.value)}
              placeholder="- [ ] Review PR #review&#10;due tomorrow 3pm"
              className="min-h-[76px] w-full resize-none rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2.5 font-mono text-[12px] leading-5 text-white outline-none placeholder:text-white/42"
            />
            <div className="mt-2.5 flex items-center gap-1.5">
              <span className="rounded-full border border-white/14 bg-white/[0.08] px-2.5 py-1 font-mono text-[10px] text-white/85">today</span>
              <span className="rounded-full border border-white/14 bg-white/[0.08] px-2.5 py-1 font-mono text-[10px] text-white/85">#{selectedTag ?? 'review'}</span>
              <button
                type="button"
                onClick={() => void saveQuickCapture()}
                disabled={quickSaving}
                className="ml-auto grid h-8 w-8 place-items-center rounded-full bg-white text-navy-900 shadow-[0_4px_12px_rgba(255,255,255,.35)] disabled:opacity-60"
                aria-label="Criar item"
              >
                <PlusIcon />
              </button>
            </div>
          </article>
        </div>
      </div>

      <div className="mx-auto hidden w-full max-w-[1368px] px-4 pb-28 pt-4 sm:px-6 lg:block lg:pb-8 lg:pt-0">
      <section className="grid auto-rows-[230px] grid-cols-1 gap-4 md:grid-cols-6 lg:grid-cols-12 lg:gap-[18px]">
        <article className="flex flex-col overflow-hidden rounded-[28px] border border-white/45 bg-[linear-gradient(160deg,#2F6BFF_0%,#4F4BE9_50%,#28C7B7_100%)] p-5 text-white shadow-[0_18px_40px_-16px_rgba(15,35,66,.18),0_4px_12px_rgba(15,35,66,.06)] md:col-span-3 lg:col-span-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold lowercase">progresso</h2>
            <span className="rounded-full bg-white/18 px-2.5 py-1 font-mono text-[11px]">esta semana</span>
          </div>
          <div className="mt-auto flex items-center gap-3">
            <StatRing percent={completion} />
            <div>
              <div className="text-[28px] font-black leading-none">{completedThisWeek} / {activeItems.length}</div>
              <div className="mt-1 font-mono text-[11px] lowercase text-white/85">items completed</div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-white/18 pt-3 font-mono text-[11px] text-white/90">
            <div><b className="block font-sans text-[15px]">{todayItems.length}</b>today</div>
            <div><b className="block font-sans text-[15px]">{overdueItems.length}</b>overdue</div>
          </div>
        </article>

        <article className="relative flex flex-col overflow-hidden rounded-[28px] border border-white/70 bg-white/78 p-6 shadow-[0_18px_40px_-16px_rgba(15,35,66,.18),0_4px_12px_rgba(15,35,66,.06)] backdrop-blur-2xl md:col-span-6 lg:col-span-6">
          <div className="pointer-events-none absolute -right-28 -top-16 h-96 w-96 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(123,91,255,.40),transparent_60%),radial-gradient(circle_at_70%_70%,rgba(40,199,183,.30),transparent_60%)] blur-xl" />
          <div className="relative z-10 flex items-center justify-between">
            <h2 className="text-sm font-bold lowercase text-navy-900">destaque</h2>
            <button type="button" onClick={() => focusItem && setSingleSelection(focusItem.id)} className="grid h-7 w-7 place-items-center rounded-full bg-navy-900/[0.04] text-sm font-black text-navy-500" aria-label="Abrir destaque">...</button>
          </div>
          <div className="relative z-10 mt-3 flex flex-wrap items-center gap-2 font-mono text-[11px] text-navy-500">
            <span className="inline-flex items-center gap-1 font-semibold text-brand-600 before:h-1.5 before:w-1.5 before:rounded-full before:bg-teal-500 before:shadow-[0_0_8px_#28C7B7]">live / in progress</span>
            <span className="rounded bg-brand-500/10 px-2 py-0.5 text-brand-700">#{focusItem ? primaryTag(focusItem) : 'baixo-risco'}</span>
            <span className="rounded bg-teal-500/15 px-2 py-0.5 text-teal-700">{focusItem?.localPath ? focusItem.localPath.split(/[\\/]/).pop() : 'hoje.md'}</span>
          </div>
          <h1 className="relative z-10 mt-2 text-[34px] font-black leading-[1.02] tracking-normal text-navy-950 sm:text-[38px]">
            {focusItem ? focusItem.title : 'ship '}
            {!focusItem ? <span className="bg-[linear-gradient(120deg,#2F6BFF,#7B5BFF_45%,#28C7B7)] bg-clip-text text-transparent">v0.4 release</span> : null}
          </h1>
          <p className="relative z-10 mt-2 max-w-[56ch] text-[13px] leading-5 text-navy-500">
            {focusItem?.contentMd?.trim() || 'Final QA pass, changelog draft e screenshots. Use foco para abrir o item e continuar a execucao.'}
          </p>
          <div className="relative z-10 mt-auto flex flex-wrap items-center gap-3">
            <div className="h-2 min-w-36 flex-1 overflow-hidden rounded-full bg-navy-900/[0.08]">
              <div className="h-full rounded-full bg-[linear-gradient(90deg,#2F6BFF,#7B5BFF,#28C7B7)] shadow-[0_0_10px_rgba(123,91,255,.4)]" style={{ width: `${focusItem ? itemProgress(focusItem, today) : 62}%` }} />
            </div>
            <span className="font-mono text-xs text-navy-500">{focusItem ? formatShortDate(focusItem.dueDate ?? focusItem.scheduledDate) : '2d left'}</span>
            <button type="button" onClick={() => focusItem ? setSingleSelection(focusItem.id) : openCapture('task')} className="inline-flex h-9 items-center gap-2 rounded-full bg-navy-900 px-4 text-[13px] font-bold text-white shadow-[0_6px_14px_rgba(15,35,66,.22)]">
              <PlayIcon /> focus
            </button>
          </div>
        </article>

        <DarkGlowCard className="p-5 md:col-span-3 lg:col-span-3">
          <div className="mb-2.5 flex items-center justify-between">
            <CardTitle className="text-white/85">captura rapida</CardTitle>
            <span className="rounded-full border border-white/14 bg-white/[0.08] px-2.5 py-1 font-mono text-[11px] text-white/75">Ctrl N</span>
          </div>
          <textarea
            value={quickTitle}
            onChange={(event) => setQuickTitle(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                event.preventDefault()
                void saveQuickCapture()
              }
            }}
            placeholder="- [ ] Review PR #review&#10;due tomorrow 3pm / 30min"
            className="mt-4 min-h-20 flex-1 resize-none rounded-[14px] border border-white/10 bg-white/[0.06] px-3 py-3 font-mono text-xs leading-5 text-white outline-none placeholder:text-white/42"
          />
          <div className="mt-3 flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full border border-white/14 bg-white/[0.08] px-2.5 py-1 font-mono text-[11px] text-white/85"><CalendarIcon /> hoje</span>
            <span className="rounded-full border border-white/14 bg-white/[0.08] px-2.5 py-1 font-mono text-[11px] text-white/85">#{selectedTag ?? 'review'}</span>
            <button type="button" onClick={() => void saveQuickCapture()} disabled={quickSaving} className="ml-auto grid h-9 w-9 place-items-center rounded-full bg-white text-navy-900 shadow-[0_4px_12px_rgba(255,255,255,.35)] disabled:opacity-60" aria-label="Criar item">
              <PlusIcon />
            </button>
          </div>
        </DarkGlowCard>

        <article className="flex flex-col overflow-hidden rounded-[28px] border border-white/70 bg-white/78 p-5 shadow-[0_18px_40px_-16px_rgba(15,35,66,.18),0_4px_12px_rgba(15,35,66,.06)] backdrop-blur-2xl md:col-span-6 md:row-span-2 lg:col-span-9">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold lowercase text-navy-900">board / hoje.md</h2>
            <span className="rounded-full bg-navy-900/[0.05] px-2.5 py-1 font-mono text-[11px] text-navy-500">{columns.length} columns / {filteredItems.length} items</span>
          </div>
          <div className="grid min-h-0 flex-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {columns.map((column) => (
              <div key={column.id} className="flex min-h-0 flex-col rounded-[18px] border border-navy-900/[0.06] bg-white/55 px-3 py-3">
                <div className="mb-2 flex items-center gap-2 px-1">
                  <span className={`h-2 w-2 rounded-full ${column.id === 'backlog' ? 'bg-navy-200' : column.id === 'today' ? 'bg-brand-500 shadow-[0_0_6px_#2F6BFF]' : column.id === 'doing' ? 'bg-violet-500 shadow-[0_0_6px_#7B5BFF]' : 'bg-teal-500 shadow-[0_0_6px_#28C7B7]'}`} />
                  <span className="text-[13px] font-bold lowercase text-navy-900">{column.title}</span>
                  <span className="ml-auto rounded-full bg-navy-900/[0.06] px-2 py-0.5 font-mono text-[11px] text-navy-500">{column.items.length}</span>
                </div>
                <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
                  {isLoading ? (
                    <div className="rounded-xl bg-white/60 px-3 py-8 text-center text-sm text-navy-400">Carregando...</div>
                  ) : column.items.length === 0 ? (
                    <button type="button" onClick={() => openCapture('task')} className="rounded-xl border border-dashed border-navy-900/12 bg-white/35 px-3 py-8 text-center font-mono text-[11px] text-navy-400">
                      add task
                    </button>
                  ) : (
                    column.items.map((item) => (
                      <TaskCard key={item.id} item={item} today={today} targetStatus={column.status} onOpen={setSingleSelection} onMove={moveItem} />
                    ))
                  )}
                </div>
                <button type="button" onClick={() => openCapture('task')} className="mt-3 inline-flex items-center gap-1.5 rounded-[10px] border border-dashed border-navy-900/14 px-3 py-2 font-mono text-[11px] text-navy-500 hover:border-brand-500 hover:text-brand-600">
                  <PlusIcon className="h-3 w-3" /> add task
                </button>
              </div>
            ))}
          </div>
        </article>

        <article className="flex flex-col overflow-hidden rounded-[28px] border border-white/70 bg-white/78 p-5 shadow-[0_18px_40px_-16px_rgba(15,35,66,.18),0_4px_12px_rgba(15,35,66,.06)] backdrop-blur-2xl md:col-span-6 md:row-span-2 lg:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold lowercase text-navy-900">esta semana</h2>
            <span className="rounded-full bg-navy-900/[0.05] px-2.5 py-1 font-mono text-[11px] text-navy-500">{weekDays[0]?.month} / {weekDays.at(-1)?.month}</span>
          </div>
          <div className="flex flex-col gap-3 overflow-hidden">
            {weekDays.map((day) => {
              const dayItems = activeItems.filter((item) => item.dueDate === day.key || item.scheduledDate === day.key).slice(0, 2)
              const dayEvents = visibleEvents.filter((event) => event.start.slice(0, 10) === day.key).slice(0, 2)
              return (
                <div key={day.key} className="space-y-1.5">
                  <div className="flex items-baseline gap-2">
                    <span className={`text-[22px] font-black leading-none ${day.isToday ? 'text-brand-600' : 'text-navy-900'}`}>{day.day}</span>
                    <span className="font-mono text-[11px] font-semibold uppercase tracking-wide text-navy-500">{day.label}{day.isToday ? ' / today' : ''}</span>
                  </div>
                  {[...dayEvents.map((event) => ({ id: event.id, label: event.title, time: eventTime(event), event })), ...dayItems.map((item) => ({ id: item.id, label: item.title, time: formatShortDate(item.dueDate), item }))].slice(0, 2).map((entry) => (
                    <button key={entry.id} type="button" onClick={() => 'event' in entry ? setOpenEvent(entry.event) : setSingleSelection(entry.item.id)} className="flex w-full items-center gap-2 px-1 text-left text-xs leading-5 text-navy-900 before:h-1 before:w-1 before:shrink-0 before:rounded-full before:bg-teal-500">
                      <span className="min-w-0 flex-1 truncate">{entry.label}</span>
                      <span className="font-mono text-[10px] text-navy-500">{entry.time}</span>
                    </button>
                  ))}
                  {dayItems.length === 0 && dayEvents.length === 0 ? <div className="px-1 text-xs text-navy-400">sem agenda</div> : null}
                </div>
              )
            })}
          </div>
        </article>

        <article className="flex flex-col overflow-hidden rounded-[28px] border border-white/70 bg-white/78 p-5 shadow-[0_18px_40px_-16px_rgba(15,35,66,.18),0_4px_12px_rgba(15,35,66,.06)] backdrop-blur-2xl md:col-span-3 lg:col-span-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold lowercase text-navy-900">filtrar por tag</h2>
            <span className="rounded-full bg-navy-900/[0.05] px-2.5 py-1 font-mono text-[11px] text-navy-500">{tagStats.length} tags</span>
          </div>
          <div className="flex flex-wrap gap-2 overflow-hidden">
            <button type="button" onClick={() => setSelectedTag(null)} className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 font-mono text-xs ${selectedTag === null ? 'border-brand-500/20 bg-brand-500/10 text-brand-700' : 'border-navy-900/[0.06] bg-white text-navy-500'}`}>
              <span className="font-bold text-navy-900">{activeItems.length}</span> todos
            </button>
            {tagStats.map(([tag, count], index) => (
              <button key={tag} type="button" onClick={() => setSelectedTag((current) => current === tag ? null : tag)} className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 font-mono text-xs transition-transform hover:-translate-y-0.5 ${selectedTag === tag ? 'border-brand-500/20 bg-brand-500/10 text-brand-700' : 'border-navy-900/[0.06] bg-white text-navy-500'}`}>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: ['#28C7B7', '#F04438', '#7B5BFF', '#2F6BFF', '#F5A524', '#1AAED7'][index % 6] }} />
                <span className="font-bold text-navy-900">{count}</span>
                #{tag}
              </button>
            ))}
            {tagStats.length === 0 ? <span className="text-sm text-navy-500">Adicione tags nos itens para filtrar o board.</span> : null}
          </div>
        </article>

        <article className="flex flex-col overflow-hidden rounded-[28px] border border-white/70 bg-white/78 p-5 shadow-[0_18px_40px_-16px_rgba(15,35,66,.18),0_4px_12px_rgba(15,35,66,.06)] backdrop-blur-2xl md:col-span-3 lg:col-span-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold lowercase text-navy-900">atividade</h2>
            <span className="rounded-full bg-navy-900/[0.05] px-2.5 py-1 font-mono text-[11px] text-navy-500">last 24h</span>
          </div>
          <div className="flex flex-col gap-3 overflow-hidden">
            {activityRows.length === 0 ? (
              <div className="rounded-2xl bg-white/45 px-4 py-8 text-center text-sm text-navy-500">Sem atividade recente.</div>
            ) : activityRows.map((row, index) => (
              <button key={row.id} type="button" onClick={() => setSingleSelection(row.id)} className="flex items-start gap-3 text-left">
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 border-white/80 text-[10px] font-bold text-white ${index === 0 ? 'bg-[linear-gradient(135deg,#2F6BFF,#28C7B7)]' : index === 1 ? 'bg-[linear-gradient(135deg,#FFB1D5,#B59BFF)]' : 'bg-[linear-gradient(135deg,#B59BFF,#7B5BFF)]'}`}>{row.initials}</span>
                <span className="min-w-0 text-[13px] leading-5 text-navy-700">
                  <b className="text-navy-900">You</b> <span className="text-navy-500">{row.verb}</span> <span className={row.done ? 'line-through' : 'font-semibold'}>{row.title}</span>
                  <span className="block font-mono text-[10px] text-navy-400">{row.when}</span>
                </span>
              </button>
            ))}
          </div>
        </article>

        <article className="flex flex-col overflow-hidden rounded-[28px] border border-white/70 bg-white/78 p-5 shadow-[0_18px_40px_-16px_rgba(15,35,66,.18),0_4px_12px_rgba(15,35,66,.06)] backdrop-blur-2xl md:col-span-6 lg:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold lowercase text-navy-900">ritmo semanal</h2>
            <span className="rounded-full bg-navy-900/[0.05] px-2.5 py-1 font-mono text-[11px] text-navy-500">12 days</span>
          </div>
          <div className="text-[52px] font-black leading-none text-navy-900">{Math.max(1, Math.min(12, completedThisWeek || todayItems.length))}d</div>
          <div className="mt-1 font-mono text-[11px] text-navy-500">keep it going / best 24d</div>
          <div className="mt-auto flex h-20 items-end gap-1.5">
            {[30, 50, 65, 40, 70, 55, 80, 60, 85, 75, 90, 95, 100, 35].map((height, index) => (
              <span key={`${height}-${index}`} className={`flex-1 rounded-full ${index === 12 ? 'bg-[linear-gradient(180deg,#2F6BFF,#28C7B7)]' : index < 12 ? 'bg-navy-900/50' : 'bg-navy-900/12'}`} style={{ height: `${height}%` }} />
            ))}
          </div>
        </article>
      </section>

      {openEvent ? (
        <EventSheet
          event={openEvent}
          onSaved={setOpenEvent}
          onDeleted={() => setOpenEvent(null)}
          onClose={() => setOpenEvent(null)}
        />
      ) : null}
      </div>
    </>
  )
}
