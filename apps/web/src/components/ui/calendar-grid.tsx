'use client'

import { useState } from 'react'
import type { Item } from '@doit/types'

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
    return (items || []).filter((i) => i && (i.dueDate === ds || i.scheduledDate === ds))
  }

  const cells = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]

  return (
    <div className="select-none bg-surface-panel border border-ui-border-panel rounded-[12px] p-3 shadow-sm">
      {/* Navegação */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-bold text-slate-900">
          {MONTHS[month]} {year}
        </h2>
        <div className="flex items-center gap-1 bg-surface-soft p-1 rounded-xl">
          <button onClick={prevMonth} className="px-2 py-1 rounded-lg hover:bg-white hover:shadow-sm text-slate-500 text-xs font-medium transition-all">
            Anterior
          </button>
          <button onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()) }} className="px-2 py-1 rounded-lg hover:bg-white hover:shadow-sm text-slate-500 text-xs font-medium transition-all">
            Hoje
          </button>
          <button onClick={nextMonth} className="px-2 py-1 rounded-lg hover:bg-white hover:shadow-sm text-slate-500 text-xs font-medium transition-all">
            Próximo
          </button>
        </div>
      </div>

      {/* Cabeçalho dias da semana */}
      <div className="grid grid-cols-7 mb-2">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center text-[12px] font-semibold text-slate-400 py-2">
            {d.toUpperCase()}
          </div>
        ))}
      </div>

      {/* Grade */}
      <div className="grid grid-cols-7 gap-px bg-ui-border-soft border border-ui-border-soft overflow-hidden rounded-xl">
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} className="bg-white h-20 lg:h-24 xl:h-28" />

          const ds = dayStr(day)
          const dayItems = itemsForDay(day)
          const isToday = ds === todayStr
          const isSelected = ds === selectedDate

          return (
            <button
              key={ds}
              onClick={() => onDayClick?.(ds)}
              className={`bg-white h-20 lg:h-24 xl:h-28 p-1.5 flex flex-col items-start hover:bg-slate-50 transition-colors relative ${isSelected ? 'ring-2 ring-inset ring-brand-400 z-10' : ''}`}
            >
              <div className="flex justify-between w-full items-start">
                <span
                  className={`text-[13px] font-medium w-7 h-7 flex items-center justify-center rounded-full mb-1 ${
                    isToday ? 'bg-brand-600 text-white' : 'text-slate-700'
                  }`}
                >
                  {day}
                </span>
              </div>
              
              <div className="flex flex-col gap-1 w-full overflow-hidden">
                {dayItems.slice(0, 3).map((item) => {
                  let badgeClass = 'bg-slate-100 text-slate-600'
                  if (item.complexity === 'task') badgeClass = 'bg-[#e7f1ff] text-[#5a534a]'
                  if (item.complexity === 'note') badgeClass = 'bg-[#fff1df] text-[#5a534a]'
                  if (item.complexity === 'project') badgeClass = 'bg-[#f1eaff] text-[#5a534a]'
                  if (item.complexity === 'document') badgeClass = 'bg-[#e9f7ea] text-[#5a534a]'
                  
                  return (
                    <div
                      key={item.id}
                      className={`w-full truncate text-[10px] font-medium px-1.5 py-0.5 rounded-md text-left ${badgeClass}`}
                      title={item.title}
                    >
                      {item.title}
                    </div>
                  )
                })}
                {dayItems.length > 3 && (
                  <span className="text-[10px] font-medium text-slate-400 px-1">+ {dayItems.length - 3} itens</span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
