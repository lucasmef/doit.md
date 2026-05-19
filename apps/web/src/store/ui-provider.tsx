'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { UIContext, type ItemContextMenuState } from '@/store/ui'
import { useKeyboard } from '@/hooks/use-keyboard'
import { onOfflineItemRemapped } from '@/lib/offline-items'
import { archiveItem, createItem } from '@/hooks/use-items'

async function archiveIfStillEmpty(id: string) {
  try {
    const res = await fetch(`/api/items/${id}`)
    if (!res.ok) return
    const { item } = (await res.json()) as { item?: { title?: string; contentMd?: string } }
    if (!item) return
    const title = String(item.title ?? '').trim()
    const contentMd = String(item.contentMd ?? '').trim()
    if (!title && !contentMd) await archiveItem(id)
  } catch {
    // ignore
  }
}

function UIProviderInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false)
  const [quickCaptureFolderId, setQuickCaptureFolderId] = useState<string | null>(null)
  const [quickCaptureEditId, setQuickCaptureEditId] = useState<string | null>(null)
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([])
  const [selectionAnchorId, setSelectionAnchorId] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<ItemContextMenuState>(null)
  const pendingEmptyNoteIdRef = useRef<string | null>(null)
  const prevSelectedItemIdRef = useRef<string | null>(null)

  const markPendingEmptyNote = useCallback((id: string | null) => {
    const prev = pendingEmptyNoteIdRef.current
    if (prev && prev !== id) void archiveIfStillEmpty(prev)
    pendingEmptyNoteIdRef.current = id
  }, [])

  useEffect(() => {
    const prev = prevSelectedItemIdRef.current
    prevSelectedItemIdRef.current = selectedItemId
    const pending = pendingEmptyNoteIdRef.current
    if (pending && prev === pending && selectedItemId !== pending) {
      pendingEmptyNoteIdRef.current = null
      void archiveIfStillEmpty(pending)
    }
  }, [selectedItemId])

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
      setQuickCaptureEditId((current) => (current === tempId ? itemId : current))
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

  const openSearch = useCallback(() => {
    window.dispatchEvent(new Event('doit:focus-search'))
  }, [])

  const goTo = useCallback((href: string) => {
    router.push(href)
  }, [router])

  function openNewNote() {
    const folderMatch = pathname?.match(/^\/notas\/([^/]+)/)
    const folderId = folderMatch?.[1]
    void createItem({
      complexity: 'note',
      title: '',
      contentMd: '',
      folderId,
    }).then((item) => {
      if (item?.id) {
        markPendingEmptyNote(item.id)
        setSingleSelection(item.id)
      }
    })
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
        openNewNote()
      },
    },
    {
      key: 'k',
      ctrl: true,
      handler: (e) => { e.preventDefault(); openSearch() },
    },
    {
      key: 'k',
      meta: true,
      handler: (e) => { e.preventDefault(); openSearch() },
    },
    {
      key: 'h',
      handler: (e) => { e.preventDefault(); goTo('/today') },
    },
    {
      key: 'p',
      handler: (e) => { e.preventDefault(); goTo('/upcoming') },
    },
    {
      key: 'C',
      shift: true,
      handler: (e) => {
        e.preventDefault()
        setCalendarOpen(false)
        window.dispatchEvent(new Event('doit:open-calendar-view'))
        goTo('/upcoming?view=calendar')
      },
    },
    {
      key: '?',
      shift: true,
      handler: (e) => {
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
        quickCaptureEditId,
        setQuickCaptureEditId,
        editingItemId, 
        setEditingItemId,
        calendarOpen,
        setCalendarOpen,
        shortcutsOpen,
        setShortcutsOpen,
        markPendingEmptyNote,
      }}
    >
      {children}
    </UIContext.Provider>
  )
}

export function UIProvider({ children }: { children: React.ReactNode }) {
  return <UIProviderInner>{children}</UIProviderInner>
}
