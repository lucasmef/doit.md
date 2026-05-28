'use client'

import { useMemo, useState } from 'react'
import { useItems, updateItem } from '@/hooks/use-items'
import { useCalendarEvents } from '@/hooks/use-calendar-events'
import { usePreferences } from '@/hooks/use-preferences'
import { useUI } from '@/store/ui'
import { toLocalDateKey } from '@doit/core'
import { EventSheet } from '@/components/calendar/calendar-board'
import type { CalendarEvent, Item } from '@doit/types'

function EventIcon({ className = 'h-3.5 w-3.5' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 3v3M17 3v3M4 8h16" />
      <rect x="4" y="5" width="16" height="16" rx="2" />
    </svg>
  )
}

function TaskIcon({ done }: { done?: boolean }) {
  if (done) {
    return (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 12l5 5L20 6" />
      </svg>
    )
  }
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 12l5 5L20 6" />
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

export default function TodayFocusedPage() {
  const { items, isLoading: itemsLoading } = useItems()
  const { events, isLoading: eventsLoading } = useCalendarEvents()
  const { prefs } = usePreferences()
  const { setSingleSelection } = useUI()
  
  const [openEvent, setOpenEvent] = useState<CalendarEvent | null>(null)
  const [temporarilyDone, setTemporarilyDone] = useState<Set<string>>(new Set())
  
  const today = toLocalDateKey()
  const tomorrowDate = new Date()
  tomorrowDate.setDate(tomorrowDate.getDate() + 1)
  const tomorrow = toLocalDateKey(tomorrowDate)
  const now = new Date()
  const currentTimeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`
  const shouldShowTomorrow = currentTimeStr >= prefs.todayCalendarShowTomorrowAfterTime
  
  const agendaEvents = useMemo(() => {
    return events.filter(e => {
      if (e.start.startsWith(today)) return true
      if (shouldShowTomorrow && e.start.startsWith(tomorrow)) return true
      return false
    }).sort((a, b) => a.start.localeCompare(b.start))
  }, [events, today, tomorrow, shouldShowTomorrow])
  
  const todayItems = useMemo(() => {
    return items.filter(i => (i.dueDate === today || i.scheduledDate === today) && i.status !== 'done')
  }, [items, today])
  
  const priorityItems = useMemo(() => {
    return items.filter(i => (i.status === 'doing' || (i.dueDate && i.dueDate < today && i.status !== 'done')))
  }, [items, today])
  
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

  const handleRescheduleToday = (e: React.MouseEvent, item: Item) => {
    e.stopPropagation()
    updateItem(item.id, { dueDate: today })
  }

  return (
    <main className="flex min-h-[calc(100vh-136px)] flex-col md:grid md:grid-cols-1">
      <section className="relative flex min-h-0 flex-col overflow-hidden rounded-t-[26px] border-t border-white/70 bg-white/60 px-3 pt-4 shadow-[0_1px_0_rgba(255,255,255,.7)_inset,0_-1px_0_rgba(15,35,66,.04)_inset,0_18px_40px_-16px_rgba(15,35,66,.18),0_4px_12px_rgba(15,35,66,.06)] backdrop-blur-[20px] md:rounded-[28px] md:border md:bg-white/78 md:p-5">
        {/* Glow behind */}
        <div className="pointer-events-none absolute -right-[160px] -top-[160px] h-[420px] w-[420px] rounded-full opacity-72 blur-[20px]" style={{ background: 'radial-gradient(circle at 30% 30%, rgba(123,91,255,.30), transparent 62%), radial-gradient(circle at 70% 70%, rgba(40,199,183,.28), transparent 62%)' }} />
        
        <div className="relative z-10 flex min-h-[calc(100vh-176px)] flex-1 flex-col overflow-hidden rounded-t-[24px] bg-white/50 md:rounded-[26px]">
          <div className="overflow-auto px-4 py-5 md:px-8 md:py-7">
            
            {/* AGENDA SECTION */}
            <section className="mb-8">
              <div className="mb-3 flex items-center gap-2">
                <div className="inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.14em] text-navy-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-500 shadow-[0_0_8px_rgba(40,199,183,.55)]" /> Agenda de hoje
                </div>
                <div className="font-mono text-[11px] font-semibold text-navy-300">{agendaEvents.length + todayItems.length} itens</div>
                <div className="h-px flex-1 bg-[linear-gradient(90deg,rgba(15,35,66,.10),transparent_85%)]" />
              </div>
              
              {agendaEvents.map(event => {
                const isPast = new Date(event.start) < now
                return (
                  <article key={event.id} onClick={() => setOpenEvent(event)} className={`group relative mb-2.5 grid cursor-pointer grid-cols-[60px_28px_minmax(0,1fr)_auto] items-center gap-3 rounded-[17px] border border-navy-900/[0.06] bg-white/60 p-3.5 transition-all hover:-translate-y-[1px] hover:border-navy-900/10 hover:bg-white/90 md:grid-cols-[88px_30px_minmax(0,1fr)_auto] md:p-4 ${isPast ? 'opacity-50 grayscale hover:opacity-80' : ''}`}>
                    <div className="whitespace-nowrap rounded-[10px] border border-navy-900/[0.08] bg-white px-1.5 py-1.5 text-center font-mono text-[11px] font-bold text-navy-900 md:px-2 md:text-[13px]">{formatTime(event.start) || 'o dia'}</div>
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] bg-[linear-gradient(135deg,#2F6BFF,#7B5BFF)] text-white shadow-[0_3px_10px_rgba(47,107,255,.25)]">
                      <EventIcon />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[14px] font-bold leading-snug tracking-tight text-navy-900 md:text-[16px]">{event.title}</div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 font-mono text-[10px] text-navy-500 md:text-[11px]">
                        <span className="rounded-full bg-[#2F6BFF]/10 px-2 py-0.5 font-bold text-[#2F6BFF]">Agenda</span>
                        {event.start.startsWith(tomorrow) && <span className="rounded-full bg-amber-500/10 px-2 py-0.5 font-bold text-amber-600">amanhã</span>}
                      </div>
                    </div>
                  </article>
                )
              })}
              
              {todayItems.map(item => {
                const isTempDone = temporarilyDone.has(item.id)
                return (
                  <article key={item.id} onClick={() => !isTempDone && setSingleSelection(item.id)} className={`group relative mb-2.5 grid cursor-pointer grid-cols-[60px_28px_minmax(0,1fr)_auto] items-center gap-3 rounded-[17px] border border-brand-500/20 bg-brand-500/[0.07] p-3.5 transition-all hover:-translate-y-[1px] hover:bg-brand-500/10 md:grid-cols-[88px_30px_minmax(0,1fr)_auto] md:p-4 ${isTempDone ? 'opacity-50 pointer-events-none' : ''}`}>
                    <div className="absolute bottom-3 left-[-1px] top-3 w-[3px] rounded-r-[3px] bg-[linear-gradient(180deg,#2F6BFF,#28C7B7)]" />
                    <div className="whitespace-nowrap rounded-[10px] border border-navy-900 bg-navy-900 px-1.5 py-1.5 text-center font-mono text-[11px] font-bold text-white md:px-2 md:text-[13px]">hoje</div>
                    <button onClick={(e) => !isTempDone && handleCompleteTask(e, item)} className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] border-[1.5px] transition-colors ${isTempDone ? 'border-teal-500 bg-teal-500 text-white' : 'border-navy-300 bg-white text-navy-300 hover:border-teal-500 hover:bg-teal-500 hover:text-white'}`}>
                      <TaskIcon done={isTempDone} />
                    </button>
                    <div className="min-w-0">
                      <div className={`text-[14px] font-bold leading-snug tracking-tight text-navy-900 md:text-[16px] ${isTempDone ? 'line-through text-navy-500' : ''}`}>{item.title}</div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 font-mono text-[10px] text-navy-500 md:text-[11px]">
                        {item.tags.map(t => <span key={t} className="rounded-full bg-navy-900/[0.05] px-2 py-0.5 font-bold">#{t}</span>)}
                      </div>
                    </div>
                  </article>
                )
              })}
            </section>
            
            {/* PRIORITY SECTION */}
            {priorityItems.length > 0 && (
              <section className="mb-8">
                <div className="mb-3 flex items-center gap-2">
                  <div className="inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.14em] text-navy-500">
                    <span className="h-1.5 w-1.5 rounded-full bg-violet-500 shadow-[0_0_8px_rgba(123,91,255,.55)]" /> Prioridade
                  </div>
                  <div className="font-mono text-[11px] font-semibold text-navy-300">{priorityItems.length} itens</div>
                  <div className="h-px flex-1 bg-[linear-gradient(90deg,rgba(15,35,66,.10),transparent_85%)]" />
                </div>
                
                {priorityItems.map(item => {
                  const isOverdue = item.dueDate && item.dueDate < today
                  const isTempDone = temporarilyDone.has(item.id)
                  return (
                    <article key={item.id} onClick={() => !isTempDone && setSingleSelection(item.id)} className={`group relative mb-2.5 grid cursor-pointer grid-cols-[60px_28px_minmax(0,1fr)_auto] items-center gap-3 rounded-[17px] border border-navy-900/[0.06] bg-white/60 p-3.5 transition-all hover:-translate-y-[1px] hover:border-navy-900/10 hover:bg-white/90 md:grid-cols-[88px_30px_minmax(0,1fr)_auto] md:p-4 ${isTempDone ? 'opacity-50 pointer-events-none' : ''}`}>
                      <div className={`whitespace-nowrap rounded-[10px] border px-1.5 py-1.5 text-center font-mono text-[11px] font-bold md:px-2 md:text-[13px] ${isOverdue ? 'border-red-500/20 bg-red-50 text-red-600' : 'border-navy-900/[0.08] bg-white text-navy-900'}`}>{item.status === 'doing' ? 'agora' : isOverdue ? 'atrasado' : 'prioridade'}</div>
                      <button onClick={(e) => !isTempDone && handleCompleteTask(e, item)} className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] border-[1.5px] transition-colors ${isTempDone ? 'border-teal-500 bg-teal-500 text-white' : 'border-navy-300 bg-white text-navy-300 hover:border-teal-500 hover:bg-teal-500 hover:text-white'}`}>
                        <TaskIcon done={isTempDone} />
                      </button>
                      <div className="min-w-0">
                        <div className={`text-[14px] font-bold leading-snug tracking-tight text-navy-900 md:text-[16px] ${isTempDone ? 'line-through text-navy-500' : ''}`}>{item.title}</div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 font-mono text-[10px] text-navy-500 md:text-[11px]">
                          {item.status === 'doing' && <span className="rounded-full bg-violet-500/10 px-2 py-0.5 font-bold text-violet-600">em foco</span>}
                          {isOverdue && <span className="rounded-full bg-red-500/10 px-2 py-0.5 font-bold text-red-600">atrasado</span>}
                          {item.tags.map(t => <span key={t} className="rounded-full bg-navy-900/[0.05] px-2 py-0.5 font-bold">#{t}</span>)}
                        </div>
                      </div>
                      {isOverdue && !isTempDone && (
                        <div className="ml-auto">
                          <button onClick={(e) => handleRescheduleToday(e, item)} className="rounded-[8px] bg-navy-900/[0.05] px-2.5 py-1.5 text-xs font-bold text-navy-600 hover:bg-brand-500/10 hover:text-brand-600">
                            para hoje
                          </button>
                        </div>
                      )}
                    </article>
                  )
                })}
              </section>
            )}

          </div>
        </div>
      </section>

      {openEvent && (
        <EventSheet
          event={openEvent}
          onSaved={() => setOpenEvent(null)}
          onDeleted={() => setOpenEvent(null)}
          onClose={() => setOpenEvent(null)}
        />
      )}
    </main>
  )
}
