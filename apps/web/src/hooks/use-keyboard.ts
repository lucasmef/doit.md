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

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return true
  if (target.isContentEditable) return true
  return Boolean(target.closest('[contenteditable="true"], .ProseMirror, form, [data-keyboard-scope="typing"]'))
}

export function useKeyboard(shortcuts: Shortcut[]) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      for (const s of shortcuts) {
        if (s.when === false) continue
        if (s.key !== e.key) continue
        if ((s.meta ?? false) !== e.metaKey) continue
        if ((s.ctrl ?? false) !== e.ctrlKey) continue
        if ((s.shift ?? false) !== e.shiftKey) continue

        if (!s.meta && !s.ctrl && isTypingTarget(e.target)) continue

        s.handler(e)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [shortcuts])
}
