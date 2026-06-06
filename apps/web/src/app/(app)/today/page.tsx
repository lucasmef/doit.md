'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useItems, updateItem, bulkUpdateItems } from '@/hooks/use-items'
import { useCalendarEvents } from '@/hooks/use-calendar-events'
import { usePreferences } from '@/hooks/use-preferences'
import { useUI } from '@/store/ui'
import { useLongPress } from '@/hooks/use-long-press'
import { toLocalDateKey } from '@doit/core'
import { EventSheet } from '@/components/calendar/calendar-board'
import type { CalendarEvent, Item } from '@doit/types'
import { useProjects } from '@/hooks/use-projects'
import { isLooseInboxItem } from '@/lib/item-order'
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

function formatDateLabel(dateStr: string) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'short',
  })
}

// Artigo de tarefa com toque simples (abrir) + toque longo / clique-direito (menu de ações).
function TaskArticle({
  item,
  disabled,
  onOpen,
  onEdit,
  className,
  children,
}: {
  item: Item
  disabled?: boolean
  onOpen: (id: string) => void
  onEdit?: (id: string) => void
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
      // ID 039: clique simples seleciona (painel); duplo clique abre o modal de edição.
      onDoubleClick={() => {
        if (disabled) return
        onEdit?.(item.id)
      }}
      {...longPressProps}
      className={`touch-pan-y [-webkit-touch-callout:none] [-webkit-user-select:none] ${className}`}
    >
      {children}
    </article>
  )
}

