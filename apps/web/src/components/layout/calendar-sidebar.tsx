'use client'

import { useItems } from '@/hooks/use-items'
import { useUI } from '@/store/ui'
import { CalendarBoard } from '@/components/calendar/calendar-board'

function CloseIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
    </svg>
  )
}

function CalendarPanel({ onClose }: { onClose: () => void }) {
  const { items } = useItems()

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-ui-border px-5">
        <div>
          <h2 className="text-[15px] font-bold text-navy-900">Calendário</h2>
          <p className="font-mono text-[10px] text-navy-300">Shift+C</p>
        </div>
        <button
          onClick={onClose}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-navy-300 transition-colors hover:bg-surface-soft hover:text-navy-700"
          title="Fechar calendario"
        >
          <CloseIcon />
        </button>
      </div>

      <CalendarBoard items={items} compactSide />
    </div>
  )
}

export function CalendarSidebar() {
  const ui = useUI()
  const calendarOpen = ui?.calendarOpen
  const setCalendarOpen = ui?.setCalendarOpen

  if (!calendarOpen) return null

  return (
    <div className="fixed inset-0 z-50 pointer-events-none lg:inset-y-0 lg:left-auto lg:right-0 lg:w-[min(52vw,760px)]">
      <div
        className="pointer-events-auto flex h-full w-full flex-col overflow-hidden border-l border-ui-border bg-white shadow-cool-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <CalendarPanel onClose={() => setCalendarOpen?.(false)} />
      </div>
    </div>
  )
}
