'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useItems, updateItem, bulkUpdateItems } from '@/hooks/use-items'
import { useCalendarEvents } from '@/hooks/use-calendar-events'
import { usePreferences } from '@/hooks/use-preferences'
import { useUI } from '@/store/ui'
import { useLongPress } from '@/hooks/use-long-press'
import { toLocalDateKey } from '@doit/core'
import { EventSheet } from '@/components/calendar/calendar-board'
import type { CalendarEvent, Item } from '@doit/types'
import { useProjects } from '@/hooks/use-projects'
import './today.css'

function EventIcon({ className = 'h-[15px] w-[15px]' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="4" y="5" width="16" height="16" rx="2" />
      <path d="M7 3v3M17 3v3M4 9h16" />
    </svg>
  )
}

function TaskIcon({ checked }: { checked?: boolean }) {
  return (
    <svg className="h-[15px] w-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
      <rect x="5" y="5" width="14" height="14" rx="4" />
      {checked ? <path d="M8.5 12.5 11 15l4.5-6" /> : null}
    </svg>
  )
}

// ID 049: ícone de recorrência (símbolo de repetição) para tarefas recorrentes.
function RecurrenceIcon({ className = 'recur-icon' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path d="M17 2.5 20 5.5 17 8.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20 5.5H8.5A4.5 4.5 0 0 0 4 10" strokeLinecap="round" />
      <path d="M7 21.5 4 18.5 7 15.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 18.5h11.5A4.5 4.5 0 0 0 20 14" strokeLinecap="round" />
    </svg>
  )
}

