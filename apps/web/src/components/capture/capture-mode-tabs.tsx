'use client'

import type { ReactNode, TouchEvent } from 'react'
import type { CaptureMode } from '@/store/ui'
import { isTypingTarget } from '@/hooks/use-keyboard'

const MODES: Array<{ mode: CaptureMode; label: string; icon: ReactNode }> = [
  { mode: 'task', label: 'Tarefa', icon: <IconCheck /> },
  { mode: 'note', label: 'Nota', icon: <IconDocument /> },
  { mode: 'event', label: 'Evento', icon: <IconCalendar /> },
]

export function CaptureModeTabs({
  mode,
  onModeChange,
}: {
  mode: CaptureMode
  onModeChange: (mode: CaptureMode) => void
}) {
  return (
    <div className="grid w-full grid-cols-3 gap-1 rounded-[14px] bg-navy-900/[0.04] p-1">
      {MODES.map((item) => {
        const active = item.mode === mode
        return (
          <button
            key={item.mode}
            type="button"
            onClick={() => onModeChange(item.mode)}
            className={`inline-flex h-11 min-w-0 items-center justify-center gap-1.5 rounded-[10px] px-2 text-[13px] font-semibold transition-colors sm:h-10 ${
              active
                ? 'bg-[#EAF1FF] text-brand-600 shadow-[inset_0_-2.5px_0_rgba(47,107,255,1)]'
                : 'bg-white/80 text-navy-500 shadow-[inset_0_0_0_1px_rgba(15,35,66,0.05)] hover:bg-white hover:text-navy-900'
            }`}
            aria-pressed={active}
            aria-label={`Capturar ${item.label.toLowerCase()}`}
          >
            <span className="h-4 w-4 shrink-0">{item.icon}</span>
            <span>{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export function createCaptureSwipeHandlers({
  mode,
  onModeChange,
  onExpand,
}: {
  mode: CaptureMode
  onModeChange: (mode: CaptureMode) => void
  onExpand?: () => void
}) {
  let startX = 0
  let startY = 0
  let tracking = false

  return {
    onTouchStart(event: TouchEvent) {
      if (isTypingTarget(event.target)) return
      const touch = event.touches[0]
      if (!touch) return
      tracking = true
      startX = touch.clientX
      startY = touch.clientY
    },
    onTouchEnd(event: TouchEvent) {
      if (!tracking) return
      tracking = false
      const touch = event.changedTouches[0]
      if (!touch) return
      const deltaX = touch.clientX - startX
      const deltaY = touch.clientY - startY
      if (deltaY < -64 && Math.abs(deltaY) > Math.abs(deltaX) * 1.2) {
        onExpand?.()
        return
      }
      if (Math.abs(deltaX) < 56 || Math.abs(deltaX) < Math.abs(deltaY) * 1.2) return

      const index = MODES.findIndex((item) => item.mode === mode)
      const nextIndex = deltaX < 0 ? index + 1 : index - 1
      const nextMode = MODES[nextIndex]?.mode
      if (nextMode) onModeChange(nextMode)
    },
  }
}

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path d="M5 12.5l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconDocument() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path d="M7 3.5h7l3 3v14H7z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 3.5v4h4M9.5 12h5M9.5 15.5h5" strokeLinecap="round" />
    </svg>
  )
}

function IconCalendar() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3v4M16 3v4M4 10h16" strokeLinecap="round" />
    </svg>
  )
}
