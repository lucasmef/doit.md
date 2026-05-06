'use client'

import { createContext, useContext } from 'react'

export type UIState = {
  selectedItemId: string | null
  setSelectedItemId: (id: string | null) => void
  quickCaptureOpen: boolean
  setQuickCaptureOpen: (open: boolean) => void
  editingItemId: string | null
  setEditingItemId: (id: string | null) => void
  calendarOpen: boolean
  setCalendarOpen: (open: boolean) => void
}

export const UIContext = createContext<UIState>({
  selectedItemId: null,
  setSelectedItemId: () => {},
  quickCaptureOpen: false,
  setQuickCaptureOpen: () => {},
  editingItemId: null,
  setEditingItemId: () => {},
  calendarOpen: false,
  setCalendarOpen: () => {},
})

export const useUI = () => useContext(UIContext)
