'use client'

import { useEffect, useState } from 'react'

export type MobileNavItemId =
  | 'inbox'
  | 'today'
  | 'upcoming'
  | 'calendar'
  | 'notas'
  | 'settings'

export type MobileNavItem = { id: MobileNavItemId; visible: boolean }

export type Preferences = {
  showInbox: boolean
  mobileNav: MobileNavItem[]
  theme: ThemePreference
  sidebarCollapsed: boolean
  pinnedFolderIds: string[]
  calendarWeekStartsOn: CalendarWeekStart
  defaultCalendarId: string
  defaultCalendarEventDurationMinutes: number
  todayCalendarHidePastAfterHours: number
  todayCalendarShowTomorrowAfterTime: string
}

export type ThemePreference = 'light' | 'dark' | 'system'
export type CalendarWeekStart = 'monday' | 'sunday'

const MOBILE_NAV_DEFAULT: MobileNavItem[] = [
  { id: 'today', visible: true },
  { id: 'calendar', visible: true },
  { id: 'inbox', visible: true },
  { id: 'notas', visible: true },
  { id: 'upcoming', visible: true },
  { id: 'settings', visible: true },
]

const DEFAULTS: Preferences = {
  showInbox: true,
  mobileNav: MOBILE_NAV_DEFAULT,
  theme: 'system',
  sidebarCollapsed: false,
  pinnedFolderIds: [],
  calendarWeekStartsOn: 'monday',
  defaultCalendarId: 'primary',
  defaultCalendarEventDurationMinutes: 30,
  todayCalendarHidePastAfterHours: 2,
  todayCalendarShowTomorrowAfterTime: '18:00',
}

const STORAGE_KEY = 'doit:preferences'
const EVENT = 'doit:preferences-change'

function normalizeMobileNav(value: unknown, showInbox: boolean): MobileNavItem[] {
  const known = MOBILE_NAV_DEFAULT.map((entry) => entry.id)
  const incoming = Array.isArray(value) ? (value as MobileNavItem[]) : []
  const seen = new Set<string>()
  const merged: MobileNavItem[] = []

  for (const entry of incoming) {
    if (!entry || typeof entry !== 'object') continue
    if (!known.includes(entry.id)) continue
    if (seen.has(entry.id)) continue
    seen.add(entry.id)
    merged.push({ id: entry.id, visible: entry.visible !== false })
  }

  for (const fallback of MOBILE_NAV_DEFAULT) {
    if (seen.has(fallback.id)) continue
    merged.push({ ...fallback })
  }

  if (!showInbox) {
    const inbox = merged.find((entry) => entry.id === 'inbox')
    if (inbox) inbox.visible = false
  }

  return merged
}

