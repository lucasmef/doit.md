'use client'

import { createContext, useContext } from 'react'

export type CaptureMode = 'task' | 'note' | 'event'

export type ItemContextMenuState = {
  itemId: string
  x: number
  y: number
} | null

export type UIState = {
  selectedItemId: string | null
  setSelectedItemId: (id: string | null) => void
  selectedItemIds: string[]
  selectionAnchorId: string | null
  setSingleSelection: (id: string | null) => void
  toggleSelection: (id: string) => void
  selectRange: (orderedIds: string[], id: string) => void
  clearSelection: () => void
  contextMenu: ItemContextMenuState
  openContextMenu: (state: Exclude<ItemContextMenuState, null>) => void
  closeContextMenu: () => void
  quickCaptureOpen: boolean
  setQuickCaptureOpen: (open: boolean) => void
  captureMode: CaptureMode
  lastCaptureMode: CaptureMode
  openCapture: (mode?: CaptureMode, date?: string | null) => void
  quickCaptureFolderId: string | null
  setQuickCaptureFolderId: (folderId: string | null) => void
  // ID 065/068: data do dia aberto (calendário) para a adição rápida criar com essa data.
  quickCaptureDate: string | null
  setQuickCaptureDate: (date: string | null) => void
  quickCaptureEditId: string | null
  setQuickCaptureEditId: (id: string | null) => void
  editingItemId: string | null
  setEditingItemId: (id: string | null) => void
  calendarOpen: boolean
  setCalendarOpen: (open: boolean) => void
  calendarEventCaptureOpen: boolean
  calendarEventCaptureDate: string | null
  openCalendarEventCapture: (date?: string | null) => void
  setCalendarEventCaptureOpen: (open: boolean) => void
  shortcutsOpen: boolean
  setShortcutsOpen: (open: boolean) => void
  markPendingEmptyNote: (id: string | null) => void
}

export const UIContext = createContext<UIState>({
  selectedItemId: null,
  setSelectedItemId: () => {},
  selectedItemIds: [],
  selectionAnchorId: null,
  setSingleSelection: () => {},
  toggleSelection: () => {},
  selectRange: () => {},
  clearSelection: () => {},
  contextMenu: null,
  openContextMenu: () => {},
  closeContextMenu: () => {},
  quickCaptureOpen: false,
  setQuickCaptureOpen: () => {},
  captureMode: 'task',
  lastCaptureMode: 'task',
  openCapture: () => {},
  quickCaptureFolderId: null,
  setQuickCaptureFolderId: () => {},
  quickCaptureDate: null,
  setQuickCaptureDate: () => {},
  quickCaptureEditId: null,
  setQuickCaptureEditId: () => {},
  editingItemId: null,
  setEditingItemId: () => {},
  calendarOpen: false,
  setCalendarOpen: () => {},
  calendarEventCaptureOpen: false,
  calendarEventCaptureDate: null,
  openCalendarEventCapture: () => {},
  setCalendarEventCaptureOpen: () => {},
  shortcutsOpen: false,
  setShortcutsOpen: () => {},
  markPendingEmptyNote: () => {},
})

export const useUI = () => useContext(UIContext)
