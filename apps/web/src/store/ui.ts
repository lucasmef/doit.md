'use client'

import { createContext, useContext } from 'react'

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
  quickCaptureFolderId: string | null
  setQuickCaptureFolderId: (folderId: string | null) => void
  editingItemId: string | null
  setEditingItemId: (id: string | null) => void
  calendarOpen: boolean
  setCalendarOpen: (open: boolean) => void
  shortcutsOpen: boolean
  setShortcutsOpen: (open: boolean) => void
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
  quickCaptureFolderId: null,
  setQuickCaptureFolderId: () => {},
  editingItemId: null,
  setEditingItemId: () => {},
  calendarOpen: false,
  setCalendarOpen: () => {},
  shortcutsOpen: false,
  setShortcutsOpen: () => {},
})

export const useUI = () => useContext(UIContext)
