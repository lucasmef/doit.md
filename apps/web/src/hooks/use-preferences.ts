'use client'

import { useEffect, useState } from 'react'

export type Preferences = {
  showInbox: boolean
}

const DEFAULTS: Preferences = {
  showInbox: true,
}

const STORAGE_KEY = 'doit:preferences'
const EVENT = 'doit:preferences-change'

function read(): Preferences {
  if (typeof window === 'undefined') return DEFAULTS
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULTS
    return { ...DEFAULTS, ...JSON.parse(raw) }
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
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    window.dispatchEvent(new Event(EVENT))
    setPrefs(next)
  }

  return { prefs, update }
}
