'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import type { CalendarEvent, GoogleCalendar, Item } from '@doit/types'
import { toLocalDateKey } from '@doit/core'
import {
  deleteCalendarEvent,
  createCalendarEvent,
  updateCalendarEvent,
  useCalendarEvents,
  useGoogleCalendars,
} from '@/hooks/use-calendar-events'
import { CalendarGrid } from '@/components/ui/calendar-grid'
import { useUI } from '@/store/ui'
import { useToast } from '@/components/ui/toast'
import { usePreferences, type CalendarWeekStart } from '@/hooks/use-preferences'

type Props = {
  items: Item[]
  compactSide?: boolean
  fullscreen?: boolean
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

export function CalendarBoard({ items, compactSide = false, fullscreen = false }: Props) {
  const today = new Date()
  const todayKey = toLocalDateKey(today)
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selectedDate, setSelectedDate] = useState(todayKey)
  const [showItems, setShowItems] = useState(!fullscreen)
  const [showEvents, setShowEvents] = useState(true)
  const [openEvent, setOpenEvent] = useState<CalendarEvent | null>(null)
  const [creatingEvent, setCreatingEvent] = useState(false)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [openDayDate, setOpenDayDate] = useState<string | null>(null)
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>([])
  const carouselRef = useRef<HTMLDivElement | null>(null)
  const { setSelectedItemId } = useUI()
  const { prefs, update: updatePreferences } = usePreferences()

  const { from, to } = useMemo(() => {
    const start = new Date(year, month, fullscreen ? -7 : 1)
    const end = new Date(year, month + 1, fullscreen ? 7 : 0, 23, 59, 59)
    return { from: start.toISOString(), to: end.toISOString() }
  }, [year, month, fullscreen])

  const { events } = useCalendarEvents(from, to)
  const { calendars } = useGoogleCalendars()

  useEffect(() => {
    if (calendars.length === 0 || selectedCalendarIds.length > 0) return
    setSelectedCalendarIds(calendars.map((calendar) => calendar.id))
  }, [calendars, selectedCalendarIds.length])

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

  function selectFullscreenDay(date: string) {
    setSelectedDate(date)
    setOpenDayDate(date)
  }

  function selectedItemsForDay() {
    return activeItems.filter(
      (item) => item.dueDate === selectedDate || item.scheduledDate === selectedDate,
    )
  }

  const visibleEvents = events.filter((event) => {
    if (!event.googleCalendarId || selectedCalendarIds.length === 0) return true
    return selectedCalendarIds.includes(event.googleCalendarId)
  })

  function selectedEventsForDay() {
    return visibleEvents
      .filter((event) => event.start.slice(0, 10) === selectedDate)
      .sort((a, b) => a.start.localeCompare(b.start))
  }

  function eventsForDate(date: string) {
    return visibleEvents
      .filter((event) => event.start.slice(0, 10) === date)
      .sort((a, b) => a.start.localeCompare(b.start))
  }

  const selectedItems = selectedItemsForDay()
  const selectedEvents = selectedEventsForDay()

  function toggleCalendar(calendarId: string) {
    setSelectedCalendarIds((current) =>
      current.includes(calendarId)
        ? current.filter((id) => id !== calendarId)
        : [...current, calendarId],
    )
  }

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
      <button
        type="button"
        onClick={() => setCreatingEvent(true)}
        title="Criar evento no Google Calendar"
        className="inline-flex items-center gap-1 rounded-md border border-brand-200 bg-white px-2 py-1 font-mono text-[10px] font-medium text-brand-700 transition-colors hover:bg-brand-50"
      >
        + Evento
      </button>
      {calendars.length > 1
        ? calendars.map((calendar) => {
            const selected =
              selectedCalendarIds.length === 0 || selectedCalendarIds.includes(calendar.id)
            return (
              <button
                key={calendar.id}
                type="button"
                onClick={() => toggleCalendar(calendar.id)}
                title={calendar.summary}
                className={`inline-flex max-w-[150px] items-center gap-1 rounded-md border px-2 py-1 font-mono text-[10px] font-medium transition-colors ${
                  selected
                    ? 'border-teal-200 bg-teal-50 text-navy-900'
                    : 'border-ui-border bg-white text-navy-300 hover:text-navy-700'
                }`}
              >
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full bg-teal-500"
                  style={
                    calendar.backgroundColor
                      ? { backgroundColor: calendar.backgroundColor }
                      : undefined
                  }
                />
                <span className="truncate">{calendar.summary}</span>
              </button>
            )
          })
        : null}
    </>
  )

  const mobileFilterButton = (
    <button
      type="button"
      onClick={() => setFiltersOpen(true)}
      className="inline-flex h-9 items-center gap-2 rounded-md border border-ui-border bg-white px-3 font-mono text-[11px] font-bold uppercase tracking-wide text-navy-600 shadow-cool-sm"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
      Filtros
    </button>
  )

  const fullscreenMenuButton = (
    <button
      type="button"
      onClick={() => setFiltersOpen(true)}
      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-navy-600 transition-colors hover:bg-surface-soft"
      aria-label="Abrir configuracoes do calendario"
      title="Menu"
    >
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.8}
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />
      </svg>
    </button>
  )

  const fullscreenMonthSelector = (
    <div
      ref={stripRef}
      className="flex min-w-0 w-full items-center gap-1.5 overflow-x-auto scroll-smooth py-1 [&::-webkit-scrollbar]:hidden"
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
            className={`flex h-10 shrink-0 flex-col items-center justify-center rounded-lg px-3 font-mono text-[10px] font-bold uppercase tracking-wide transition-colors ${
              isSelected
                ? 'bg-brand-600 text-white'
                : isCurrent
                  ? 'bg-brand-50 text-navy-900'
                  : 'text-navy-500 hover:bg-surface-soft hover:text-navy-900'
            }`}
          >
            <span className="text-[9px] leading-3 opacity-70">{m.year}</span>
            <span className="text-[12px] leading-4">{MONTH_SHORT[m.month]}</span>
          </button>
        )
      })}
    </div>
  )

  if (fullscreen) {
    return (
      <div className="flex h-full min-w-0 min-h-0 w-full flex-1 flex-col overflow-hidden bg-surface-window">
        <CalendarGrid
          items={[]}
          events={showEvents ? visibleEvents : []}
          year={year}
          month={month}
          onYearChange={setYear}
          onMonthChange={setMonth}
          onDayClick={selectFullscreenDay}
          onEventClick={setOpenEvent}
          selectedDate={selectedDate}
          headerControls={fullscreenMenuButton}
          monthSelector={fullscreenMonthSelector}
          hideMonthControls
          fillHeight
          googleLike
          calendarColors={new Map(calendars.map((calendar) => [calendar.id, calendar.backgroundColor]))}
          weekStartsOn={prefs.calendarWeekStartsOn}
        />

        {openDayDate ? (
          <FullscreenDayEventsSheet
            date={openDayDate}
            events={showEvents ? eventsForDate(openDayDate) : []}
            calendars={calendars}
            onEventClick={(event) => {
              setOpenDayDate(null)
              setOpenEvent(event)
            }}
            onClose={() => setOpenDayDate(null)}
          />
        ) : null}
        {openEvent ? (
          <EventSheet
            event={openEvent}
            onSaved={setOpenEvent}
            onDeleted={() => setOpenEvent(null)}
            onClose={() => setOpenEvent(null)}
          />
        ) : null}
        {creatingEvent ? (
          <NewEventSheet
            selectedDate={selectedDate}
            calendars={calendars}
            onSaved={(event) => {
              setCreatingEvent(false)
              setOpenEvent(event)
            }}
            onClose={() => setCreatingEvent(false)}
          />
        ) : null}
        {filtersOpen ? (
          <CalendarFilterSheet
            calendars={calendars}
            selectedCalendarIds={selectedCalendarIds}
            showItems={false}
            showEvents={showEvents}
            eventOnly
            fullscreen
            weekStartsOn={prefs.calendarWeekStartsOn}
            onClose={() => setFiltersOpen(false)}
            onToggleItems={() => undefined}
            onToggleEvents={() => setShowEvents((value) => !value)}
            onWeekStartChange={(value) => updatePreferences({ calendarWeekStartsOn: value })}
            onToggleCalendar={toggleCalendar}
            onSelectAllCalendars={() =>
              setSelectedCalendarIds(calendars.map((calendar) => calendar.id))
            }
            onCreateEvent={() => {
              setFiltersOpen(false)
              setCreatingEvent(true)
            }}
          />
        ) : null}
      </div>
    )
  }

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

      <div className="hidden min-h-0 flex-1 gap-3 lg:flex">
        <div className="min-w-0 flex-1">
          <CalendarGrid
            items={showItems ? activeItems : []}
            events={showEvents ? visibleEvents : []}
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
            weekStartsOn={prefs.calendarWeekStartsOn}
          />
        </div>
        {!compactSide ? (
          <aside className="min-h-0 w-[min(30vw,380px)] shrink-0">
            <DayList
              date={selectedDate}
              items={showItems ? selectedItems : []}
              events={showEvents ? selectedEvents : []}
              onItemClick={setSelectedItemId}
              onEventClick={setOpenEvent}
            />
          </aside>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 overflow-hidden lg:hidden">
        <section className="flex min-w-0 flex-1 flex-col">
          <CalendarGrid
            items={showItems ? activeItems : []}
            events={showEvents ? visibleEvents : []}
            year={year}
            month={month}
            onYearChange={setYear}
            onMonthChange={setMonth}
            onDayClick={selectFullscreenDay}
            onEventClick={setOpenEvent}
            selectedDate={selectedDate}
            headerControls={mobileFilterButton}
            fillHeight
            googleLike
            calendarColors={new Map(calendars.map((calendar) => [calendar.id, calendar.backgroundColor]))}
            weekStartsOn={prefs.calendarWeekStartsOn}
          />
        </section>
      </div>

      {openDayDate ? (
        <FullscreenDayEventsSheet
          date={openDayDate}
          events={showEvents ? eventsForDate(openDayDate) : []}
          calendars={calendars}
          onEventClick={(event) => {
            setOpenDayDate(null)
            setOpenEvent(event)
          }}
          onClose={() => setOpenDayDate(null)}
        />
      ) : null}
      {openEvent ? (
        <EventSheet
          event={openEvent}
          onSaved={setOpenEvent}
          onDeleted={() => setOpenEvent(null)}
          onClose={() => setOpenEvent(null)}
        />
      ) : null}
      {creatingEvent ? (
        <NewEventSheet
          selectedDate={selectedDate}
          calendars={calendars}
          onSaved={(event) => {
            setCreatingEvent(false)
            setOpenEvent(event)
          }}
          onClose={() => setCreatingEvent(false)}
        />
      ) : null}
      {filtersOpen ? (
        <CalendarFilterSheet
          calendars={calendars}
          selectedCalendarIds={selectedCalendarIds}
          showItems={showItems}
          showEvents={showEvents}
          weekStartsOn={prefs.calendarWeekStartsOn}
          onClose={() => setFiltersOpen(false)}
          onToggleItems={() => setShowItems((value) => !value)}
          onToggleEvents={() => setShowEvents((value) => !value)}
          onWeekStartChange={(value) => updatePreferences({ calendarWeekStartsOn: value })}
          onToggleCalendar={toggleCalendar}
          onSelectAllCalendars={() =>
            setSelectedCalendarIds(calendars.map((calendar) => calendar.id))
          }
          onCreateEvent={() => {
            setFiltersOpen(false)
            setCreatingEvent(true)
          }}
        />
      ) : null}
    </div>
  )
}

