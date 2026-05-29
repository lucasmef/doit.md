'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toLocalDateKey } from '@doit/core'
import type { CalendarEvent, Item } from '@doit/types'
import {
  AuditRiskBadge,
  BentoGrid,
  CardTitle,
  DarkGlowCard,
  GlassCard,
} from '@/components/ui/bento'
import { usePendingChanges } from '@/hooks/use-audit'
import { useCalendarEvents } from '@/hooks/use-calendar-events'
import { useFolders } from '@/hooks/use-folders'
import { updateItem, useItems } from '@/hooks/use-items'
import { isLooseInboxItem } from '@/lib/item-order'
import { useUI } from '@/store/ui'

function formatDay(dateKey: string) {
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
}

function formatShortDate(dateKey: string) {
  const today = toLocalDateKey()
  const tomorrowDate = new Date()
  tomorrowDate.setDate(tomorrowDate.getDate() + 1)
  const tomorrow = toLocalDateKey(tomorrowDate)
  if (dateKey === today) return 'Hoje'
  if (dateKey === tomorrow) return 'Amanha'
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'short',
  })
}

function formatMonth(dateKey: string) {
  return new Date(`${dateKey}T12:00:00`)
    .toLocaleDateString('pt-BR', { month: 'short' })
    .replace('.', '')
    .toLocaleUpperCase('pt-BR')
}

