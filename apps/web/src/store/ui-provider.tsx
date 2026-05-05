'use client'

import { useState } from 'react'
import { UIContext } from './ui'

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)
  const [quickCaptureOpen, setQuickCaptureOpen] = useState(false)

  return (
    <UIContext.Provider
      value={{ selectedItemId, setSelectedItemId, quickCaptureOpen, setQuickCaptureOpen }}
    >
      {children}
    </UIContext.Provider>
  )
}
