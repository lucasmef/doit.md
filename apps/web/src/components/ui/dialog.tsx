'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'

type ConfirmOptions = {
  message: string
  title?: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'danger'
}

type PromptOptions = {
  message: string
  title?: string
  defaultValue?: string
  placeholder?: string
  confirmLabel?: string
  cancelLabel?: string
}

type DialogContextValue = {
  confirm: (options: ConfirmOptions | string) => Promise<boolean>
  prompt: (options: PromptOptions | string) => Promise<string | null>
}

const DialogContext = createContext<DialogContextValue>({
  confirm: async () => false,
  prompt: async () => null,
})

export function useDialog() {
  return useContext(DialogContext)
}

type DialogState =
  | { kind: 'confirm'; options: Required<Omit<ConfirmOptions, 'title'>> & { title?: string }; resolve: (value: boolean) => void }
  | { kind: 'prompt'; options: Required<Omit<PromptOptions, 'title' | 'placeholder'>> & { title?: string; placeholder?: string }; resolve: (value: string | null) => void }

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DialogState | null>(null)
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const confirm = useCallback((options: ConfirmOptions | string) => {
    const opts = typeof options === 'string' ? { message: options } : options
    return new Promise<boolean>((resolve) => {
      setState({
        kind: 'confirm',
        options: {
          message: opts.message,
          title: opts.title,
          confirmLabel: opts.confirmLabel ?? 'Confirmar',
          cancelLabel: opts.cancelLabel ?? 'Cancelar',
          variant: opts.variant ?? 'default',
        },
        resolve,
      })
    })
  }, [])

  const prompt = useCallback((options: PromptOptions | string) => {
    const opts = typeof options === 'string' ? { message: options } : options
    setValue(opts.defaultValue ?? '')
    return new Promise<string | null>((resolve) => {
      setState({
        kind: 'prompt',
        options: {
          message: opts.message,
          title: opts.title,
          defaultValue: opts.defaultValue ?? '',
          placeholder: opts.placeholder,
          confirmLabel: opts.confirmLabel ?? 'OK',
          cancelLabel: opts.cancelLabel ?? 'Cancelar',
        },
        resolve,
      })
    })
  }, [])

  useEffect(() => {
    if (state?.kind === 'prompt') {
      setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 50)
    }
  }, [state])

  function close(result: boolean | string | null) {
    if (!state) return
    if (state.kind === 'confirm') state.resolve(result === true)
    else state.resolve(result === false ? null : (result as string | null))
    setState(null)
    setValue('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!state) return
    if (state.kind === 'confirm') close(true)
    else close(value)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault()
      close(state?.kind === 'confirm' ? false : null)
    }
  }

  return (
    <DialogContext.Provider value={{ confirm, prompt }}>
      {children}
      {state && (
        <div
          className="fixed inset-0 z-[200] flex items-end justify-center bg-navy-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) close(state.kind === 'confirm' ? false : null)
          }}
          onKeyDown={handleKeyDown}
        >
          <form
            onSubmit={handleSubmit}
            className="w-full max-w-md rounded-t-xl border border-ui-border bg-white shadow-cool-lg sm:rounded-xl"
          >
            <div className="px-5 pb-3 pt-5">
              {state.options.title && (
                <h2 className="mb-1 text-[15px] font-semibold text-navy-900">{state.options.title}</h2>
              )}
              <p className="text-[14px] leading-5 text-navy-700 whitespace-pre-line">
                {state.options.message}
              </p>
              {state.kind === 'prompt' && (
                <input
                  ref={inputRef}
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={state.options.placeholder}
                  className="mt-3 h-10 w-full rounded-[10px] border border-ui-border-soft bg-surface-soft px-3 text-[16px] text-navy-900 outline-none focus:border-brand-300 focus:ring-2 focus:ring-brand-100 sm:h-9 sm:text-[14px]"
                />
              )}
            </div>
            <div className="flex items-center justify-end gap-2 border-t border-ui-border bg-surface-soft px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={() => close(state.kind === 'confirm' ? false : null)}
                className="h-10 rounded-[10px] px-3 text-[12px] font-semibold text-slate-500 hover:bg-white hover:text-slate-700 sm:h-8"
              >
                {state.options.cancelLabel}
              </button>
              <button
                type="submit"
                className={`h-10 rounded-[10px] px-3 text-[12px] font-semibold text-white shadow-sm transition-colors sm:h-8 ${
                  state.kind === 'confirm' && state.options.variant === 'danger'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-brand-600 hover:bg-brand-700'
                }`}
              >
                {state.options.confirmLabel}
              </button>
            </div>
          </form>
        </div>
      )}
    </DialogContext.Provider>
  )
}
