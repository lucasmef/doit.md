'use client'

import { useState } from 'react'
import { useItems } from '@/hooks/use-items'
import { CalendarGrid } from '@/components/ui/calendar-grid'
import { DayAgenda } from '@/components/ui/day-agenda'

export default function CalendarPage() {
  const today = new Date().toISOString().slice(0, 10)
  const [selectedDate, setSelectedDate] = useState(today)
  const { items } = useItems()

  const activeItems = items.filter((i) => i.status !== 'archived')

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-semibold text-slate-900 mb-6">Calendário</h1>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
        {/* Grade mensal */}
        <CalendarGrid
          items={activeItems}
          selectedDate={selectedDate}
          onDayClick={setSelectedDate}
        />

        {/* Agenda do dia */}
        <DayAgenda date={selectedDate} items={activeItems} />
      </div>
    </div>
  )
}
