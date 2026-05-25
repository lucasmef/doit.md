'use client'

import { createContext, useContext, useState, useCallback } from 'react'

type ToastType = 'success' | 'error' | 'info'

type Toast = {
  id: string
  message: string
  type: ToastType
  action?: {
    label: string
    onClick: () => void
  }
}

type ToastContextValue = {
  toast: (message: string, type?: ToastType, action?: Toast['action']) => void
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

const ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  info: 'ℹ',
}

const COLORS: Record<ToastType, string> = {
  success: 'bg-green-600',
  error: 'bg-red-600',
  info: 'bg-slate-700',
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const toast = useCallback((message: string, type: ToastType = 'info', action?: Toast['action']) => {
    const id = Math.random().toString(36).slice(2)
    setToasts((prev) => [...prev, { id, message, type, action }])
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500)
  }, [])

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="pointer-events-none fixed inset-x-3 bottom-[calc(6.25rem+env(safe-area-inset-bottom))] z-[90] flex flex-col gap-2 lg:bottom-6 lg:left-auto lg:right-4 lg:w-auto">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-medium text-white shadow-lg animate-slide-up ${COLORS[t.type]}`}
          >
            <span className="text-base leading-none">{ICONS[t.type]}</span>
            <span>{t.message}</span>
            {t.action && (
              <button
                type="button"
                onClick={() => {
                  t.action?.onClick()
                  setToasts((prev) => prev.filter((toast) => toast.id !== t.id))
                }}
                className="ml-2 rounded-md bg-white/15 px-2 py-1 text-xs font-bold text-white hover:bg-white/25"
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
