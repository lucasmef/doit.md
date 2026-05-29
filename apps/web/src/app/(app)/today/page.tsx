'use client'

import { useMemo, useState } from 'react'
import { useItems, updateItem } from '@/hooks/use-items'
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

function TaskIcon() {
  return (
    <svg className="h-[15px] w-[15px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4}>
      <path d="M8 12l3 3 5-6" />
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
      className={`touch-pan-y [-webkit-touch-callout:none] ${className}`}
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
  const [mobileFilter, setMobileFilter] = useState('Hoje')
  
  const today = toLocalDateKey()
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

  // Counts for sidebar
  const todayCount = todayItems.length + agendaEvents.length
  const openCount = items.filter(i => i.status !== 'done').length
  const tasksCount = items.filter(i => i.complexity === 'task' && i.status !== 'done').length
  const overdueCount = items.filter(i => i.dueDate && i.dueDate < today && i.status !== 'done').length

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

  const renderTask = (item: Item, isOverdue: boolean = false) => {
    const isTempDone = temporarilyDone.has(item.id)
    const styleType = getTaskStyle(item)
    const isSelected = selectedItemId === item.id
    
    return (
      <TaskArticle 
        key={item.id} 
        item={item} 
        disabled={isTempDone} 
        onOpen={setSingleSelection} 
        className={`row ${styleType} ${isTempDone ? 'done' : ''} ${isSelected ? 'selected' : ''}`}
      >
        <div className={`time ${item.dueTime ? '' : 'empty'}`}>{item.dueTime || '•'}</div>
        <button 
          onClick={(e) => !isTempDone && handleCompleteTask(e, item)} 
          onPointerDown={(e) => e.stopPropagation()} 
          className={`icon ${styleType}-icon ${isTempDone ? 'done-icon' : ''} transition-colors cursor-pointer`}
        >
          <TaskIcon />
        </button>
        <div className="row-main">
          <div className="row-title">{item.title}</div>
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
          <div className="meta">
            <span className="badge event-badge">Agenda</span>
            {isPast ? <span>finalizado</span> : null}
            {event.start.startsWith(tomorrow) ? <span>amanhã</span> : null}
          </div>
        </div>
        <button className="more" onClick={(e) => {
          e.stopPropagation();
          setOpenEvent(event);
        }}>⋯</button>
      </article>
    )
  }

  const allItemsEmpty = agendaEvents.length === 0 && todayItems.length === 0 && priorityItems.length === 0

  return (
    <div className="today-v3-layout flex-1 w-full h-full flex flex-col">
      <div className="mobile-filters px-4 pt-2">
        {['Hoje', 'Agenda', 'Tarefas', 'Atrasados'].map(f => (
          <div 
            key={f}
            onClick={() => setMobileFilter(f)}
            className={`mobile-filter cursor-pointer ${mobileFilter === f ? 'active' : ''}`}
          >
            {f}
          </div>
        ))}
      </div>

      <section className="board flex-1 mx-4 mb-4 lg:mx-0 lg:mb-0">
        <aside className="sidebar hidden lg:grid">
          <div className="month-top">
            <b>{now.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</b>
            <span>Hoje</span>
          </div>

          <div className="calendar">
            <div className="calendar-title">
              <b>Calendário</b>
              <span>mês</span>
            </div>
            {/* Simple static calendar representation for now */}
            <div className="week">
              <span>D</span><span>S</span><span>T</span><span>Q</span><span>Q</span><span>S</span><span>S</span>
            </div>
            <div className="days">
              <div className="day out">26</div><div className="day out">27</div><div className="day out">28</div><div className="day out">29</div><div className="day out">30</div><div className="day">01</div><div className="day">02</div>
              <div className="day">03</div><div className="day">04</div><div className="day">05</div><div className="day">06</div><div className="day has-items">07</div><div className="day">08</div><div className="day">09</div>
              <div className="day">10</div><div className="day">11</div><div className="day has-items">12</div><div className="day">13</div><div className="day">14</div><div className="day">15</div><div className="day">16</div>
              <div className="day">17</div><div className="day">18</div><div className="day">19</div><div className="day">20</div><div className="day">21</div><div className="day">22</div><div className="day">23</div>
              <div className="day">24</div><div className="day">25</div><div className="day active has-items">26</div><div className="day">27</div><div className="day">28</div><div className="day">29</div><div className="day">30</div>
              <div className="day">31</div><div className="day out">01</div><div className="day out">02</div><div className="day out">03</div><div className="day out">04</div><div className="day out">05</div><div className="day out">06</div>
            </div>
          </div>

          <nav className="sidebar-list">
            <div className="side-row active cursor-pointer">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
              <span>Hoje</span>
              <span className="count">{todayCount}</span>
            </div>
            <div className="side-row cursor-pointer">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2"><path d="M8 12l3 3 5-6"/><circle cx="12" cy="12" r="9"/></svg>
              <span>Abertos</span>
              <span className="count">{openCount}</span>
            </div>
            <div className="side-row cursor-pointer">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2"><rect x="4" y="5" width="16" height="16" rx="2"/><path d="M7 3v3M17 3v3M4 9h16"/></svg>
              <span>Agenda</span>
              <span className="count">{agendaEvents.length}</span>
            </div>
            <div className="side-row cursor-pointer">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2"><path d="M8 12l3 3 5-6"/><circle cx="12" cy="12" r="9"/></svg>
              <span>Tarefas</span>
              <span className="count">{tasksCount}</span>
            </div>
            <div className="side-row cursor-pointer">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2"><path d="M12 8v5"/><path d="M12 17h.01"/><circle cx="12" cy="12" r="9"/></svg>
              <span>Atrasados</span>
              <span className="count">{overdueCount}</span>
            </div>
          </nav>
          
          {/* Static contexts for UI parity */}
          <div className="contexts hidden xl:grid">
            <div className="context-title">Contextos</div>
            <div className="context-row"><div className="dot"></div><span>doit.md</span><span className="count">3</span></div>
            <div className="context-row"><div className="dot teal"></div><span>Loja</span><span className="count">4</span></div>
            <div className="context-row"><div className="dot pink"></div><span>Marketing</span><span className="count">2</span></div>
          </div>
        </aside>

        <section className="center">
          <div className="center-head">
            <div className="center-title-inline">
              <h1>Hoje</h1>
              <span>{now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            </div>
            <div className="filter-pills hidden md:inline-flex">
              <span className="active cursor-pointer">Todos</span>
              <span className="cursor-pointer">Agenda</span>
              <span className="cursor-pointer">Tarefas</span>
            </div>
          </div>

          <div className="content-scroll">
            <div className="list">
              {allItemsEmpty ? (
                <div className="p-8 text-center text-sm text-gray-500 font-medium">Tudo limpo por hoje!</div>
              ) : (
                <>
                  {priorityItems.map(item => renderTask(item, item.dueDate ? item.dueDate < today : false))}
                  {agendaEvents.map(renderEvent)}
                  {todayItems.map(item => renderTask(item))}
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