function formatEventTime(event: CalendarEvent) {
  if (event.allDay) return 'Dia todo'
  return new Date(event.start).toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function isActive(item: Item) {
  return item.status !== 'archived' && item.status !== 'done'
}

function isDueToday(item: Item, today: string) {
  return item.dueDate === today || item.scheduledDate === today
}

function isOverdue(item: Item, today: string) {
  return Boolean(item.dueDate && item.dueDate < today && item.status !== 'done' && item.status !== 'archived')
}

const lightCardTone =
  '!border-white/75 !bg-white/[0.78] shadow-[0_1px_0_rgba(255,255,255,.82)_inset,0_-1px_0_rgba(15,35,66,.035)_inset,0_18px_40px_-16px_rgba(15,35,66,.18),0_4px_12px_rgba(15,35,66,.06)]'

function statusLabel(item: Item, today: string) {
  if (item.status === 'done') return 'feito'
  if (isOverdue(item, today)) return 'atrasado'
  if (isDueToday(item, today)) return 'hoje'
  if (isLooseInboxItem(item)) return 'inbox'
  return item.complexity === 'note' ? 'nota' : 'ativo'
}

function CardMore({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="grid h-7 w-7 place-items-center rounded-full bg-navy-900/[0.04] text-sm font-black leading-none text-navy-500 hover:bg-navy-900/[0.08]"
      aria-label={label}
      title={label}
    >
      ...
    </Link>
  )
}

function TodayRing({ value }: { value: number }) {
  const safe = Math.max(0, Math.min(100, value))
  return (
    <div
      className="grid h-[68px] w-[68px] place-items-center rounded-full"
      style={{
        background: `conic-gradient(#2f6bff 0deg, #7b5bff ${safe * 1.8}deg, #28c7b7 ${safe * 3.6}deg, rgba(15,35,66,.10) 0deg)`,
      }}
      aria-label={`${safe}% concluido`}
    >
      <div className="grid h-14 w-14 place-items-center rounded-full bg-white/88 text-center shadow-cool-sm">
        <div className="text-sm font-black leading-none text-navy-900">
          {safe}%
          <span className="mt-1 block font-mono text-[8px] font-bold uppercase text-navy-400">feito</span>
        </div>
      </div>
    </div>
  )
}

function CalendarDial({ today, events }: { today: string; events: CalendarEvent[] }) {
  const date = new Date(`${today}T12:00:00`)
  const day = date.getDate()
  const nums = [-2, -1, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((offset) => {
    const d = new Date(date)
    d.setDate(day + offset)
    return d.getDate()
  })
  const positions = [
    'left-[50%] top-[8%]',
    'left-[14%] top-[22%]',
    'left-[80%] top-[22%]',
    'left-[92%] top-[50%]',
    'left-[8%] top-[50%]',
    'left-[84%] top-[78%]',
    'left-[18%] top-[78%]',
    'left-[33%] top-[92%]',
    'left-[50%] top-[97%]',
    'left-[67%] top-[92%]',
    'left-[65%] top-[12%]',
  ]

  return (
    <>
      <div className="relative mx-auto mt-1 grid h-[168px] w-[168px] place-items-center rounded-full border border-navy-900/[0.06] bg-white/60">
        {nums.map((num, index) => (
          <span
            key={`${num}-${index}`}
            className={`absolute -translate-x-1/2 -translate-y-1/2 font-mono text-xs text-navy-500 ${positions[index]}`}
          >
            {num}
          </span>
        ))}
        <span className="absolute left-[65%] top-[12%] grid h-[22px] w-[22px] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-navy-900 font-mono text-xs font-bold text-white">
          {day}
        </span>
        <div className="grid h-[88px] w-[88px] place-items-center rounded-full bg-[linear-gradient(135deg,#fff,#f8fafc)] text-center shadow-[0_4px_12px_rgba(15,35,66,.10),inset_0_0_0_1px_rgba(15,35,66,.05)]">
          <div>
            <div className="text-3xl font-black leading-none text-navy-900">{day}</div>
            <div className="mt-1 font-mono text-[11px] text-navy-500">{formatMonth(today)}</div>
          </div>
        </div>
      </div>
      <div className="mt-auto space-y-2">
        {events.length === 0 ? (
          <div className="rounded-[16px] bg-white/48 px-3 py-3 text-sm text-navy-500">Sem eventos proximos.</div>
        ) : (
          events.slice(0, 2).map((event) => (
            <Link key={event.id} href="/calendar" className="block rounded-[16px] px-1 py-1 hover:bg-white/40">
              <div className="truncate text-[13px] font-bold text-navy-900">{event.title}</div>
              <div className="font-mono text-[11px] text-navy-500">
                {formatShortDate(event.start.slice(0, 10))} / {formatEventTime(event)}
              </div>
            </Link>
          ))
        )}
      </div>
      <div className="mt-3 flex justify-center gap-1.5">
        <span className="h-1.5 w-4 rounded-full bg-navy-900" />
        <span className="h-1.5 w-1.5 rounded-full bg-navy-900/20" />
        <span className="h-1.5 w-1.5 rounded-full bg-navy-900/20" />
      </div>
    </>
  )
}

function ActiveItemRow({
  item,
  index,
  today,
  onComplete,
  onOpen,
}: {
  item: Item
  index: number
  today: string
  onComplete: (item: Item) => void
  onOpen: (id: string) => void
}) {
  const pct = item.status === 'done' ? 100 : isDueToday(item, today) ? 78 : isOverdue(item, today) ? 58 : 42
  const done = item.status === 'done'
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.07] px-4 py-3">
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-full"
        style={{
          background: `radial-gradient(150px 34px at ${pct}% 95%, rgba(40,199,183,.42), transparent 70%)`,
        }}
      />
      <div className="relative z-10 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onComplete(item)}
          className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] border text-[11px] ${
            done
              ? 'border-teal-500 bg-teal-500 text-navy-900'
              : 'border-white/30 text-white/70 hover:border-teal-300 hover:bg-teal-400 hover:text-navy-900'
          }`}
          aria-label={`Concluir ${item.title}`}
        >
          {done ? '✓' : ''}
        </button>
        <button type="button" onClick={() => onOpen(item.id)} className="min-w-0 flex-1 text-left">
          <span className="block truncate text-sm font-bold text-white">{item.title}</span>
        </button>
        <span className="rounded-full border border-white/15 bg-white/10 px-2 py-0.5 font-mono text-[10px] text-white/85">
          {statusLabel(item, today)}
        </span>
      </div>
      <div className="relative z-10 mt-2 h-1 overflow-hidden rounded-full bg-white/[0.08]">
        <div
          className="h-full rounded-full bg-[linear-gradient(90deg,#2f6bff,#28c7b7)] shadow-[0_0_12px_rgba(40,199,183,.55)]"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="relative z-10 mt-2 flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-white/55">
          {item.folderId ? 'pasta/item.md' : isLooseInboxItem(item) ? 'inbox/item.md' : 'hoje.md'}
        </span>
        <span className="grid h-6 w-6 place-items-center rounded-full bg-[linear-gradient(135deg,#ffb1d5,#b59bff_60%,#28c7b7)] text-[9px] font-black text-white ring-1 ring-white/30">
          {index === 1 ? 'MD' : 'LF'}
        </span>
        <span className="font-mono text-[11px] font-bold text-white/70">{pct}%</span>
      </div>
    </div>
  )
}

function MarkdownGarden({
  folders,
  notes,
}: {
  folders: Array<{ folder: { id: string; name: string }; count: number }>
  notes: Item[]
}) {
  const cards = [
    {
      title: notes[0]?.title ?? 'ideia solta capturada',
      file: notes[0] ? 'inbox/nota.md' : 'creative.md',
      note: '~ pronta para virar item ~',
      className: 'left-[4%] top-[18%] rotate-[-5deg] bg-[#fff7d6]',
    },
    {
      title: folders[0]?.folder.name ? `Pasta ${folders[0].folder.name}` : 'Pasta conteudo',
      file: folders[0]?.folder.name ? `pastas/${folders[0].folder.name}.md` : 'pastas/conteudo.md',
      note: 'capturar -> organizar -> executar',
      className: 'left-[32%] top-[6%] rotate-[4deg] bg-[#dbfbf5]',
    },
    {
      title: 'eventos do calendario',
      file: 'agenda-sync.md',
      note: 'itens vinculados',
      className: 'right-[5%] top-[22%] rotate-[-3deg] bg-[#eee8ff]',
    },
    {
      title: notes[1]?.title ?? 'arquivo de ideias',
      file: notes[1] ? 'notas/recentes.md' : 'ideas.md',
      note: '',
      className: 'left-[18%] bottom-[8%] rotate-[3deg] bg-[#dbfbf5]',
    },
    {
      title: 'referencias e anexos Drive',
      file: 'reading.md',
      note: '',
      className: 'right-[16%] bottom-[10%] rotate-[6deg] bg-[#fff7d6]',
    },
  ]

  return (
    <div className="relative min-h-[360px] flex-1 rounded-[22px] border border-navy-900/[0.05] bg-white/35">
      {cards.map((card) => (
        <div
          key={card.file}
          className={`absolute w-[44%] max-w-[190px] rounded-[18px] border border-white/70 p-3 shadow-[0_12px_26px_rgba(15,35,66,.12)] ${card.className}`}
        >
          <div className="font-mono text-[10px] font-bold text-brand-700">MD {card.file}</div>
          <div className="mt-2 line-clamp-2 text-[13px] font-black leading-tight text-navy-900">{card.title}</div>
          {card.note ? <div className="mt-2 font-mono text-[10px] text-navy-500">{card.note}</div> : null}
        </div>
      ))}
      <span className="absolute left-[24%] top-[8%] font-mono text-xs text-navy-300">~ + ~</span>
      <span className="absolute left-[48%] top-[24%] font-mono text-xs text-navy-300">~~~</span>
      <span className="absolute right-[8%] top-[70%] font-mono text-xs text-navy-300">{'->'}</span>
      <span className="absolute bottom-[8%] left-[6%] font-mono text-xs text-navy-300">+</span>
    </div>
  )
}

function ReviewCard({ completedToday, totalToday }: { completedToday: number; totalToday: number }) {
  const bars = [30, 50, 65, 40, 70, 55, 80, 60, 85, 75, 90, 95, 100, 35]
  return (
    <>
      <div>
        <div className="text-7xl font-black leading-none text-navy-900">{completedToday}</div>
        <div className="mt-2 text-sm font-semibold text-navy-500">
          {totalToday === 0 ? 'sem itens para hoje' : `de ${totalToday} itens concluidos hoje`}
        </div>
      </div>
      <div className="mt-auto flex h-28 items-end gap-1.5">
        {bars.map((height, index) => (
          <span
            key={`${height}-${index}`}
            className={`flex-1 rounded-full ${
              index === 12
                ? 'bg-[linear-gradient(180deg,#2f6bff,#28c7b7)]'
                : index < 12
                  ? 'bg-navy-900/55'
                  : 'bg-navy-900/12'
            }`}
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
    </>
  )
}

function FocusCard({ focusItem, onOpen }: { focusItem?: Item; onOpen: () => void }) {
  const [running, setRunning] = useState(false)
  const [seconds, setSeconds] = useState(7 * 60 + 48)

  useEffect(() => {
    if (!running) return undefined
    const id = window.setInterval(() => {
      setSeconds((current) => (current > 0 ? current - 1 : 0))
    }, 1000)
    return () => window.clearInterval(id)
  }, [running])

  const minutes = Math.floor(seconds / 60)
  const rest = seconds % 60
  const label = `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`
  const progress = Math.max(8, Math.min(100, ((25 * 60 - seconds) / (25 * 60)) * 100))

  return (
    <>
      <div className="text-[44px] font-black leading-none text-navy-900">{label}</div>
      <button
        type="button"
        onClick={onOpen}
        className="mt-3 line-clamp-2 text-left text-sm font-semibold text-navy-500 hover:text-navy-900"
      >
        {focusItem ? focusItem.title : 'sessao de foco / item atual'}
      </button>
      <div className="mt-auto space-y-3">
        <div className="h-2 overflow-hidden rounded-full bg-navy-900/10">
          <div className="h-full rounded-full bg-[linear-gradient(90deg,#2f6bff,#28c7b7)]" style={{ width: `${progress}%` }} />
        </div>
        <button
          type="button"
          onClick={() => setRunning((value) => !value)}
          className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-navy-900 text-sm font-bold text-white shadow-cool-md hover:bg-navy-800"
        >
          <span aria-hidden="true">{running ? '||' : '▶'}</span>
          {running ? 'pausar sessao' : 'iniciar sessao'}
        </button>
      </div>
    </>
  )
}

export default function DashboardPage() {
  const today = toLocalDateKey()
  const tomorrowDate = new Date()
  tomorrowDate.setDate(tomorrowDate.getDate() + 1)
  const tomorrow = toLocalDateKey(tomorrowDate)
  const { items, isLoading } = useItems()
  const { folders } = useFolders()
  const { changes } = usePendingChanges()
  const { events } = useCalendarEvents(`${today}T00:00:00Z`, `${tomorrow}T23:59:59Z`)
  const { openCapture, setSingleSelection } = useUI()

  const openItems = items.filter(isActive)
  const dueToday = items.filter((item) => item.status !== 'archived' && isDueToday(item, today))
  const completedToday = dueToday.filter((item) => item.status === 'done').length
  const todayTotal = dueToday.length
  const progress = todayTotal > 0 ? Math.round((completedToday / todayTotal) * 100) : 0
  const inboxItems = openItems.filter(isLooseInboxItem)
  const noteItems = openItems
    .filter((item) => item.complexity === 'note')
    .slice()
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, 4)
  const activeFocus = openItems
    .filter((item) => isOverdue(item, today) || isDueToday(item, today) || isLooseInboxItem(item))
    .slice()
    .sort((a, b) => {
      const ad = a.dueDate ?? a.scheduledDate ?? '9999-99-99'
      const bd = b.dueDate ?? b.scheduledDate ?? '9999-99-99'
      return ad.localeCompare(bd) || a.updatedAt.localeCompare(b.updatedAt)
    })
    .slice(0, 3)

  const todayEvents = events
    .filter((event) => event.start.slice(0, 10) === today || event.start.slice(0, 10) === tomorrow)
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(0, 5)

  const folderCounts = new Map<string, number>()
  for (const item of openItems) {
    if (!item.folderId) continue
    folderCounts.set(item.folderId, (folderCounts.get(item.folderId) ?? 0) + 1)
  }
  const activeFolders = folders
    .map((folder) => ({ folder, count: folderCounts.get(folder.id) ?? 0 }))
    .filter((entry) => entry.count > 0)
    .sort((a, b) => b.count - a.count || a.folder.name.localeCompare(b.folder.name, 'pt-BR'))
    .slice(0, 6)

  const auditRows = useMemo(() => {
    if (changes.length > 0) {
      return changes.slice(0, 4).map((change) => ({
        id: change.id,
        initials: change.riskLevel === 'high' ? 'AL' : change.riskLevel === 'medium' ? 'MD' : 'BX',
        title: change.titleAfter ?? change.titleBefore ?? change.itemId ?? change.changeType,
        detail: change.localPathAfter ?? change.localPathBefore ?? 'item.md',
        risk: change.riskLevel,
      }))
    }
    return [
      { id: 'sync-clean', initials: 'OK', title: 'Sync local sem pendencias', detail: 'manifest.md', risk: 'low' },
      { id: 'inbox-count', initials: 'IN', title: `${inboxItems.length} item(ns) soltos no inbox`, detail: 'inbox.md', risk: 'low' },
      { id: 'calendar-count', initials: 'CA', title: `${todayEvents.length} evento(s) proximos`, detail: 'eventos.md', risk: 'low' },
    ]
  }, [changes, inboxItems.length, todayEvents.length])

  async function completeItem(item: Item) {
    await updateItem(item.id, { status: 'done' })
  }

  const focusItem = activeFocus[0]

  return (
    <div className="min-h-full bg-[radial-gradient(900px_700px_at_8%_15%,rgba(123,91,255,.12),transparent_62%),radial-gradient(820px_620px_at_92%_18%,rgba(255,137,235,.10),transparent_64%),radial-gradient(900px_780px_at_78%_82%,rgba(40,199,183,.16),transparent_62%)]">
      <div className="mx-auto flex min-h-full w-full max-w-[1440px] flex-col px-4 pb-28 pt-4 sm:px-6 lg:px-8 lg:pb-8 lg:pt-1">
        <BentoGrid className="auto-rows-[250px] gap-4 lg:gap-[18px]">
          <GlassCard className={`flex flex-col p-5 md:col-span-3 lg:col-span-3 lg:row-span-2 ${lightCardTone}`}>
            <div className="mb-3 flex items-center justify-between">
              <CardTitle className="text-[15px] normal-case tracking-normal text-navy-900">Calendário</CardTitle>
              <CardMore href="/calendar" label="Abrir calendário" />
            </div>
            <CalendarDial today={today} events={todayEvents} />
          </GlassCard>

          <GlassCard className={`relative flex flex-col p-6 md:col-span-6 lg:col-span-5 lg:row-span-2 ${lightCardTone}`}>
            <div className="pointer-events-none absolute -right-10 -top-10 h-72 w-72 rounded-full bg-[radial-gradient(circle_at_30%_30%,rgba(47,107,255,.20),transparent_60%),radial-gradient(circle_at_70%_70%,rgba(40,199,183,.18),transparent_60%)] blur-xl" />
            <div className="relative z-10 flex items-center justify-between">
              <div>
                <CardTitle className="text-[15px] normal-case tracking-normal text-navy-900">Hoje</CardTitle>
                <div className="mt-1 font-mono text-xs font-semibold uppercase text-navy-500">
                  {formatDay(today)}
                </div>
              </div>
              <CardMore href="/today" label="Abrir itens de hoje" />
            </div>
            <h1 className="relative z-10 mt-4 text-[46px] font-black leading-[0.98] text-navy-900 sm:text-[62px]">
              seu dia,
              <br />
              <span className="bg-[linear-gradient(120deg,#2f6bff_0%,#7b5bff_45%,#28c7b7_100%)] bg-clip-text text-transparent">
                em itens.
              </span>
            </h1>
            <div className="relative z-10 mt-auto flex flex-wrap items-center gap-3">
              <TodayRing value={progress} />
              <button
                type="button"
                onClick={() => openCapture('task')}
                className="inline-flex h-10 items-center gap-2 rounded-full bg-navy-900 px-4 text-[13px] font-bold text-white shadow-cool-md hover:bg-navy-800"
              >
                <span className="text-base leading-none">+</span>
                novo item
              </button>
              <button
                type="button"
                onClick={() => openCapture('event')}
                className="inline-flex h-10 items-center rounded-full border border-navy-900/[0.08] bg-white/60 px-4 text-[13px] font-bold text-navy-900 hover:bg-white/85"
              >
                planejar amanha
              </button>
              <span className="font-mono text-[11px] font-semibold text-navy-500">
                {isLoading ? 'carregando' : `${completedToday}/${todayTotal} feito`}
              </span>
            </div>
          </GlassCard>

          <DarkGlowCard className="md:col-span-6 lg:col-span-4 lg:row-span-2">
            <div className="flex h-full flex-col p-5">
              <div className="mb-4 flex items-center justify-between">
                <CardTitle className="text-[15px] normal-case tracking-normal text-white">Itens ativos</CardTitle>
                <Link href="/itens" className="grid h-7 w-7 place-items-center rounded-full bg-white/10 text-sm font-black leading-none text-white/70 hover:bg-white/15" aria-label="Abrir itens">
                  ...
                </Link>
              </div>

              <div className="space-y-3">
                {activeFocus.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/8 px-4 py-12 text-center text-sm text-white/62">
                    Nenhum item em foco.
                  </div>
                ) : (
                  activeFocus.map((item, index) => (
                    <ActiveItemRow
                      key={item.id}
                      item={item}
                      index={index}
                      today={today}
                      onComplete={(target) => void completeItem(target)}
                      onOpen={setSingleSelection}
                    />
                  ))
                )}
              </div>
            </div>
          </DarkGlowCard>

          <GlassCard className={`flex flex-col p-5 md:col-span-3 lg:col-span-3 lg:row-span-2 ${lightCardTone}`}>
            <div className="mb-4 flex items-center justify-between">
              <CardTitle className="text-[15px] normal-case tracking-normal text-navy-900">Auditoria</CardTitle>
              <CardMore href="/audit" label="Abrir auditoria" />
            </div>
            <div className="space-y-3">
              {auditRows.map((row, index) => (
                <Link
                  key={row.id}
                  href="/audit"
                  className="flex items-center gap-3 rounded-[18px] bg-white/40 p-2.5 hover:bg-white/65"
                >
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-[10px] font-black text-white ${
                      index === 0 ? 'bg-brand-500' : index === 1 ? 'bg-teal-500' : 'bg-[#7b5bff]'
                    }`}
                  >
                    {row.initials}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-navy-900">{row.title}</span>
                    <span className="mt-0.5 flex items-center gap-2">
                      <AuditRiskBadge risk={row.risk} />
                      <span className="truncate font-mono text-[10px] text-navy-400">{row.detail}</span>
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </GlassCard>

          <GlassCard className={`flex flex-col p-5 md:col-span-6 lg:col-span-5 lg:row-span-2 ${lightCardTone}`}>
            <div className="mb-4 flex items-center justify-between">
              <CardTitle className="text-[15px] normal-case tracking-normal text-navy-900">Jardim Markdown</CardTitle>
              <CardMore href="/notas" label="Abrir notas" />
            </div>
            <MarkdownGarden folders={activeFolders} notes={noteItems} />
            <div className="mt-3 flex flex-wrap gap-2">
              {activeFolders.slice(0, 3).map(({ folder, count }) => (
                <Link
                  key={folder.id}
                  href={`/notas?folder=${folder.id}`}
                  className="rounded-full bg-white/55 px-3 py-1 font-mono text-[10px] font-bold text-brand-700 hover:bg-white/80"
                >
                  {folder.name} / {count}
                </Link>
              ))}
              {activeFolders.length === 0 ? (
                <button
                  type="button"
                  onClick={() => openCapture('note')}
                  className="rounded-full bg-white/55 px-3 py-1 font-mono text-[10px] font-bold text-brand-700 hover:bg-white/80"
                >
                  criar nota
                </button>
              ) : null}
            </div>
          </GlassCard>

          <GlassCard className={`flex flex-col p-5 md:col-span-3 lg:col-span-2 lg:row-span-2 ${lightCardTone}`}>
            <div className="mb-5 flex items-center justify-between">
              <CardTitle className="text-[15px] normal-case tracking-normal text-navy-900">Revisao</CardTitle>
              <CardMore href="/today" label="Abrir revisao" />
            </div>
            <ReviewCard completedToday={completedToday} totalToday={todayTotal} />
          </GlassCard>

          <GlassCard className={`flex flex-col p-5 md:col-span-3 lg:col-span-2 lg:row-span-2 ${lightCardTone}`}>
            <div className="mb-5 flex items-center justify-between">
              <CardTitle className="text-[15px] normal-case tracking-normal text-navy-900">Foco</CardTitle>
              <CardMore href="/today" label="Abrir foco" />
            </div>
            <FocusCard
              focusItem={focusItem}
              onOpen={() => {
                if (focusItem) {
                  setSingleSelection(focusItem.id)
                } else {
                  openCapture('task')
                }
              }}
            />
          </GlassCard>

          <GlassCard className={`flex min-h-[120px] flex-col justify-between p-5 md:col-span-6 lg:hidden ${lightCardTone}`}>
            <CardTitle className="text-[15px] normal-case tracking-normal text-navy-900">Resumo</CardTitle>
            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-[18px] bg-white/55 p-3">
                <div className="font-mono text-[10px] font-bold uppercase text-navy-400">ativos</div>
                <div className="mt-1 text-2xl font-black text-navy-900">{openItems.length}</div>
              </div>
              <div className="rounded-[18px] bg-white/55 p-3">
                <div className="font-mono text-[10px] font-bold uppercase text-navy-400">inbox</div>
                <div className="mt-1 text-2xl font-black text-navy-900">{inboxItems.length}</div>
              </div>
              <div className="rounded-[18px] bg-white/55 p-3">
                <div className="font-mono text-[10px] font-bold uppercase text-navy-400">sync</div>
                <div className="mt-1 text-2xl font-black text-navy-900">{changes.length}</div>
              </div>
            </div>
          </GlassCard>
        </BentoGrid>
      </div>
    </div>
  )
}