function read(): Preferences {
  if (typeof window === 'undefined') return DEFAULTS
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULTS
    const parsed = JSON.parse(raw) as Partial<Preferences>
    const showInbox = parsed.showInbox !== false
    const theme = parsed.theme === 'light' || parsed.theme === 'dark' ? parsed.theme : 'system'
    const hidePastHours =
      typeof parsed.todayCalendarHidePastAfterHours === 'number' &&
      Number.isFinite(parsed.todayCalendarHidePastAfterHours) &&
      parsed.todayCalendarHidePastAfterHours >= 0
        ? Math.min(24, parsed.todayCalendarHidePastAfterHours)
        : DEFAULTS.todayCalendarHidePastAfterHours
    const showTomorrowTime =
      typeof parsed.todayCalendarShowTomorrowAfterTime === 'string' &&
      /^\d{2}:\d{2}$/.test(parsed.todayCalendarShowTomorrowAfterTime)
        ? parsed.todayCalendarShowTomorrowAfterTime
        : DEFAULTS.todayCalendarShowTomorrowAfterTime
    const calendarWeekStartsOn =
      parsed.calendarWeekStartsOn === 'sunday' ? 'sunday' : DEFAULTS.calendarWeekStartsOn
    const defaultCalendarId =
      typeof parsed.defaultCalendarId === 'string' && parsed.defaultCalendarId.trim()
        ? parsed.defaultCalendarId
        : DEFAULTS.defaultCalendarId
    const defaultCalendarEventDurationMinutes =
      typeof parsed.defaultCalendarEventDurationMinutes === 'number' &&
      Number.isFinite(parsed.defaultCalendarEventDurationMinutes) &&
      parsed.defaultCalendarEventDurationMinutes > 0
        ? Math.min(480, Math.max(5, Math.round(parsed.defaultCalendarEventDurationMinutes)))
        : DEFAULTS.defaultCalendarEventDurationMinutes
    return {
      showInbox,
      mobileNav: normalizeMobileNav(parsed.mobileNav, showInbox),
      theme,
      sidebarCollapsed: parsed.sidebarCollapsed === true,
      pinnedFolderIds: Array.isArray(parsed.pinnedFolderIds)
        ? parsed.pinnedFolderIds.filter((id): id is string => typeof id === 'string')
        : [],
      calendarWeekStartsOn,
      defaultCalendarId,
      defaultCalendarEventDurationMinutes,
      todayCalendarHidePastAfterHours: hidePastHours,
      todayCalendarShowTomorrowAfterTime: showTomorrowTime,
    }
  } catch {
    return DEFAULTS
  }
}

export function usePreferences() {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULTS)

  useEffect(() => {
    setPrefs(read())
    const handler = () => setPrefs(read())
    window.addEventListener(EVENT, handler)
    window.addEventListener('storage', handler)
    return () => {
      window.removeEventListener(EVENT, handler)
      window.removeEventListener('storage', handler)
    }
  }, [])

  function update(patch: Partial<Preferences>) {
    const next = { ...read(), ...patch }
    if (next.theme !== 'light' && next.theme !== 'dark' && next.theme !== 'system') {
      next.theme = 'system'
    }
    if (patch.mobileNav) {
      next.mobileNav = normalizeMobileNav(patch.mobileNav, next.showInbox)
    }
    if (patch.showInbox !== undefined) {
      next.mobileNav = normalizeMobileNav(next.mobileNav, next.showInbox)
    }
    if (patch.pinnedFolderIds) {
      next.pinnedFolderIds = Array.from(
        new Set(patch.pinnedFolderIds.filter((id): id is string => typeof id === 'string')),
      )
    }
    if (next.calendarWeekStartsOn !== 'monday' && next.calendarWeekStartsOn !== 'sunday') {
      next.calendarWeekStartsOn = DEFAULTS.calendarWeekStartsOn
    }
    if (typeof next.defaultCalendarId !== 'string' || !next.defaultCalendarId.trim()) {
      next.defaultCalendarId = DEFAULTS.defaultCalendarId
    }
    if (
      !Number.isFinite(next.defaultCalendarEventDurationMinutes) ||
      next.defaultCalendarEventDurationMinutes <= 0
    ) {
      next.defaultCalendarEventDurationMinutes = DEFAULTS.defaultCalendarEventDurationMinutes
    } else {
      next.defaultCalendarEventDurationMinutes = Math.min(
        480,
        Math.max(5, Math.round(next.defaultCalendarEventDurationMinutes)),
      )
    }
    if (
      !Number.isFinite(next.todayCalendarHidePastAfterHours) ||
      next.todayCalendarHidePastAfterHours < 0
    ) {
      next.todayCalendarHidePastAfterHours = DEFAULTS.todayCalendarHidePastAfterHours
    } else {
      next.todayCalendarHidePastAfterHours = Math.min(24, next.todayCalendarHidePastAfterHours)
    }
    if (!/^\d{2}:\d{2}$/.test(next.todayCalendarShowTomorrowAfterTime)) {
      next.todayCalendarShowTomorrowAfterTime = DEFAULTS.todayCalendarShowTomorrowAfterTime
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    window.dispatchEvent(new Event(EVENT))
    setPrefs(next)
  }

  return { prefs, update }
}