export default function TodayFocusedPage() {
  const router = useRouter()
  const { items, isLoading: itemsLoading } = useItems()
  const { events, isLoading: eventsLoading } = useCalendarEvents()
  const { projects } = useProjects()
  const { prefs } = usePreferences()
  const { setQuickCaptureEditId } = useUI()

  const [openEvent, setOpenEvent] = useState<CalendarEvent | null>(null)
  // ID 039: item selecionado para o painel de detalhes à direita.
  const [panelId, setPanelId] = useState<string | null>(null)
  // O painel de detalhes só existe a partir de 1181px (igual à referência v3); abaixo
  // disso (tablet/mobile) o toque na tarefa abre direto o modal de edição.
  const [panelEnabled, setPanelEnabled] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(min-width: 1181px)')
    const sync = () => setPanelEnabled(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])
  const [temporarilyDone, setTemporarilyDone] = useState<Set<string>>(new Set())
  const today = toLocalDateKey()
  // ID 040: dia selecionado no calendário lateral (padrão = hoje).
  const [selectedDay, setSelectedDay] = useState(today)
  const [currentView, setCurrentView] = useState<'hoje' | 'inbox' | 'upcoming'>('hoje')
  // ID 053: filtro por tag da lista atual.
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const isToday = selectedDay === today

  const openItemFromToday = useCallback((id: string) => {
    const target = items.find((item) => item.id === id)
    if (target?.complexity === 'note') {
      setPanelId(null)
      setQuickCaptureEditId(null)
      router.push(`/notas/${id}`)
      return
    }
    if (panelEnabled) setPanelId(id)
    else setQuickCaptureEditId(id)
  }, [items, panelEnabled, router, setQuickCaptureEditId])

  const editItemFromToday = useCallback((id: string) => {
    const target = items.find((item) => item.id === id)
    if (target?.complexity === 'note') {
      setPanelId(null)
      setQuickCaptureEditId(null)
      router.push(`/notas/${id}`)
      return
    }
    setQuickCaptureEditId(id)
  }, [items, router, setQuickCaptureEditId])

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



  const visibleItems = useMemo(
    () => (activeTag ? dayItems.filter(i => i.tags.includes(activeTag)) : dayItems),
    [dayItems, activeTag],
  )

  const inboxItems = useMemo(
    () => items.filter((i) => i.status !== 'done' && i.status !== 'archived' && isLooseInboxItem(i)),
    [items],
  )
  const upcomingItems = useMemo(
    () =>
      items
        .filter((i) => {
          if (i.status === 'done' || i.status === 'archived') return false
          const date = i.dueDate ?? i.scheduledDate
          return Boolean(date && date > today)
        })
        .sort((a, b) => {
          const dateCompare = (a.dueDate ?? a.scheduledDate ?? '').localeCompare(
            b.dueDate ?? b.scheduledDate ?? '',
          )
          if (dateCompare !== 0) return dateCompare
          return (a.dueTime ?? '').localeCompare(b.dueTime ?? '')
        }),
    [items, today],
  )

  // ID 053: tags presentes na lista atualmente exibida (para servir de filtro).
  const tagsInList = useMemo(() => {
    const set = new Set<string>()
    const baseList = currentView === 'inbox' ? inboxItems : currentView === 'upcoming' ? upcomingItems : dayItems
    for (const it of baseList) for (const t of it.tags) set.add(t)
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [dayItems, inboxItems, upcomingItems, currentView])

  const displayedItems = currentView === 'inbox' ? (activeTag ? inboxItems.filter(i => i.tags.includes(activeTag)) : inboxItems) : currentView === 'upcoming' ? (activeTag ? upcomingItems.filter(i => i.tags.includes(activeTag)) : upcomingItems) : visibleItems;
  const displayedEvents = currentView === 'hoje' ? dayEvents : [];

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
  const inboxCount = inboxItems.length
  const todayCount = todayItems.length + agendaEvents.length
  const upcomingCount = upcomingItems.length

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

  // ID 060/063: escolher um dia (ou "Hoje") volta para a visão de dia, mantendo o
  // painel/layout — nunca redireciona para fora da página.
  const selectDay = (key: string) => {
    setSelectedDay(key)
    setActiveTag(null)
    setCurrentView('hoje')
    setPanelId(null)
  }

  const renderTask = (item: Item, isOverdue: boolean = false) => {
    const isTempDone = temporarilyDone.has(item.id)
    const styleType = getTaskStyle(item)
    const isSelected = panelId === item.id
    const hasTime = Boolean(item.dueTime)
    const date = item.dueDate ?? item.scheduledDate
    // ID 020: barra lateral por prioridade (1=alta/vermelho, 2=média/laranja, 3=baixa/amarelo, demais=neutro).
    const prioClass = item.priority && item.priority < 4 ? `prio-${item.priority}` : 'prio-0'

    return (
      <TaskArticle
        key={item.id}
        item={item}
        disabled={isTempDone}
        onOpen={openItemFromToday}
        onEdit={editItemFromToday}
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
            {currentView === 'upcoming' && date ? <span className="date-badge">{formatDateLabel(date)}</span> : null}
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
          editItemFromToday(item.id);
        }}>⋯</button>
      </TaskArticle>
    )
  }

  const renderEvent = (event: CalendarEvent) => {
    const isPast = !event.allDay && new Date(event.end ?? event.start) < now
    return (
      <article
        key={event.id}
        onClick={() => setOpenEvent(event)}
        className={`row event cursor-pointer ${isPast ? 'done' : ''}`}
      >
        <div className="time">{event.allDay ? 'Dia todo' : (formatTime(event.start) || 'o dia')}</div>
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

  const listEmpty = displayedItems.length === 0 && displayedEvents.length === 0
  const currentHeading = currentView === 'inbox' ? 'Inbox' : currentView === 'upcoming' ? 'Próximos' : headingLabel
  const currentSub = currentView === 'inbox' ? 'Itens não processados' : currentView === 'upcoming' ? 'Tarefas futuras' : selectedLabel

  // ID 039: item do painel de detalhes à direita.
  const panelItem = panelId ? items.find((i) => i.id === panelId) ?? null : null
  const panelStyleType = panelItem ? getTaskStyle(panelItem) : 'task'
  const panelTypeLabel = panelItem
    ? panelStyleType === 'personal'
      ? 'Pessoal'
      : panelItem.complexity === 'note'
        ? 'Nota'
        : 'Tarefa'
    : ''
  const panelDateLabel = panelItem?.dueDate
    ? new Date(panelItem.dueDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })
    : '—'
  const STATUS_PT: Record<string, string> = {
    inbox: 'Inbox',
    todo: 'A fazer',
    doing: 'Em foco',
    waiting: 'Aguardando',
    done: 'Concluído',
    archived: 'Arquivado',
  }

  return (
    <div className="today-v3-layout flex w-full flex-col lg:h-[calc(100vh-8rem)]">
      <section className={`board flex-1 mx-4 mb-4 lg:mx-0 lg:mb-0${panelItem ? ' has-detail' : ' no-detail'}`}>
        <aside className="sidebar hidden lg:grid">
          <div className="month-top">
            <b>{now.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</b>
            <span>{currentView === 'hoje' ? (isToday ? 'Hoje' : headingLabel) : currentHeading}</span>
          </div>

          <div className="calendar">
            <div className="calendar-title">
              <b>Calendário</b>
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
            <button type="button" onClick={() => { setCurrentView('inbox'); setActiveTag(null); setPanelId(null); }} className={`side-row cursor-pointer${currentView === 'inbox' ? ' active' : ''}`}>
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2"><path d="M3 12h5l2 3h4l2-3h5"/><path d="M5 5h14v14H5z"/></svg>
              <span>Inbox</span>
              <span className="count">{inboxCount}</span>
            </button>
            <button
              type="button"
              onClick={() => selectDay(today)}
              className={`side-row cursor-pointer${isToday && currentView === 'hoje' ? ' active' : ''}`}
            >
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
              <span>Hoje</span>
              <span className="count">{todayCount}</span>
            </button>
            <button type="button" onClick={() => { setCurrentView('upcoming'); setActiveTag(null); setPanelId(null); }} className={`side-row cursor-pointer${currentView === 'upcoming' ? ' active' : ''}`}>
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2"><path d="M5 12h14"/><path d="M13 6l6 6-6 6"/></svg>
              <span>Próximos</span>
              <span className="count">{upcomingCount}</span>
            </button>
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
              <h1>{currentHeading}</h1>
              <span>{currentSub}</span>
            </div>
            {/* ID 048: só aparece quando há tarefas atrasadas. */}
            {currentView === 'hoje' && overdueItems.length > 0 && (
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
                  {activeTag ? `Nenhum item com #${activeTag}.` : currentView === 'inbox' ? 'Inbox vazia!' : currentView === 'upcoming' ? 'Nada programado.' : isToday ? 'Tudo limpo por hoje!' : 'Nada neste dia.'}
                </div>
              ) : (
                <>
                  {displayedEvents.map(renderEvent)}
                  {displayedItems.map(item => renderTask(item, item.dueDate ? item.dueDate < today : false))}
                </>
              )}
            </div>
          </div>
        </section>

        {/* ID 082: painel de detalhes so aparece depois de selecionar um item. */}
        {panelItem ? (
          <aside className="detail hidden lg:grid">
            <>
              <div className="detail-head">
                <div className="detail-title">
                  <span className="type">{panelTypeLabel}</span>
                  <h2>{panelItem.title || 'Sem título'}</h2>
                </div>
                <button type="button" className="close" onClick={() => setPanelId(null)} aria-label="Fechar painel">
                  ×
                </button>
              </div>
              <div className="detail-scroll">
                <section className="detail-section">
                  <div className="detail-label">Detalhes</div>
                  <div className="info-grid">
                    <div className="info-row"><span>Data</span><b>{panelDateLabel}</b></div>
                    {panelItem.dueTime ? (
                      <div className="info-row"><span>Horário</span><b>{panelItem.dueTime}</b></div>
                    ) : null}
                    <div className="info-row"><span>Pasta</span><b>{getFolderName(panelItem.folderId) || 'Sem pasta'}</b></div>
                    <div className="info-row"><span>Status</span><b>{STATUS_PT[panelItem.status] ?? panelItem.status}</b></div>
                  </div>
                </section>

                {panelItem.tags.length > 0 ? (
                  <section className="detail-section">
                    <div className="detail-label">Tags</div>
                    <div className="tag-chips">
                      {panelItem.tags.map((t) => (
                        <span key={t} className="tag-chip">#{t}</span>
                      ))}
                    </div>
                  </section>
                ) : null}

                <section className="detail-section">
                  <div className="detail-label">Ações rápidas</div>
                  <div className="actions">
                    <button
                      type="button"
                      className="action primary"
                      onClick={() => updateItem(panelItem.id, { status: panelItem.status === 'done' ? 'todo' : 'done' })}
                    >
                      {panelItem.status === 'done' ? '↺ Reabrir tarefa' : '✓ Marcar como concluído'}
                    </button>
                    <button type="button" className="action" onClick={() => editItemFromToday(panelItem.id)}>
                      ✎ Editar
                    </button>
                  </div>
                </section>
              </div>
            </>
          </aside>
        ) : null}
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
