'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { CalendarEvent, Item } from '@doit/types'
import { toLocalDateKey } from '@doit/core'
import {
  deleteCalendarEvent,
  updateCalendarEvent,
  useCalendarEvents,
} from '@/hooks/use-calendar-events'
import { CalendarGrid } from '@/components/ui/calendar-grid'
import { useUI } from '@/store/ui'
import { useToast } from '@/components/ui/toast'

type Props = {
  items: Item[]
  compactSide?: boolean
}

const MONTH_SHORT = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
]
const MONTH_RANGE = 24

function buildMonthList(baseYear: number, baseMonth: number) {
  const list: Array<{ year: number; month: number; key: string }> = []
  for (let offset = -MONTH_RANGE; offset <= MONTH_RANGE; offset++) {
    const d = new Date(baseYear, baseMonth + offset, 1)
    list.push({
      year: d.getFullYear(),
      month: d.getMonth(),
      key: `${d.getFullYear()}-${d.getMonth()}`,
    })
  }
  return list
}

export function CalendarBoard({ items, compactSide = false }: Props) {
  const today = new Date()
  const todayKey = toLocalDateKey(today)
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState(todayKey)
  const [showItems, setShowItems] = useState(true)
  const [showEvents, setShowEvents] = useState(true)
  const [openEvent, setOpenEvent] = useState<CalendarEvent | null>(null)
  const carouselRef = useRef<HTMLDivElement | null>(null)
  const { setSelectedItemId } = useUI()

  const { from, to } = useMemo(() => {
    const start = new Date(year, month, 1)
    const end = new Date(year, month + 1, 0, 23, 59, 59)
    return { from: start.toISOString(), to: end.toISOString() }
  }, [year, month])

  const { events } = useCalendarEvents(from, to)

  const activeItems = (items || []).filter(
    (item) => item.status !== 'archived' && item.status !== 'done',
  )

  const todayYear = today.getFullYear()
  const todayMonth = today.getMonth()
  const monthList = useMemo(() => buildMonthList(todayYear, todayMonth), [todayYear, todayMonth])
  const stripRef = useRef<HTMLDivElement | null>(null)
  const monthRefs = useRef<Map<string, HTMLButtonElement>>(new Map())

  function scrollToMonth(year: number, month: number, behavior: ScrollBehavior = 'smooth') {
    const el = monthRefs.current.get(`${year}-${month}`)
    const container = stripRef.current
    if (!el || !container) return
    const offset = el.offsetLeft - container.clientWidth / 2 + el.clientWidth / 2
    container.scrollTo({ left: offset, behavior })
  }

  useEffect(() => {
    scrollToMonth(year, month, 'auto')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    scrollToMonth(year, month)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, month])

  function goToToday() {
    setYear(todayYear)
    setMonth(todayMonth)
    scrollToMonth(todayYear, todayMonth)
  }

  function selectMonth(y: number, m: number) {
    setYear(y)
    setMonth(m)
    scrollToMonth(y, m)
  }

  function selectDay(date: string) {
    setSelectedDate(date)
    if (!compactSide) {
      requestAnimationFrame(() => {
        const container = carouselRef.current
        if (container) container.scrollTo({ left: container.clientWidth, behavior: 'smooth' })
      })
    }
  }

  function selectedItemsForDay() {
    return activeItems.filter(
      (item) => item.dueDate === selectedDate || item.scheduledDate === selectedDate,
    )
  }

  function selectedEventsForDay() {
    return events
      .filter((event) => event.start.slice(0, 10) === selectedDate)
      .sort((a, b) => a.start.localeCompare(b.start))
  }

  const selectedItems = selectedItemsForDay()
  const selectedEvents = selectedEventsForDay()

  const filterButtons = (
    <>
      <button
        type="button"
        onClick={() => setShowItems((v) => !v)}
        title="Mostrar tarefas e notas"
        className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-[10px] font-medium transition-colors ${
          showItems
            ? 'border-brand-200 bg-brand-50 text-navy-900'
            : 'border-ui-border bg-white text-navy-300 hover:text-navy-700'
        }`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
        Itens
      </button>
      <button
        type="button"
        onClick={() => setShowEvents((v) => !v)}
        title="Mostrar eventos do Google"
        className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-[10px] font-medium transition-colors ${
          showEvents
            ? 'border-teal-200 bg-teal-50 text-navy-900'
            : 'border-ui-border bg-white text-navy-300 hover:text-navy-700'
        }`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
        Eventos
      </button>
    </>
  )

  return (
    <div
      className={`flex flex-1 min-h-0 flex-col gap-2 overflow-hidden ${compactSide ? 'p-3' : 'px-0 pb-0 pt-2 lg:p-3'}`}
    >
      {!compactSide && (
        <div className="flex shrink-0 items-center gap-2 lg:hidden">
          <button
            onClick={goToToday}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-ui-border bg-white text-navy-700 shadow-cool-sm transition-colors hover:bg-surface-soft"
            title="Voltar para hoje"
            aria-label="Voltar para hoje"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <rect x="3" y="5" width="18" height="16" rx="2" />
              <path strokeLinecap="round" d="M3 9h18M8 3v4M16 3v4" />
              <circle cx="12" cy="14" r="1.5" fill="currentColor" stroke="none" />
            </svg>
          </button>
          <div
            ref={stripRef}
            className="flex flex-1 items-center gap-1.5 overflow-x-auto scroll-smooth pb-1 [&::-webkit-scrollbar]:hidden"
            style={{ scrollbarWidth: 'none' }}
          >
            {monthList.map((m) => {
              const isCurrent = m.year === todayYear && m.month === todayMonth
              const isSelected = m.year === year && m.month === month
              return (
                <button
                  key={m.key}
                  ref={(el) => {
                    if (el) monthRefs.current.set(m.key, el)
                    else monthRefs.current.delete(m.key)
                  }}
                  onClick={() => selectMonth(m.year, m.month)}
                  className={`flex shrink-0 flex-col items-center justify-center rounded-lg border px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wide transition-colors ${
                    isSelected
                      ? 'border-brand-500 bg-brand-600 text-white'
                      : isCurrent
                        ? 'border-brand-300 bg-brand-50 text-navy-900'
                        : 'border-ui-border bg-white text-navy-500 hover:text-navy-900'
                  }`}
                >
                  <span className="text-[9px] opacity-70">{m.year}</span>
                  <span className="text-[12px]">{MONTH_SHORT[m.month]}</span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <div className="hidden flex-1 min-h-0 lg:flex">
        <CalendarGrid
          items={showItems ? activeItems : []}
          events={showEvents ? events : []}
          year={year}
          month={month}
          onYearChange={setYear}
          onMonthChange={setMonth}
          onDayClick={selectDay}
          onEventClick={setOpenEvent}
          selectedDate={selectedDate}
          headerControls={filterButtons}
          compact={compactSide}
          fillHeight={!compactSide}
        />
      </div>

      <div
        ref={carouselRef}
        className="flex flex-1 snap-x snap-mandatory overflow-x-auto scroll-smooth lg:hidden [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: 'none' }}
      >
        <section className="flex min-w-full snap-start flex-col pr-2">
          <CalendarGrid
            items={showItems ? activeItems : []}
            events={showEvents ? events : []}
            year={year}
            month={month}
            onYearChange={setYear}
            onMonthChange={setMonth}
            onDayClick={selectDay}
            onEventClick={setOpenEvent}
            selectedDate={selectedDate}
            headerControls={filterButtons}
            hideMobileNav
            fillHeight
          />
        </section>
        <section className="flex min-w-full snap-start flex-col pl-2">
          <DayList
            date={selectedDate}
            items={showItems ? selectedItems : []}
            events={showEvents ? selectedEvents : []}
            onItemClick={setSelectedItemId}
            onEventClick={setOpenEvent}
          />
        </section>
      </div>

      {openEvent ? (
        <EventSheet
          event={openEvent}
          onSaved={setOpenEvent}
          onDeleted={() => setOpenEvent(null)}
          onClose={() => setOpenEvent(null)}
        />
      ) : null}
    </div>
  )
}

function formatDate(dateStr: string) {
  const d = new Date(`${dateStr}T12:00:00`)
  return d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
}

function formatTime(dt: string, allDay: boolean) {
  if (allDay) return 'Dia todo'
  return new Date(dt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function DayList({
  date,
  items,
  events,
  onItemClick,
  onEventClick,
}: {
  date: string
  items: Item[]
  events: CalendarEvent[]
  onItemClick: (id: string) => void
  onEventClick: (event: CalendarEvent) => void
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-ui-border bg-white p-3 shadow-cool-sm">
      <div className="mb-3 shrink-0 border-b border-ui-border-soft pb-3">
        <h2 className="text-lg font-bold capitalize text-navy-900">{formatDate(date)}</h2>
        <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-wide text-navy-300">
          {items.length} item(ns) / {events.length} evento(s)
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pb-2">
        <section>
          <h3 className="mb-2 font-mono text-[10px] font-bold uppercase tracking-wide text-navy-300">
            Eventos
          </h3>
          {events.length === 0 ? (
            <p className="rounded-lg border border-dashed border-ui-border-strong px-3 py-3 text-[13px] text-navy-300">
              Nenhum evento para este dia.
            </p>
          ) : (
            <div className="space-y-1.5">
              {events.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => onEventClick(event)}
                  className="flex w-full items-center gap-3 rounded-lg border border-ui-border bg-white px-3 py-2 text-left shadow-cool-sm transition-colors hover:bg-surface-soft"
                >
                  <span className="h-9 w-1 shrink-0 rounded-full bg-brand-500" />
                  <span className="w-16 shrink-0 font-mono text-[11px] font-semibold text-navy-500">
                    {formatTime(event.start, event.allDay)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-semibold text-navy-900">
                      {event.title}
                    </span>
                    {!event.allDay ? (
                      <span className="block truncate font-mono text-[11px] text-navy-300">
                        Termina {formatTime(event.end, false)}
                      </span>
                    ) : null}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        <section>
          <h3 className="mb-2 font-mono text-[10px] font-bold uppercase tracking-wide text-navy-300">
            Itens
          </h3>
          {items.length === 0 ? (
            <p className="rounded-lg border border-dashed border-ui-border-strong px-3 py-3 text-[13px] text-navy-300">
              Nenhum item para este dia.
            </p>
          ) : (
            <div className="space-y-1.5">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onItemClick(item.id)}
                  className="w-full rounded-lg border border-ui-border bg-white px-3 py-2 text-left shadow-cool-sm transition-colors hover:bg-surface-soft"
                >
                  <p className="truncate text-[14px] font-semibold text-navy-900">{item.title}</p>
                  <p className="mt-0.5 truncate font-mono text-[11px] text-navy-300">
                    {item.complexity}
                    {item.tags.length > 0 ? ` / #${item.tags[0]}` : ''}
                  </p>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function toTimeInput(dt: string, allDay: boolean) {
  if (allDay) return '09:00'
  const date = new Date(dt)
  if (Number.isNaN(date.getTime())) return '09:00'
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

function buildDateTime(date: string, time: string) {
  return new Date(`${date}T${time}:00`).toISOString()
}

function EventSheet({
  event,
  onSaved,
  onDeleted,
  onClose,
}: {
  event: CalendarEvent
  onSaved: (event: CalendarEvent) => void
  onDeleted: () => void
  onClose: () => void
}) {
  const { toast } = useToast()
  const [title, setTitle] = useState(event.title)
  const [description, setDescription] = useState(event.description ?? '')
  const [allDay, setAllDay] = useState(event.allDay)
  const [date, setDate] = useState(event.start.slice(0, 10))
  const [endDate, setEndDate] = useState(event.end.slice(0, 10) || event.start.slice(0, 10))
  const [startTime, setStartTime] = useState(toTimeInput(event.start, event.allDay))
  const [endTime, setEndTime] = useState(toTimeInput(event.end, event.allDay))
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleSubmit(submitEvent: React.FormEvent) {
    submitEvent.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    try {
      const saved = await updateCalendarEvent(event.id, {
        title: title.trim(),
        description,
        allDay,
        start: allDay ? date : buildDateTime(date, startTime),
        end: allDay ? endDate : buildDateTime(endDate, endTime),
      })
      onSaved(saved)
      toast('Evento atualizado.', 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao editar evento.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm('Excluir este evento tambem do Google Calendar?')) return
    setDeleting(true)
    try {
      await deleteCalendarEvent(event.id)
      toast('Evento excluido.', 'success')
      onDeleted()
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao excluir evento.', 'error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end bg-navy-900/35 p-3 backdrop-blur-sm sm:items-center sm:justify-center"
      role="dialog"
      aria-modal="true"
      onClick={(clickEvent) => {
        if (clickEvent.target === clickEvent.currentTarget) onClose()
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full rounded-2xl border border-ui-border bg-white p-4 shadow-cool-lg sm:max-w-md"
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-bold uppercase tracking-wide text-brand-600">
              {event.source === 'google' ? 'Google Calendar' : 'Evento'}
            </p>
            <h2 className="mt-1 text-xl font-bold text-navy-900">Editar evento</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-2 py-1 text-lg leading-none text-navy-300 hover:bg-surface-soft hover:text-navy-700"
            aria-label="Fechar evento"
          >
            x
          </button>
        </div>

        <div className="space-y-3 text-[14px] text-navy-700">
          <label className="block">
            <span className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-wide text-navy-300">
              Titulo
            </span>
            <input
              value={title}
              onChange={(inputEvent) => setTitle(inputEvent.target.value)}
              className="h-10 w-full rounded-lg border border-ui-border px-3 text-sm outline-none focus:ring-2 focus:ring-brand-100"
            />
          </label>

          <label className="flex items-center gap-2 font-mono text-[11px] font-semibold text-navy-500">
            <input
              type="checkbox"
              checked={allDay}
              onChange={(inputEvent) => setAllDay(inputEvent.target.checked)}
              className="h-4 w-4 rounded border-ui-border"
            />
            Dia todo
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-wide text-navy-300">
                Inicio
              </span>
              <input
                type="date"
                value={date}
                onChange={(inputEvent) => {
                  setDate(inputEvent.target.value)
                  if (endDate < inputEvent.target.value) setEndDate(inputEvent.target.value)
                }}
                className="h-10 w-full rounded-lg border border-ui-border px-3 text-sm outline-none focus:ring-2 focus:ring-brand-100"
              />
            </label>
            <label className="block">
              <span className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-wide text-navy-300">
                Fim
              </span>
              <input
                type="date"
                value={endDate}
                min={date}
                onChange={(inputEvent) => setEndDate(inputEvent.target.value)}
                className="h-10 w-full rounded-lg border border-ui-border px-3 text-sm outline-none focus:ring-2 focus:ring-brand-100"
              />
            </label>
          </div>

          {!allDay ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-wide text-navy-300">
                  Hora inicio
                </span>
                <input
                  type="time"
                  value={startTime}
                  onChange={(inputEvent) => setStartTime(inputEvent.target.value)}
                  className="h-10 w-full rounded-lg border border-ui-border px-3 text-sm outline-none focus:ring-2 focus:ring-brand-100"
                />
              </label>
              <label className="block">
                <span className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-wide text-navy-300">
                  Hora fim
                </span>
                <input
                  type="time"
                  value={endTime}
                  onChange={(inputEvent) => setEndTime(inputEvent.target.value)}
                  className="h-10 w-full rounded-lg border border-ui-border px-3 text-sm outline-none focus:ring-2 focus:ring-brand-100"
                />
              </label>
            </div>
          ) : null}

          <label className="block">
            <span className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-wide text-navy-300">
              Descricao
            </span>
            <textarea
              value={description}
              onChange={(inputEvent) => setDescription(inputEvent.target.value)}
              rows={4}
              className="w-full resize-none rounded-lg border border-ui-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-brand-100"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap justify-between gap-2">
          <button
            type="button"
            onClick={handleDelete}
            disabled={saving || deleting}
            className="h-10 rounded-lg border border-red-200 px-3 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
          >
            {deleting ? 'Excluindo...' : 'Excluir'}
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving || deleting}
              className="h-10 rounded-lg border border-ui-border px-3 text-sm font-semibold text-navy-500 transition-colors hover:bg-surface-soft disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving || deleting || !title.trim()}
              className="h-10 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
