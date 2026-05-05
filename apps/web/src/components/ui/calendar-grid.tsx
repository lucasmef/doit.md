'use client'

import { useState } from 'react'
import type { Item } from '@clarity/types'

type Props = {
  items: Item[]
  onDayClick?: (date: string) => void
  selectedDate?: string
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfWeek(year: number, month: number) {
  const day = new Date(year, month, 1).getDay()
  return day === 0 ? 6 : day - 1 // segunda = 0
}

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export function CalendarGrid({ items, onDayClick, selectedDate }: Props) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfWeek(year, month)
  const todayStr = today.toISOString().slice(0, 10)

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }

  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  function dayStr(d: number) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }

  function itemsForDay(d: number) {
    const ds = dayStr(d)
    return items.filter((i) => i.dueDate === ds || i.scheduledDate === ds)
  }

  const cells = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]

  return (
    <div className="select-none">
      {/* Navegação */}
      <div className="flex items-center justify-between mb-4">
        <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-sm font-semibold text-slate-800">
          {MONTHS[month]} {year}
        </h2>
        <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Cabeçalho dias da semana */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center text-[10px] font-semibold text-slate-400 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Grade */}
      <div className="grid grid-cols-7 gap-px bg-slate-100 rounded-xl overflow-hidden border border-slate-100">
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} className="bg-white h-14" />

          const ds = dayStr(day)
          const dayItems = itemsForDay(day)
          const isToday = ds === todayStr
          const isSelected = ds === selectedDate

          return (
            <button
              key={ds}
              onClick={() => onDayClick?.(ds)}
              className={`bg-white h-14 p-1 flex flex-col items-start hover:bg-slate-50 transition-colors ${isSelected ? 'ring-2 ring-inset ring-brand-400' : ''}`}
            >
              <span
                className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-0.5 ${
                  isToday ? 'bg-brand-600 text-white' : 'text-slate-700'
                }`}
              >
                {day}
              </span>
              <div className="flex flex-wrap gap-0.5 overflow-hidden max-h-5">
                {dayItems.slice(0, 3).map((item) => (
                  <span
                    key={item.id}
                    className="w-1.5 h-1.5 rounded-full bg-brand-400 shrink-0"
                    title={item.title}
                  />
                ))}
                {dayItems.length > 3 && (
                  <span className="text-[8px] text-slate-400">+{dayItems.length - 3}</span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
