'use client'

import { useEffect } from 'react'
import { usePreferences, type ThemePreference } from '@/hooks/use-preferences'

function resolveTheme(theme: ThemePreference) {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return theme
}

function applyTheme(theme: ThemePreference) {
  const resolved = resolveTheme(theme)
  document.documentElement.dataset.theme = resolved
  document.documentElement.style.colorScheme = resolved
  document.documentElement.classList.toggle('dark', resolved === 'dark')
  document.querySelector('meta[name="theme-color"]')?.setAttribute(
    'content',
    resolved === 'dark' ? '#0b1220' : '#2f6bff',
  )
}

export function ThemeManager() {
  const { prefs } = usePreferences()

  useEffect(() => {
    applyTheme(prefs.theme)
    if (prefs.theme !== 'system') return

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme('system')
    media.addEventListener('change', handler)
    return () => media.removeEventListener('change', handler)
  }, [prefs.theme])

  return null
}
