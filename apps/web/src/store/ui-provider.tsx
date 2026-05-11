'use client'

import { useState, useCallback, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { UIContext, type ItemContextMenuState } from '@/store/ui'
import { useKeyboard } from '@/hooks/use-keyboard'
import { onOfflineItemRemapped } from '@/lib/offline-items'
import { createItem } from '@/hooks/use-items'

function UIProviderInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false)
  const [quickCaptureFolderId, setQuickCaptureFolderId] = useState<string | null>(null)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([])
  const [selectionAnchorId, setSelectionAnchorId] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<ItemContextMenuState>(null)

  const setSingleSelection = useCallback((id: string | null) => {
    setSelectedItemId(id)
    setSelectedItemIds(id ? [id] : [])
    setSelectionAnchorId(id)
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedItemId(null)
    setSelectedItemIds([])
    setSelectionAnchorId(null)
    setContextMenu(null)
  }, [])

  const toggleSelection = useCallback((id: string) => {
    setSelectedItemIds((current) => {
      const next = current.includes(id) ? current.filter((itemId) => itemId !== id) : [...current, id]
      setSelectedItemId(next[next.length - 1] ?? null)
      return next
    })
    setSelectionAnchorId(id)
  }, [])

  const selectRange = useCallback((orderedIds: string[], id: string) => {
    const anchor = selectionAnchorId && orderedIds.includes(selectionAnchorId) ? selectionAnchorId : selectedItemId
    const start = anchor ? orderedIds.indexOf(anchor) : -1
    const end = orderedIds.indexOf(id)
    if (start < 0 || end < 0) {
      setSingleSelection(id)
      return
    }

    const [from, to] = start <= end ? [start, end] : [end, start]
    const range = orderedIds.slice(from, to + 1)
    setSelectedItemIds(range)
    setSelectedItemId(id)
    setSelectionAnchorId(anchor)
  }, [selectedItemId, selectionAnchorId, setSingleSelection])

  useEffect(() => {
    return onOfflineItemRemapped(({ tempId, itemId }) => {
      setSelectedItemId((current) => (current === tempId ? itemId : current))
      setSelectedItemIds((current) =>
        current.includes(tempId) ? current.map((id) => (id === tempId ? itemId : id)) : current,
      )
      setSelectionAnchorId((current) => (current === tempId ? itemId : current))
      setEditingItemId((current) => (current === tempId ? itemId : current))
      setQuickCaptureFolderId((current) => (current === tempId ? itemId : current))
    })
  }, [])

  const openContextMenu = useCallback((state: Exclude<ItemContextMenuState, null>) => {
    setContextMenu(state)
  }, [])

  const closeContextMenu = useCallback(() => {
    setContextMenu(null)
  }, [])

  const navigateList = useCallback((direction: 'up' | 'down') => {
    const items = Array.from(document.querySelectorAll<HTMLElement>('[data-item-id]'))
    if (items.length === 0) return
    if (!selectedItemId) {
      const first = items[0]?.dataset.itemId ?? null
      setSingleSelection(first)
      return
    }
    const idx = items.findIndex((el) => el.dataset.itemId === selectedItemId)
    if (direction === 'down') {
      const next = items[idx + 1]?.dataset.itemId ?? null
      if (next) { setSingleSelection(next); items[idx + 1]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }) }
    } else {
      const prev = items[idx - 1]?.dataset.itemId ?? null
      if (prev) { setSingleSelection(prev); items[idx - 1]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }) }
    }
  }, [selectedItemId, setSingleSelection])

  function hasNoFocusedElement() {
    const active = document.activeElement
    return !active || active === document.body || active === document.documentElement
  }

  useKeyboard([
    {
      key: 'Escape',
      handler: () => {
        if (contextMenu) { setContextMenu(null); return }
        if (shortcutsOpen) { setShortcutsOpen(false); return }
        if (selectedItemIds.length > 1) { clearSelection(); return }
        if (quickCaptureOpen) { setQuickCaptureOpen(false); return }
        if (calendarOpen) { setCalendarOpen(false); return }
        if (selectedItemId) setSingleSelection(null)
      },
    },
    {
      key: 'q',
      handler: (e) => { e.preventDefault(); setQuickCaptureOpen(true) },
    },
    {
      key: 'w',
      handler: (e) => {
        e.preventDefault()
        const folderMatch = pathname?.match(/^\/notas\/([^/]+)/)
        const folderId = folderMatch?.[1]
        void createItem({
          complexity: 'note',
          title: 'Nova nota',
          contentMd: 'Nova nota',
          folderId,
        }).then((item) => {
          if (item?.id) setSingleSelection(item.id)
        })
      },
    },
    {
      key: 'C',
      shift: true,
      handler: (e) => { e.preventDefault(); setCalendarOpen(!calendarOpen) },
    },
    {
      key: '?',
      shift: true,
      handler: (e) => {
        if (!hasNoFocusedElement()) return
        e.preventDefault()
        setShortcutsOpen(true)
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
      value={{ 
        selectedItemId,
        setSelectedItemId: setSingleSelection,
        selectedItemIds,
        selectionAnchorId,
        setSingleSelection,
        toggleSelection,
        selectRange,
        clearSelection,
        contextMenu,
        openContextMenu,
        closeContextMenu,
        quickCaptureOpen,
        setQuickCaptureOpen,
        quickCaptureFolderId,
        setQuickCaptureFolderId,
        editingItemId, 
        setEditingItemId,
        calendarOpen,
        setCalendarOpen,
        shortcutsOpen,
        setShortcutsOpen
      }}
    >
      {children}
    </UIContext.Provider>
  )
}

export function UIProvider({ children }: { children: React.ReactNode }) {
  return <UIProviderInner>{children}</UIProviderInner>
}
