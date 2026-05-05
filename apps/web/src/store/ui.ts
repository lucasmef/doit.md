'use client'

import { createContext, useContext } from 'react'

export type UIState = {
  selectedItemId: string | null
  setSelectedItemId: (id: string | null) => void
  quickCaptureOpen: boolean
  setQuickCaptureOpen: (open: boolean) => void
}

export const UIContext = createContext<UIState>({
  selectedItemId: null,
  setSelectedItemId: () => {},
  quickCaptureOpen: false,
  setQuickCaptureOpen: () => {},
})

export const useUI = () => useContext(UIContext)
