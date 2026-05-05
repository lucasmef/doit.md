'use client'

import { useEffect } from 'react'

type Shortcut = {
  key: string
  meta?: boolean
  ctrl?: boolean
  shift?: boolean
  handler: (e: KeyboardEvent) => void
  when?: boolean
}

export function useKeyboard(shortcuts: Shortcut[]) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      for (const s of shortcuts) {
        if (s.when === false) continue
        if (s.key !== e.key) continue
        if (s.meta !== undefined && s.meta !== e.metaKey) continue
        if (s.ctrl !== undefined && s.ctrl !== e.ctrlKey) continue
        if (s.shift !== undefined && s.shift !== e.shiftKey) continue

        const target = e.target as HTMLElement
        const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)

        // Atalhos sem modificador só disparam fora de inputs
        if (!s.meta && !s.ctrl && isInput) continue

        s.handler(e)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [shortcuts])
}
