'use client'

import { useState, useCallback } from 'react'
import { UIContext } from '@/store/ui'
import { useKeyboard } from '@/hooks/use-keyboard'

function UIProviderInner({ children }: { children: React.ReactNode }) {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)

  const navigateList = useCallback((direction: 'up' | 'down') => {
    const items = Array.from(document.querySelectorAll<HTMLElement>('[data-item-id]'))
    if (items.length === 0) return
    if (!selectedItemId) {
      const first = items[0]?.dataset.itemId ?? null
      setSelectedItemId(first)
      return
    }
    const idx = items.findIndex((el) => el.dataset.itemId === selectedItemId)
    if (direction === 'down') {
      const next = items[idx + 1]?.dataset.itemId ?? null
      if (next) { setSelectedItemId(next); items[idx + 1]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }) }
    } else {
      const prev = items[idx - 1]?.dataset.itemId ?? null
      if (prev) { setSelectedItemId(prev); items[idx - 1]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }) }
    }
  }, [selectedItemId])

  useKeyboard([
    {
      key: 'Escape',
      handler: () => {
        if (quickCaptureOpen) { setQuickCaptureOpen(false); return }
        if (selectedItemId) setSelectedItemId(null)
      },
    },
    {
      key: 'j',
      handler: (e) => { e.preventDefault(); navigateList('down') },
    },
    {
      key: 'k',
      handler: (e) => { e.preventDefault(); navigateList('up') },
    },
    {
      key: 'e',
      handler: () => {
        if (selectedItemId) setEditingItemId(selectedItemId)
      },
      when: !!selectedItemId,
    },
    {
      key: 'ArrowDown',
      handler: (e) => { e.preventDefault(); navigateList('down') },
    },
    {
      key: 'ArrowUp',
      handler: (e) => { e.preventDefault(); navigateList('up') },
    },
  ])

  return (
    <UIContext.Provider
      value={{ selectedItemId, setSelectedItemId, quickCaptureOpen, setQuickCaptureOpen, editingItemId, setEditingItemId }}
    >
      {children}
    </UIContext.Provider>
  )
}

export function UIProvider({ children }: { children: React.ReactNode }) {
  return <UIProviderInner>{children}</UIProviderInner>
}

