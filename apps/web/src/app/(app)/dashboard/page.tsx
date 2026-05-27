'use client'

import Link from 'next/link'
import { toLocalDateKey } from '@doit/core'
import type { CalendarEvent, Item } from '@doit/types'
import {
  AuditRiskBadge,
  BentoGrid,
  BentoWallpaper,
  CardTitle,
  DarkGlowCard,
  FolderChip,
  GlassCard,
  MarkdownFileBadge,
  MetricCard,
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

function itemDateLabel(item: Item) {
  const date = item.dueDate ?? item.scheduledDate
  if (!date) return item.complexity === 'note' ? 'Nota' : 'Sem data'
  const time = item.dueTime ? ` ${item.dueTime}` : ''
  return `${formatShortDate(date)}${time}`
}

function ProgressRing({ value }: { value: number }) {
  const safe = Math.max(0, Math.min(100, value))
  return (
    <div
      className="grid h-28 w-28 place-items-center rounded-full"
      style={{
        background: `conic-gradient(#2f6bff ${safe * 3.6}deg, rgba(255,255,255,.48) 0deg)`,
      }}
      aria-label={`${safe}% concluido`}
    >
      <div className="grid h-[86px] w-[86px] place-items-center rounded-full bg-white/82 text-center shadow-cool-sm">
        <div>
          <div className="text-2xl font-black leading-none text-navy-900">{safe}%</div>
          <div className="mt-1 font-mono text-[9px] font-bold uppercase tracking-[0.1em] text-navy-400">
            feito
          </div>
        </div>
      </div>
    </div>
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
  const overdue = items.filter((item) => isOverdue(item, today))
  const inboxItems = openItems.filter(isLooseInboxItem)
  const activeFocus = openItems
    .filter((item) => isOverdue(item, today) || isDueToday(item, today) || isLooseInboxItem(item))
    .slice()
    .sort((a, b) => {
      const ad = a.dueDate ?? a.scheduledDate ?? '9999-99-99'
      const bd = b.dueDate ?? b.scheduledDate ?? '9999-99-99'
      return ad.localeCompare(bd) || a.updatedAt.localeCompare(b.updatedAt)
    })
    .slice(0, 5)

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

  async function completeItem(item: Item) {
    await updateItem(item.id, { status: 'done' })
  }

  return (
    <BentoWallpaper>
      <div className="mx-auto flex min-h-full w-full max-w-7xl flex-col px-4 pb-28 pt-4 sm:px-6 lg:px-8 lg:pb-8">
        <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-navy-500">
              {formatDay(today)}
            </div>
            <h1 className="mt-2 text-4xl font-black leading-[0.95] tracking-normal text-navy-900 sm:text-5xl">
              seu workspace,
              <br />
              <span className="bg-[linear-gradient(120deg,#2f6bff_0%,#7b5bff_45%,#28c7b7_100%)] bg-clip-text text-transparent">
                em itens.
              </span>
            </h1>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => openCapture('task')}
              className="h-11 rounded-full bg-navy-900 px-5 text-sm font-bold text-white shadow-cool-md hover:bg-navy-800"
            >
              Novo item
            </button>
            <button
              type="button"
              onClick={() => openCapture('note')}
              className="h-11 rounded-full border border-white/70 bg-white/62 px-5 text-sm font-bold text-navy-800 shadow-cool-sm backdrop-blur-xl hover:bg-white/80"
            >
              Nova nota
            </button>
          </div>
        </div>

        <BentoGrid className="auto-rows-[minmax(140px,auto)]">
          <GlassCard className="p-5 md:col-span-6 lg:col-span-4 lg:row-span-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>Hoje</CardTitle>
                <p className="mt-3 max-w-[13rem] text-2xl font-black leading-tight text-navy-900">
                  {isLoading ? 'carregando itens' : `${completedToday} de ${todayTotal} itens`}
                </p>
                <p className="mt-2 text-sm text-navy-500">
                  {overdue.length > 0
                    ? `${overdue.length} atrasado(s) precisam de revisao.`
                    : 'Nada atrasado no momento.'}
                </p>
              </div>
              <ProgressRing value={progress} />
            </div>
            <div className="mt-5 grid grid-cols-3 gap-2">
              <MetricCard label="ativos" value={openItems.length} detail="abertos" />
              <MetricCard label="inbox" value={inboxItems.length} detail="soltos" />
              <MetricCard label="sync" value={changes.length} detail="pendente" />
            </div>
          </GlassCard>

          <DarkGlowCard className="md:col-span-6 lg:col-span-5 lg:row-span-2">
            <div className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <CardTitle className="text-white">Itens ativos</CardTitle>
                <Link href="/today" className="rounded-full bg-white/10 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-white/70">
                  abrir hoje
                </Link>
              </div>

              <div className="space-y-2">
                {activeFocus.length === 0 ? (
                  <div className="rounded-[18px] border border-white/10 bg-white/8 px-4 py-8 text-center text-sm text-white/62">
                    Nenhum item em foco.
                  </div>
                ) : (
                  activeFocus.map((item) => (
                    <div
                      key={item.id}
                      className="group flex items-center gap-3 rounded-[18px] border border-white/10 bg-white/[0.07] px-3 py-3 transition-colors hover:bg-white/[0.11]"
                    >
                      {item.complexity === 'task' || item.complexity === 'capture' ? (
                        <button
                          type="button"
                          onClick={() => void completeItem(item)}
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-[12px] border border-white/25 text-white/70 hover:border-teal-300 hover:bg-teal-400 hover:text-navy-900"
                          aria-label={`Concluir ${item.title}`}
                        >
                          <span className="h-2.5 w-2.5 rounded-full border border-current" />
                        </button>
                      ) : (
                        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-[12px] bg-white/10 font-mono text-[10px] font-black text-cyan-100">
                          MD
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => setSingleSelection(item.id)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="truncate text-sm font-semibold text-white">{item.title}</p>
                        <p className="mt-0.5 truncate font-mono text-[11px] text-white/48">
                          {itemDateLabel(item)}
                          {item.tags.length > 0 ? ` / ${item.tags.slice(0, 2).map((tag) => `@${tag}`).join(' ')}` : ''}
                        </p>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </DarkGlowCard>

          <GlassCard className="p-5 md:col-span-3 lg:col-span-3">
            <CardTitle>Calendario</CardTitle>
            <div className="mt-3 space-y-2">
              {todayEvents.length === 0 ? (
                <p className="rounded-[18px] bg-white/42 px-4 py-6 text-sm text-navy-500">
                  Sem eventos proximos.
                </p>
              ) : (
                todayEvents.map((event) => (
                  <Link
                    key={event.id}
                    href="/calendar"
                    className="flex items-center gap-3 rounded-[16px] bg-white/50 px-3 py-2 text-left hover:bg-white/75"
                  >
                    <span className="h-8 w-1 rounded-full bg-brand-500" />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-bold text-navy-900">
                        {event.title}
                      </span>
                      <span className="block font-mono text-[10px] text-navy-400">
                        {formatShortDate(event.start.slice(0, 10))} / {formatEventTime(event)}
                      </span>
                    </span>
                  </Link>
                ))
              )}
            </div>
          </GlassCard>

          <GlassCard className="p-5 md:col-span-3 lg:col-span-4">
            <div className="flex items-center justify-between">
              <CardTitle>Pastas</CardTitle>
              <Link href="/notas" className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-brand-700">
                ver notas
              </Link>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {activeFolders.length === 0 ? (
                <p className="text-sm text-navy-500">Nenhuma pasta com itens ativos.</p>
              ) : (
                activeFolders.map(({ folder, count }, index) => (
                  <Link key={folder.id} href={`/notas/${folder.id}`}>
                    <FolderChip count={count} active={index === 0}>{folder.name}</FolderChip>
                  </Link>
                ))
              )}
            </div>
          </GlassCard>

          <GlassCard className="p-5 md:col-span-6 lg:col-span-5">
            <div className="flex items-center justify-between">
              <CardTitle>Auditoria / Sync</CardTitle>
              <Link href="/settings?tab=audit" className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-brand-700">
                revisar
              </Link>
            </div>
            <div className="mt-4 space-y-2">
              {changes.length === 0 ? (
                <div className="rounded-[18px] bg-white/42 px-4 py-5 text-sm text-navy-500">
                  Sem mudancas pendentes do sync local.
                </div>
              ) : (
                changes.slice(0, 4).map((change) => (
                  <div key={change.id} className="flex items-center gap-3 rounded-[16px] bg-white/50 px-3 py-2">
                    <AuditRiskBadge risk={change.riskLevel} />
                    <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-navy-800">
                      {change.titleAfter ?? change.titleBefore ?? change.itemId ?? change.changeType}
                    </span>
                    <MarkdownFileBadge>{change.localPathAfter ?? change.localPathBefore ?? 'item.md'}</MarkdownFileBadge>
                  </div>
                ))
              )}
            </div>
          </GlassCard>

          <GlassCard className="p-5 md:col-span-6 lg:col-span-3">
            <CardTitle>Captura rapida</CardTitle>
            <div className="mt-4 grid gap-2">
              <button
                type="button"
                onClick={() => openCapture('task')}
                className="flex min-h-12 items-center justify-between rounded-[18px] bg-white/58 px-4 text-left text-sm font-bold text-navy-900 hover:bg-white/78"
              >
                Item de hoje
                <span className="font-mono text-[11px] text-brand-700">Q</span>
              </button>
              <button
                type="button"
                onClick={() => openCapture('note')}
                className="flex min-h-12 items-center justify-between rounded-[18px] bg-white/58 px-4 text-left text-sm font-bold text-navy-900 hover:bg-white/78"
              >
                Nota markdown
                <span className="font-mono text-[11px] text-brand-700">W</span>
              </button>
              <button
                type="button"
                onClick={() => openCapture('event')}
                className="flex min-h-12 items-center justify-between rounded-[18px] bg-white/58 px-4 text-left text-sm font-bold text-navy-900 hover:bg-white/78"
              >
                Evento
                <span className="font-mono text-[11px] text-brand-700">E</span>
              </button>
            </div>
          </GlassCard>
        </BentoGrid>
      </div>
    </BentoWallpaper>
  )
}
