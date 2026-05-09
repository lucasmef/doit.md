'use client'

import { useItems } from '@/hooks/use-items'
import { CalendarBoard } from '@/components/calendar/calendar-board'

export default function CalendarPage() {
  const { items } = useItems()

  return (
    <div className="flex h-full min-h-0 flex-col">
      <CalendarBoard items={items} />
    </div>
  )
}