function formatTime(dateStr: string) {
  try {
    const d = new Date(dateStr)
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

// Artigo de tarefa com toque simples (abrir) + toque longo / clique-direito (menu de ações).
function TaskArticle({
  item,
  disabled,
  onOpen,
  className,
  children,
}: {
  item: Item
  disabled?: boolean
  onOpen: (id: string) => void
  className: string
  children: React.ReactNode
}) {
  const { openContextMenu } = useUI()
  const { longPressProps, consumeClick } = useLongPress({
    onLongPress: ({ clientX, clientY }) => openContextMenu({ itemId: item.id, x: clientX, y: clientY }),
  })
  return (
    <article
      onClick={() => {
        if (disabled) return
        if (consumeClick()) return
        onOpen(item.id)
      }}
      {...longPressProps}
      className={`touch-pan-y [-webkit-touch-callout:none] [-webkit-user-select:none] ${className}`}
    >
      {children}
    </article>
  )
}

export default function TodayFocusedPage() {
  const { items, isLoading: itemsLoading } = useItems()
  const { events, isLoading: eventsLoading } = useCalendarEvents()
  const { projects } = useProjects()
  const { prefs } = usePreferences()
  const { setSingleSelection, selectedItemId } = useUI()

  const [openEvent, setOpenEvent] = useState<CalendarEvent | null>(null)
  const [temporarilyDone, setTemporarilyDone] = useState<Set<string>>(new Set())
  const today = toLocalDateKey()
  // ID 040: dia selecionado no calendário lateral (padrão = hoje).
  const [selectedDay, setSelectedDay] = useState(today)
  // ID 053: filtro por tag da lista atual.
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const isToday = selectedDay === today

  const tomorrowDate = new Date()
  tomorrowDate.setDate(tomorrowDate.getDate() + 1)
  const tomorrow = toLocalDateKey(tomorrowDate)
  const now = new Date()
  const nowMs = now.getTime()
  const currentTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
  const shouldShowTomorrow = currentTimeStr >= prefs.todayCalendarShowTomorrowAfterTime
  const hidePastMs = prefs.todayCalendarHidePastAfterHours * 60 * 60 * 1000

  const agendaEvents = useMemo(() => {
    return events.filter(e => {
      const onToday = e.start.startsWith(today)
      const onTomorrow = shouldShowTomorrow && e.start.startsWith(tomorrow)
      if (!onToday && !onTomorrow) return false
      if (!e.allDay) {
        const endMs = new Date(e.end ?? e.start).getTime()
        if (Number.isFinite(endMs) && nowMs - endMs >= hidePastMs) return false
      }
      return true
    }).sort((a, b) => a.start.localeCompare(b.start))
  }, [events, today, tomorrow, shouldShowTomorrow, nowMs, hidePastMs])

  const todayItems = useMemo(() => {
    const list = items.filter(i => (i.dueDate === today || i.scheduledDate === today) && i.status !== 'done')
    list.sort((a, b) => {
      if (a.dueTime && !b.dueTime) return -1
      if (!a.dueTime && b.dueTime) return 1
      if (a.dueTime && b.dueTime) return a.dueTime.localeCompare(b.dueTime)
      const pa = a.priority ?? 99
      const pb = b.priority ?? 99
      if (pa !== pb) return pa - pb
      return a.title.localeCompare(b.title)
    })
    return list
  }, [items, today])

  // Tarefas atrasadas (dias anteriores) ainda abertas — usadas no foco e no botão "Reagendar" (ID 048).
  const overdueItems = useMemo(
    () => items.filter(i => i.dueDate && i.dueDate < today && i.status !== 'done' && i.status !== 'archived'),
    [items, today],
  )

  const priorityItems = useMemo(() => {
    const list = items.filter(i => (i.status === 'doing' || (i.dueDate && i.dueDate < today && i.status !== 'done')))
    list.sort((a, b) => {
      const pa = a.priority ?? 99
      const pb = b.priority ?? 99
      if (pa !== pb) return pa - pb
      return (a.dueDate ?? '').localeCompare(b.dueDate ?? '')
    })
    return list
  }, [items, today])

  // ID 020: lista de foco do dia atual (hoje + foco/atrasados, sem duplicar).
  const focusItems = useMemo(() => {
    const byId = new Map<string, Item>()
    for (const i of [...priorityItems, ...todayItems]) byId.set(i.id, i)
    const list = Array.from(byId.values())
    const prioRank = (i: Item) => (i.priority && i.priority < 4 ? i.priority : 99)
    list.sort((a, b) => {
      const aHas = Boolean(a.dueTime)
      const bHas = Boolean(b.dueTime)
      if (aHas !== bHas) return aHas ? -1 : 1
      if (aHas && bHas) return (a.dueTime ?? '').localeCompare(b.dueTime ?? '')
      const pa = prioRank(a)
      const pb = prioRank(b)
      if (pa !== pb) return pa - pb
      return (b.createdAt ?? '').localeCompare(a.createdAt ?? '')
    })
    return list
  }, [priorityItems, todayItems])

  // ID 040: itens/eventos do dia selecionado. Dia atual = lista de foco; outro dia = itens daquele dia.
  const dayItems = useMemo(() => {
    if (isToday) return focusItems
    const list = items.filter(
      i => (i.dueDate === selectedDay || i.scheduledDate === selectedDay) && i.status !== 'done',
    )
    list.sort((a, b) => {
      if (a.dueTime && !b.dueTime) return -1
      if (!a.dueTime && b.dueTime) return 1
      if (a.dueTime && b.dueTime) return a.dueTime.localeCompare(b.dueTime)
      return a.title.localeCompare(b.title)
    })
    return list
  }, [isToday, focusItems, items, selectedDay])

  const dayEvents = useMemo(() => {
    if (isToday) return agendaEvents
    return events.filter(e => e.start.startsWith(selectedDay)).sort((a, b) => a.start.localeCompare(b.start))
  }, [isToday, agendaEvents, events, selectedDay])

  // ID 053: tags presentes na lista atualmente exibida (para servir de filtro).
  const tagsInList = useMemo(() => {
    const set = new Set<string>()
    for (const it of dayItems) for (const t of it.tags) set.add(t)
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [dayItems])

  const visibleItems = useMemo(
    () => (activeTag ? dayItems.filter(i => i.tags.includes(activeTag)) : dayItems),
    [dayItems, activeTag],
  )

  // Mini-calendário (mês atual, início na segunda, dias com conteúdo marcados).
  const datesWithContent = useMemo(() => {
    const set = new Set<string>()
    for (const it of items) {
      if (it.status === 'done') continue
      if (it.dueDate) set.add(it.dueDate)
      if (it.scheduledDate) set.add(it.scheduledDate)
    }
    for (const e of events) {
      const key = e.start?.slice(0, 10)
      if (key) set.add(key)
    }
    return set
  }, [items, events])

  const miniDays = useMemo(() => {
    const [y, m] = today.split('-').map(Number)
    const year = y ?? new Date().getFullYear()
    const month = (m ?? 1) - 1
    const first = new Date(year, month, 1)
    const offset = (first.getDay() + 6) % 7 // semana começando na segunda-feira
    const start = new Date(year, month, 1 - offset)
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
      return { key: toLocalDateKey(d), day: d.getDate(), inMonth: d.getMonth() === month }
    })
  }, [today])

  // Counts do painel (ID 053).
  const inboxCount = items.filter(i => i.status === 'inbox').length
  const todayCount = todayItems.length + agendaEvents.length
  const upcomingCount = items.filter(i => i.dueDate && i.dueDate > today && i.status !== 'done').length

  const getFolderName = (folderId?: string) => {
    if (!folderId) return ''
    const p = projects.find(p => p.id === folderId)
    return p ? p.name : ''
  }

  const getTaskStyle = (item: Item) => {
    const isPersonal = getFolderName(item.folderId).toLowerCase() === 'pessoal' || item.tags.some(t => t.toLowerCase() === 'pessoal')
    if (isPersonal) return 'personal'
    return 'task'
  }

  if (itemsLoading || eventsLoading) {
    return <div className="flex h-[calc(100vh-136px)] items-center justify-center font-mono text-sm text-navy-500">carregando today...</div>
  }

  const handleCompleteTask = (e: React.MouseEvent, item: Item) => {
    e.stopPropagation()
    setTemporarilyDone(prev => {
      const next = new Set(prev)
      next.add(item.id)
      return next
    })
    setTimeout(() => {
      updateItem(item.id, { status: 'done' })
    }, 1500)
  }

  // ID 048: reagenda todas as atrasadas para hoje.
  const handleRescheduleOverdue = async () => {
    if (overdueItems.length === 0) return
    await bulkUpdateItems({ ids: overdueItems.map(i => i.id), patch: { dueDate: today } }, overdueItems)
  }

  const selectDay = (key: string) => {
    setSelectedDay(key)
    setActiveTag(null)
  }

  const renderTask = (item: Item, isOverdue: boolean = false) => {
    const isTempDone = temporarilyDone.has(item.id)
    const styleType = getTaskStyle(item)
    const isSelected = selectedItemId === item.id
    const hasTime = Boolean(item.dueTime)
    // ID 020: barra lateral por prioridade (1=alta/vermelho, 2=média/laranja, 3=baixa/amarelo, demais=neutro).
    const prioClass = item.priority && item.priority < 4 ? `prio-${item.priority}` : 'prio-0'

    return (
      <TaskArticle
        key={item.id}
        item={item}
        disabled={isTempDone}
        onOpen={setSingleSelection}
        className={`row ${styleType} ${prioClass} ${hasTime ? 'has-time' : 'no-time'} ${isTempDone ? 'done' : ''} ${isSelected ? 'selected' : ''}`}
      >
        <div className={`time ${item.dueTime ? '' : 'empty'}`}>{item.dueTime || '•'}</div>
        <button
          onClick={(e) => !isTempDone && handleCompleteTask(e, item)}
          onPointerDown={(e) => e.stopPropagation()}
          className={`icon task-check ${isTempDone ? 'done-icon' : ''} transition-colors cursor-pointer`}
        >
          <TaskIcon checked={isTempDone} />
        </button>
        <div className="row-main">
          <div className="row-title">
            {/* ID 049: ícone de recorrência antes do título. */}
            {item.recurrence ? <RecurrenceIcon /> : null}
            {item.title}
          </div>
          <div className="meta">
            {isOverdue && <span className="text-red-500 font-bold">Atrasado</span>}
            {item.status === 'doing' && <span className="text-violet-500 font-bold">Foco</span>}
            {getFolderName(item.folderId) && (
              <span className={`badge ${styleType}-badge`}>{getFolderName(item.folderId)}</span>
            )}
            {item.tags.map(t => <span key={t}>#{t}</span>)}
          </div>
        </div>
        <button className="more" onClick={(e) => {
          e.stopPropagation();
          setSingleSelection(item.id);
        }}>⋯</button>
      </TaskArticle>
    )
  }

  const renderEvent = (event: CalendarEvent) => {
    const isPast = new Date(event.start) < now
    return (
      <article
        key={event.id}
        onClick={() => setOpenEvent(event)}
        className={`row event cursor-pointer ${isPast ? 'done' : ''}`}
      >
        <div className="time">{formatTime(event.start) || 'o dia'}</div>
        <div className="icon">
          <EventIcon />
        </div>
        <div className="row-main">
          <div className="row-title">{event.title}</div>
          {/* ID 041: sem texto "Agenda"/"finalizado" — ícone e esmaecimento já comunicam o estado. */}
          <div className="meta">
            {isToday && event.start.startsWith(tomorrow) ? <span>amanhã</span> : null}
          </div>
        </div>
        <button className="more" onClick={(e) => {
          e.stopPropagation();
          setOpenEvent(event);
        }}>⋯</button>
      </article>
    )
  }

  const selectedLabel = isToday
    ? now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
    : new Date(selectedDay + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
  const headingLabel = isToday ? 'Hoje' : new Date(selectedDay + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })

  const listEmpty = dayEvents.length === 0 && visibleItems.length === 0

  return (
    <div className="today-v3-layout flex w-full flex-col lg:h-[calc(100vh-8rem)]">
      <section className="board flex-1 mx-4 mb-4 lg:mx-0 lg:mb-0">
        <aside className="sidebar hidden lg:grid">
          <div className="month-top">
            <b>{now.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</b>
            <span>{isToday ? 'Hoje' : headingLabel}</span>
          </div>

          <div className="calendar">
            <div className="calendar-title">
              <b>Calendário</b>
              <span>mês</span>
            </div>
            <div className="week">
              <span>S</span><span>T</span><span>Q</span><span>Q</span><span>S</span><span>S</span><span>D</span>
            </div>
            <div className="days">
              {miniDays.map((d) => (
                <button
                  type="button"
                  key={d.key}
                  onClick={() => selectDay(d.key)}
                  className={`day${d.inMonth ? '' : ' out'}${d.key === selectedDay ? ' active' : ''}${d.key === today && d.key !== selectedDay ? ' today' : ''}${datesWithContent.has(d.key) ? ' has-items' : ''}`}
                >
                  {String(d.day).padStart(2, '0')}
                </button>
              ))}
            </div>
          </div>

          {/* ID 053: entradas principais Inbox / Hoje / Próximos. */}
          <nav className="sidebar-list">
            <Link href="/inbox" className="side-row cursor-pointer">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2"><path d="M3 12h5l2 3h4l2-3h5"/><path d="M5 5h14v14H5z"/></svg>
              <span>Inbox</span>
              <span className="count">{inboxCount}</span>
            </Link>
            <button
              type="button"
              onClick={() => selectDay(today)}
              className={`side-row cursor-pointer${isToday ? ' active' : ''}`}
            >
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
              <span>Hoje</span>
              <span className="count">{todayCount}</span>
            </button>
            <Link href="/upcoming" className="side-row cursor-pointer">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg>
              <span>Próximos</span>
              <span className="count">{upcomingCount}</span>
            </Link>
          </nav>

          {/* ID 053: tags presentes na lista atual, como filtro. */}
          {tagsInList.length > 0 && (
            <div className="tags-filter">
              <div className="context-title">Tags</div>
              <div className="tag-chips">
                {tagsInList.map((t) => (
                  <button
                    type="button"
                    key={t}
                    onClick={() => setActiveTag(activeTag === t ? null : t)}
                    className={`tag-chip${activeTag === t ? ' active' : ''}`}
                  >
                    #{t}
                  </button>
                ))}
              </div>
            </div>
          )}
        </aside>

        <section className="center">
          <div className="center-head">
            <div className="center-title-inline">
              <h1>{headingLabel}</h1>
              <span>{selectedLabel}</span>
            </div>
            {/* ID 048: só aparece quando há tarefas atrasadas. */}
            {overdueItems.length > 0 && (
              <button type="button" className="reschedule-btn" onClick={() => void handleRescheduleOverdue()}>
                <RecurrenceIcon className="h-4 w-4" />
                Reagendar para hoje
              </button>
            )}
          </div>

          <div className="content-scroll">
            <div className="list">
              {listEmpty ? (
                <div className="p-8 text-center text-sm text-gray-500 font-medium">
                  {activeTag ? `Nenhum item com #${activeTag}.` : isToday ? 'Tudo limpo por hoje!' : 'Nada neste dia.'}
                </div>
              ) : (
                <>
                  {dayEvents.map(renderEvent)}
                  {visibleItems.map(item => renderTask(item, item.dueDate ? item.dueDate < today : false))}
                </>
              )}
            </div>
          </div>
        </section>
      </section>

      {openEvent && (
        <EventSheet
          event={openEvent}
          onSaved={() => setOpenEvent(null)}
          onDeleted={() => setOpenEvent(null)}
          onClose={() => setOpenEvent(null)}
        />
      )}
    </div>
  )
}
