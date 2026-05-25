'use client'

import { CalendarBoard } from '@/components/calendar/calendar-board'

export default function CalendarPage() {
  return (
    <div className="flex h-full min-h-0 flex-col bg-white">
      <CalendarBoard items={[]} fullscreen />
    </div>
  )
}
