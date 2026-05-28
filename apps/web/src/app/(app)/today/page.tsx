'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useItems } from '@/hooks/use-items'
import { useCalendarEvents } from '@/hooks/use-calendar-events'
import { useUI } from '@/store/ui'
import { isOverdue, isToday, toLocalDateKey } from '@doit/core'
import type { CalendarEvent, Item, ItemStatus } from '@doit/types'

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
  return null
}

function PlusIcon({ className = 'h-4 w-4' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
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
  const { setSingleSelection, openCapture } = useUI()
  
  const today = toLocalDateKey()
  
  const agendaEvents = useMemo(() => {
    return events.filter(e => e.start.startsWith(today)).sort((a, b) => a.start.localeCompare(b.start))
  }, [events, today])
  
  const todayItems = useMemo(() => {
    return items.filter(i => (i.dueDate === today || i.scheduledDate === today) && i.status !== 'done')
  }, [items, today])
  
  const priorityItems = useMemo(() => {
    return items.filter(i => i.status === 'doing' || (i.dueDate && i.dueDate < today && i.status !== 'done'))
  }, [items, today])
  
  const noDateItems = useMemo(() => {
    return items.filter(i => !i.dueDate && !i.scheduledDate && i.status !== 'done' && i.status !== 'archived').slice(0, 5)
  }, [items])
  
  const doneItems = useMemo(() => {
    return items.filter(i => i.status === 'done').slice(0, 10)
  }, [items])
  
  if (itemsLoading || eventsLoading) {
    return <div className="flex h-[calc(100vh-136px)] items-center justify-center font-mono text-sm text-navy-500">carregando today...</div>
  }

  return (
    <main className="grid min-h-[calc(100vh-136px)] grid-cols-1">
      <section className="relative flex min-h-0 flex-col overflow-hidden rounded-[28px] border border-white/70 bg-white/78 p-5 shadow-[0_1px_0_rgba(255,255,255,.7)_inset,0_-1px_0_rgba(15,35,66,.04)_inset,0_18px_40px_-16px_rgba(15,35,66,.18),0_4px_12px_rgba(15,35,66,.06)] backdrop-blur-[20px]">
        {/* Glow behind */}
        <div className="pointer-events-none absolute -right-[160px] -top-[160px] h-[420px] w-[420px] rounded-full opacity-72 blur-[20px]" style={{ background: 'radial-gradient(circle at 30% 30%, rgba(123,91,255,.30), transparent 62%), radial-gradient(circle at 70% 70%, rgba(40,199,183,.28), transparent 62%)' }} />
        
        <div className="relative z-10 flex min-h-[calc(100vh-176px)] flex-1 flex-col overflow-hidden rounded-[26px] bg-white/50">
          <div className="overflow-auto px-6 py-6 md:px-8 md:py-7">
            
            {/* AGENDA SECTION */}
            <section className="mb-8">
              <div className="mb-3 flex items-center gap-2">
                <div className="inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.14em] text-navy-500">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-500 shadow-[0_0_8px_rgba(40,199,183,.55)]" /> Agenda de hoje
                </div>
                <div className="font-mono text-[11px] font-semibold text-navy-300">{agendaEvents.length + todayItems.length} itens</div>
                <div className="h-px flex-1 bg-[linear-gradient(90deg,rgba(15,35,66,.10),transparent_85%)]" />
              </div>
              
              {agendaEvents.map(event => (
                <article key={event.id} onClick={() => {}} className="group relative mb-2.5 grid cursor-pointer grid-cols-[70px_28px_minmax(0,1fr)_auto] items-center gap-3 rounded-[17px] border border-navy-900/[0.06] bg-white/60 p-4 transition-all hover:-translate-y-[1px] hover:border-navy-900/10 hover:bg-white/90 md:grid-cols-[88px_30px_minmax(0,1fr)_auto]">
                  <div className="whitespace-nowrap rounded-[10px] border border-navy-900/[0.08] bg-white px-2 py-1.5 text-center font-mono text-xs font-bold text-navy-900 md:text-[13px]">{formatTime(event.start) || 'o dia'}</div>
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] bg-[linear-gradient(135deg,#2F6BFF,#7B5BFF)] text-white shadow-[0_3px_10px_rgba(47,107,255,.25)]">
                    <EventIcon />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[15px] font-bold leading-snug tracking-tight text-navy-900 md:text-[16px]">{event.title}</div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 font-mono text-[11px] text-navy-500">
                      <span className="rounded-full bg-[#2F6BFF]/10 px-2 py-0.5 font-bold text-[#2F6BFF]">Google Calendar</span>
                    </div>
                  </div>
                  <div className="hidden whitespace-nowrap rounded-full bg-navy-900/[0.05] px-2.5 py-1.5 font-mono text-[11px] font-bold text-navy-500 md:block">agenda</div>
                </article>
              ))}
              
              {todayItems.map(item => (
                <article key={item.id} onClick={() => setSingleSelection(item.id)} className="group relative mb-2.5 grid cursor-pointer grid-cols-[70px_28px_minmax(0,1fr)_auto] items-center gap-3 rounded-[17px] border border-brand-500/20 bg-brand-500/[0.07] p-4 transition-all hover:-translate-y-[1px] hover:bg-brand-500/10 md:grid-cols-[88px_30px_minmax(0,1fr)_auto]">
                  <div className="absolute bottom-3 left-[-1px] top-3 w-[3px] rounded-r-[3px] bg-[linear-gradient(180deg,#2F6BFF,#28C7B7)]" />
                  <div className="whitespace-nowrap rounded-[10px] border border-navy-900 bg-navy-900 px-2 py-1.5 text-center font-mono text-xs font-bold text-white md:text-[13px]">hoje</div>
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] border-[1.5px] border-navy-300 bg-white text-white">
                    <TaskIcon />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[15px] font-bold leading-snug tracking-tight text-navy-900 md:text-[16px]">{item.title}</div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 font-mono text-[11px] text-navy-500">
                      {item.tags.map(t => <span key={t} className="rounded-full bg-navy-900/[0.05] px-2 py-0.5 font-bold">#{t}</span>)}
                    </div>
                  </div>
                  <div className="hidden whitespace-nowrap rounded-full bg-navy-900 px-2.5 py-1.5 font-mono text-[11px] font-bold text-white md:block">agora</div>
                </article>
              ))}
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
                
                {priorityItems.map(item => (
                  <article key={item.id} onClick={() => setSingleSelection(item.id)} className="group relative mb-2.5 grid cursor-pointer grid-cols-[70px_28px_minmax(0,1fr)_auto] items-center gap-3 rounded-[17px] border border-navy-900/[0.06] bg-white/60 p-4 transition-all hover:-translate-y-[1px] hover:border-navy-900/10 hover:bg-white/90 md:grid-cols-[88px_30px_minmax(0,1fr)_auto]">
                    <div className="whitespace-nowrap rounded-[10px] border border-navy-900/[0.08] bg-white px-2 py-1.5 text-center font-mono text-xs font-bold text-navy-900 md:text-[13px]">{item.status === 'doing' ? 'agora' : item.dueDate && item.dueDate < today ? 'atrasado' : 'prioridade'}</div>
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] border-[1.5px] border-navy-300 bg-white text-white">
                      <TaskIcon />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[15px] font-bold leading-snug tracking-tight text-navy-900 md:text-[16px]">{item.title}</div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 font-mono text-[11px] text-navy-500">
                        {item.status === 'doing' && <span className="rounded-full bg-violet-500/10 px-2 py-0.5 font-bold text-violet-600">em foco</span>}
                        {item.dueDate && item.dueDate < today && <span className="rounded-full bg-red-500/10 px-2 py-0.5 font-bold text-red-600">atrasado</span>}
                        {item.tags.map(t => <span key={t} className="rounded-full bg-navy-900/[0.05] px-2 py-0.5 font-bold">#{t}</span>)}
                      </div>
                    </div>
                    <div className="hidden whitespace-nowrap rounded-full bg-navy-900/[0.05] px-2.5 py-1.5 font-mono text-[11px] font-bold text-navy-500 md:block">{item.status === 'doing' ? 'em foco' : 'aberto'}</div>
                  </article>
                ))}
              </section>
            )}

            {/* SEM HORARIO / NO DATE SECTION */}
            <section className="mb-8">
              <div className="mb-3 flex items-center gap-2">
                <div className="inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.14em] text-navy-500">
                  Sem data definida
                </div>
                <div className="font-mono text-[11px] font-semibold text-navy-300">{noDateItems.length} itens abertos</div>
                <div className="h-px flex-1 bg-[linear-gradient(90deg,rgba(15,35,66,.10),transparent_85%)]" />
              </div>
              
              {noDateItems.map(item => (
                <article key={item.id} onClick={() => setSingleSelection(item.id)} className="group relative mb-2.5 grid cursor-pointer grid-cols-[70px_28px_minmax(0,1fr)_auto] items-center gap-3 rounded-[17px] border border-navy-900/[0.06] bg-white/60 p-4 transition-all hover:-translate-y-[1px] hover:border-navy-900/10 hover:bg-white/90 md:grid-cols-[88px_30px_minmax(0,1fr)_auto]">
                  <div className="whitespace-nowrap rounded-[10px] border border-navy-900/[0.08] bg-white px-2 py-1.5 text-center font-mono text-xs font-bold text-navy-900 md:text-[13px]">livre</div>
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] border-[1.5px] border-navy-300 bg-white text-white">
                    <TaskIcon />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[15px] font-bold leading-snug tracking-tight text-navy-900 md:text-[16px]">{item.title}</div>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 font-mono text-[11px] text-navy-500">
                      {item.tags.map(t => <span key={t} className="rounded-full bg-navy-900/[0.05] px-2 py-0.5 font-bold">#{t}</span>)}
                    </div>
                  </div>
                  <div className="hidden whitespace-nowrap rounded-full bg-navy-900/[0.05] px-2.5 py-1.5 font-mono text-[11px] font-bold text-navy-500 md:block">{item.complexity === 'note' ? 'nota' : 'aberto'}</div>
                </article>
              ))}

              <div onClick={() => openCapture('task')} className="group grid cursor-pointer grid-cols-[70px_28px_1fr_auto] items-center gap-3 rounded-[17px] border-[1.5px] border-dashed border-navy-900/15 bg-transparent p-4 text-[13px] text-navy-500 transition-all hover:border-[#2F6BFF] hover:bg-white/40 hover:text-[#2F6BFF] md:grid-cols-[88px_30px_1fr_auto]">
                <div className="text-center font-mono text-xs font-bold md:text-[13px]">+</div>
                <div className="flex h-7 w-7 items-center justify-center rounded-[9px] bg-navy-900/[0.06]">
                  <PlusIcon />
                </div>
                <div className="font-medium">Adicionar item rápido...</div>
                <div className="hidden rounded-[5px] bg-navy-900/[0.04] px-1.5 py-0.5 font-mono text-[10px] text-navy-300 md:block">N</div>
              </div>
            </section>
            
            {/* DONE SECTION */}
            {doneItems.length > 0 && (
              <section>
                <div className="mb-3 flex items-center gap-2">
                  <div className="inline-flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-[0.14em] text-navy-500">
                    <span className="h-1.5 w-1.5 rounded-full bg-navy-300" /> Concluídos
                  </div>
                  <div className="font-mono text-[11px] font-semibold text-navy-300">recentes</div>
                  <div className="h-px flex-1 bg-[linear-gradient(90deg,rgba(15,35,66,.10),transparent_85%)]" />
                </div>
                
                {doneItems.map(item => (
                  <article key={item.id} onClick={() => setSingleSelection(item.id)} className="group relative mb-2.5 grid cursor-pointer grid-cols-[70px_28px_minmax(0,1fr)_auto] items-center gap-3 rounded-[17px] border border-navy-900/[0.06] bg-white/60 p-4 transition-all hover:-translate-y-[1px] hover:border-navy-900/10 hover:bg-white/90 md:grid-cols-[88px_30px_minmax(0,1fr)_auto]">
                    <div className="whitespace-nowrap rounded-[10px] border border-navy-900/[0.08] bg-white px-2 py-1.5 text-center font-mono text-xs font-bold text-navy-900 md:text-[13px]">---</div>
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] border-[1.5px] border-teal-500 bg-teal-500 text-white">
                      <TaskIcon done />
                    </div>
                    <div className="min-w-0 opacity-60">
                      <div className="text-[15px] font-bold leading-snug tracking-tight text-navy-500 line-through md:text-[16px]">{item.title}</div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 font-mono text-[11px] text-navy-500">
                        {item.tags.map(t => <span key={t} className="rounded-full bg-navy-900/[0.05] px-2 py-0.5 font-bold">#{t}</span>)}
                      </div>
                    </div>
                    <div className="hidden whitespace-nowrap rounded-full bg-[#0E8A7E]/10 px-2.5 py-1.5 font-mono text-[11px] font-bold text-[#0E8A7E] md:block">done</div>
                  </article>
                ))}
              </section>
            )}

          </div>
        </div>
      </section>
    </main>
  )
}