function CalendarFilterSheet({
  calendars,
  selectedCalendarIds,
  showItems,
  showEvents,
  eventOnly = false,
  fullscreen = false,
  weekStartsOn,
  onClose,
  onToggleItems,
  onToggleEvents,
  onWeekStartChange,
  onToggleCalendar,
  onSelectAllCalendars,
  onCreateEvent,
}: {
  calendars: GoogleCalendar[]
  selectedCalendarIds: string[]
  showItems: boolean
  showEvents: boolean
  eventOnly?: boolean
  fullscreen?: boolean
  weekStartsOn: CalendarWeekStart
  onClose: () => void
  onToggleItems: () => void
  onToggleEvents: () => void
  onWeekStartChange: (value: CalendarWeekStart) => void
  onToggleCalendar: (calendarId: string) => void
  onSelectAllCalendars: () => void
  onCreateEvent: () => void
}) {
  return (
    <div
      className={`fixed inset-0 z-[120] flex bg-navy-900/35 p-3 backdrop-blur-sm ${
        fullscreen
          ? 'items-start justify-start sm:p-4 lg:p-5'
          : 'items-end lg:hidden'
      }`}
      role="dialog"
      aria-modal="true"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        className={`w-full rounded-2xl border border-ui-border bg-surface-panel p-4 shadow-cool-lg ${
          fullscreen ? 'mt-12 max-w-sm lg:ml-2 lg:w-80' : ''
        }`}
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-wide text-brand-600">
              Calendario
            </p>
            <h2 className="text-lg font-bold text-navy-900">Filtros</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-navy-400 hover:bg-surface-soft"
            aria-label="Fechar filtros"
          >
            x
          </button>
        </div>

        <div className="space-y-2">
          {eventOnly ? null : (
            <button
              type="button"
              onClick={onToggleItems}
              className={`flex h-11 w-full items-center justify-between rounded-lg border px-3 text-left text-[14px] font-semibold ${
                showItems
                  ? 'border-brand-200 bg-brand-50 text-navy-900'
                  : 'border-ui-border bg-white text-navy-400'
              }`}
            >
              <span className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-brand-500" />
                Itens
              </span>
              <span>{showItems ? 'Visivel' : 'Oculto'}</span>
            </button>
          )}
          <button
            type="button"
            onClick={onToggleEvents}
            className={`flex h-11 w-full items-center justify-between rounded-lg border px-3 text-left text-[14px] font-semibold ${
              showEvents
                ? 'border-teal-200 bg-teal-50 text-navy-900'
                : 'border-ui-border bg-white text-navy-400'
            }`}
          >
            <span className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-teal-500" />
              Eventos
            </span>
            <span>{showEvents ? 'Visivel' : 'Oculto'}</span>
          </button>
        </div>

        <div className="mt-4">
          <h3 className="mb-2 font-mono text-[10px] font-bold uppercase tracking-wide text-navy-300">
            Primeiro dia
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'monday' as const, label: 'Segunda' },
              { value: 'sunday' as const, label: 'Domingo' },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onWeekStartChange(option.value)}
                className={`h-10 rounded-lg border px-3 text-[13px] font-semibold transition-colors ${
                  weekStartsOn === option.value
                    ? 'border-brand-200 bg-brand-50 text-navy-900'
                    : 'border-ui-border bg-white text-navy-400 hover:text-navy-700'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {calendars.length > 1 ? (
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-mono text-[10px] font-bold uppercase tracking-wide text-navy-300">
                Calendarios
              </h3>
              <button
                type="button"
                onClick={onSelectAllCalendars}
                className="font-mono text-[10px] font-bold uppercase tracking-wide text-brand-600"
              >
                Todos
              </button>
            </div>
            <div className="max-h-52 space-y-1 overflow-y-auto pr-1">
              {calendars.map((calendar) => {
                const selected =
                  selectedCalendarIds.length === 0 || selectedCalendarIds.includes(calendar.id)
                return (
                  <button
                    key={calendar.id}
                    type="button"
                    onClick={() => onToggleCalendar(calendar.id)}
                    className={`flex h-10 w-full items-center gap-2 rounded-lg border px-3 text-left text-[13px] font-medium ${
                      selected
                        ? 'border-teal-200 bg-teal-50 text-navy-900'
                        : 'border-ui-border bg-white text-navy-400'
                    }`}
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full bg-teal-500"
                      style={
                        calendar.backgroundColor
                          ? { backgroundColor: calendar.backgroundColor }
                          : undefined
                      }
                    />
                    <span className="min-w-0 flex-1 truncate">{calendar.summary}</span>
                    <span className="font-mono text-[10px]">{selected ? 'ON' : 'OFF'}</span>
                  </button>
                )
              })}
            </div>
          </div>
        ) : null}

        <button
          type="button"
          onClick={onCreateEvent}
          className="mt-4 flex h-11 w-full items-center justify-center rounded-lg bg-brand-600 text-[14px] font-semibold text-white"
        >
          + Evento
        </button>
      </div>
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

function FullscreenDayEventsSheet({
  date,
  events,
  calendars,
  onEventClick,
  onClose,
}: {
  date: string
  events: CalendarEvent[]
  calendars: GoogleCalendar[]
  onEventClick: (event: CalendarEvent) => void
  onClose: () => void
}) {
  const calendarColors = new Map(calendars.map((calendar) => [calendar.id, calendar.backgroundColor]))

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end bg-navy-900/35 p-3 backdrop-blur-sm sm:items-center sm:justify-center"
      role="dialog"
      aria-modal="true"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section className="flex max-h-[min(680px,calc(100vh-2rem))] w-full flex-col rounded-2xl border border-ui-border bg-surface-panel p-4 shadow-cool-lg sm:max-w-lg">
        <div className="mb-3 flex shrink-0 items-start justify-between gap-3 border-b border-ui-border-soft pb-3">
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-bold uppercase tracking-wide text-brand-600">
              Eventos do dia
            </p>
            <h2 className="mt-1 text-xl font-bold capitalize text-navy-900">{formatDate(date)}</h2>
            <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-wide text-navy-300">
              {events.length} evento(s)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-navy-400 hover:bg-surface-soft hover:text-navy-700"
            aria-label="Fechar eventos do dia"
          >
            x
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {events.length === 0 ? (
            <p className="rounded-lg border border-dashed border-ui-border-strong px-3 py-4 text-[13px] text-navy-300">
              Nenhum evento para este dia.
            </p>
          ) : (
            <div className="space-y-2">
              {events.map((event) => {
                const eventColor = event.googleCalendarId
                  ? calendarColors.get(event.googleCalendarId)
                  : undefined
                return (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => onEventClick(event)}
                    className="flex w-full items-center gap-3 rounded-lg border border-ui-border bg-white px-3 py-2.5 text-left shadow-cool-sm transition-colors hover:bg-surface-soft"
                  >
                    <span
                      className="h-10 w-1 shrink-0 rounded-full bg-brand-500"
                      style={eventColor ? { backgroundColor: eventColor } : undefined}
                    />
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
                )
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  )
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
    <div className="flex h-full min-h-0 flex-1 flex-col rounded-xl border border-ui-border bg-white p-3 shadow-cool-sm">
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

function NewEventSheet({
  selectedDate,
  calendars,
  onSaved,
  onClose,
}: {
  selectedDate: string
  calendars: GoogleCalendar[]
  onSaved: (event: CalendarEvent) => void
  onClose: () => void
}) {
  const { toast } = useToast()
  const writableCalendars = calendars.filter(
    (calendar) =>
      !calendar.accessRole || calendar.accessRole === 'owner' || calendar.accessRole === 'writer',
  )
  const defaultCalendar =
    writableCalendars.find((calendar) => calendar.primary)?.id ??
    writableCalendars[0]?.id ??
    'primary'
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [allDay, setAllDay] = useState(false)
  const [date, setDate] = useState(selectedDate)
  const [endDate, setEndDate] = useState(selectedDate)
  const [startTime, setStartTime] = useState('09:00')
  const [endTime, setEndTime] = useState('10:00')
  const [calendarId, setCalendarId] = useState(defaultCalendar)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(submitEvent: React.FormEvent) {
    submitEvent.preventDefault()
    if (!title.trim()) return
    setSaving(true)
    try {
      const saved = await createCalendarEvent({
        title: title.trim(),
        description,
        calendarId,
        allDay,
        start: allDay ? date : buildDateTime(date, startTime),
        end: allDay ? endDate : buildDateTime(endDate, endTime),
      })
      toast('Evento criado.', 'success')
      onSaved(saved)
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erro ao criar evento.', 'error')
    } finally {
      setSaving(false)
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
              Google Calendar
            </p>
            <h2 className="mt-1 text-xl font-bold text-navy-900">Novo evento</h2>
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
          {writableCalendars.length > 1 ? (
            <label className="block">
              <span className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-wide text-navy-300">
                Calendário
              </span>
              <select
                value={calendarId}
                onChange={(inputEvent) => setCalendarId(inputEvent.target.value)}
                className="h-10 w-full rounded-lg border border-ui-border px-3 text-sm outline-none focus:ring-2 focus:ring-brand-100"
              >
                {writableCalendars.map((calendar) => (
                  <option key={calendar.id} value={calendar.id}>
                    {calendar.summary}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          <label className="block">
            <span className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-wide text-navy-300">
              Titulo
            </span>
            <input
              value={title}
              onChange={(inputEvent) => setTitle(inputEvent.target.value)}
              className="h-10 w-full rounded-lg border border-ui-border px-3 text-sm outline-none focus:ring-2 focus:ring-brand-100"
              autoFocus
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

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="h-10 rounded-lg border border-ui-border px-3 text-sm font-semibold text-navy-500 transition-colors hover:bg-surface-soft disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving || !title.trim()}
            className="h-10 rounded-lg bg-brand-600 px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
          >
            {saving ? 'Criando...' : 'Criar'}
          </button>
        </div>
      </form>
    </div>
  )
}
