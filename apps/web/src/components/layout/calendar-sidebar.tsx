'use client'

import { useState } from 'react'
import { useItems } from '@/hooks/use-items'
import { useUI } from '@/store/ui'
import { CalendarGrid } from '@/components/ui/calendar-grid'
import { DayAgenda } from '@/components/ui/day-agenda'

export function CalendarSidebar() {
  const ui = useUI()
  const calendarOpen = ui?.calendarOpen
  const setCalendarOpen = ui?.setCalendarOpen
  
  const today = new Date().toISOString().slice(0, 10)
  const [selectedDate, setSelectedDate] = useState(today)
  const { items } = useItems()

  if (!calendarOpen) return null

  const activeItems = (items || []).filter((i) => i && i.status !== 'archived')

  return (
    <>
      {/* Backdrop for mobile if needed, though on desktop it's a side panel */}
      <div 
        className="fixed inset-0 z-40 bg-black/5 lg:hidden" 
        onClick={() => setCalendarOpen?.(false)} 
      />
      
      <aside className="fixed top-0 right-0 bottom-0 z-50 w-full sm:w-[420px] lg:w-[560px] xl:w-[640px] bg-white border-l border-ui-border flex flex-col shadow-2xl lg:shadow-none animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between px-5 py-3 border-b border-ui-border-soft">
          <h2 className="font-bold text-slate-900">Calendário</h2>
          <button 
            onClick={() => setCalendarOpen?.(false)}
            className="p-2 -mr-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          <CalendarGrid
            items={activeItems}
            selectedDate={selectedDate}
            onDayClick={setSelectedDate}
          />

          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
              Agenda do dia
            </h3>
            <DayAgenda date={selectedDate} items={activeItems} />
          </div>
        </div>

        <div className="p-4 border-t border-ui-border-soft bg-slate-50 text-[10px] text-slate-400">
          Dica: Pressione <kbd className="font-sans px-1 py-0.5 rounded bg-white border border-slate-200">C</kbd> para alternar o calendário.
        </div>
      </aside>
    </>
  )
}
