'use client'

import { useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type Props = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

type ToolbarAction = {
  label: string
  icon: React.ReactNode
  syntax: string
  wrap?: boolean
  block?: boolean
}

function BoldIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
      <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z" />
    </svg>
  )
}

function ItalicIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <line x1="19" y1="4" x2="10" y2="4" />
      <line x1="14" y1="20" x2="5" y2="20" />
      <line x1="15" y1="4" x2="9" y2="20" />
    </svg>
  )
}

function HeadingIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
      <path d="M4 12h16M4 6v12M20 6v12" strokeLinecap="round" />
    </svg>
  )
}

function ListIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <line x1="9" y1="6" x2="20" y2="6" />
      <line x1="9" y1="12" x2="20" y2="12" />
      <line x1="9" y1="18" x2="20" y2="18" />
      <circle cx="4" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="4" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="4" cy="18" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}

function OrderedListIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <line x1="10" y1="6" x2="21" y2="6" />
      <line x1="10" y1="12" x2="21" y2="12" />
      <line x1="10" y1="18" x2="21" y2="18" />
      <path d="M4 6h1v4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M4 10h2M3.5 16a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1H4a.5.5 0 0 0-.5.5.5.5 0 0 0 .5.5h2" strokeLinecap="round" />
    </svg>
  )
}

function CodeIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  )
}

function LinkIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}

function QuoteIcon() {
  return (
    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z" />
      <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
    </svg>
  )
}

const TOOLBAR_ACTIONS: ToolbarAction[] = [
  { label: 'Negrito', icon: <BoldIcon />, syntax: '**', wrap: true },
  { label: 'Itálico', icon: <ItalicIcon />, syntax: '_', wrap: true },
  { label: 'Título', icon: <HeadingIcon />, syntax: '## ', block: true },
  { label: 'Citação', icon: <QuoteIcon />, syntax: '> ', block: true },
  { label: 'Lista', icon: <ListIcon />, syntax: '- ', block: true },
  { label: 'Lista numerada', icon: <OrderedListIcon />, syntax: '1. ', block: true },
  { label: 'Código', icon: <CodeIcon />, syntax: '`', wrap: true },
  { label: 'Link', icon: <LinkIcon />, syntax: '[texto](url)', wrap: false },
]

function applyAction(textarea: HTMLTextAreaElement, action: ToolbarAction, value: string, onChange: (v: string) => void) {
  const start = textarea.selectionStart
  const end = textarea.selectionEnd
  const selected = value.slice(start, end)

  let newValue: string
  let cursorStart: number
  let cursorEnd: number

  if (action.wrap) {
    const s = action.syntax
    if (selected) {
      newValue = value.slice(0, start) + s + selected + s + value.slice(end)
      cursorStart = start + s.length
      cursorEnd = end + s.length
    } else {
      newValue = value.slice(0, start) + s + s + value.slice(end)
      cursorStart = start + s.length
      cursorEnd = start + s.length
    }
  } else if (action.block) {
    const lineStart = value.lastIndexOf('\n', start - 1) + 1
    newValue = value.slice(0, lineStart) + action.syntax + value.slice(lineStart)
    cursorStart = start + action.syntax.length
    cursorEnd = end + action.syntax.length
  } else {
    newValue = value.slice(0, start) + action.syntax + value.slice(end)
    cursorStart = start + action.syntax.length
    cursorEnd = cursorStart
  }

  onChange(newValue)
  setTimeout(() => {
    textarea.focus()
    textarea.setSelectionRange(cursorStart, cursorEnd)
  }, 0)
}

export function MarkdownEditor({ value, onChange, placeholder }: Props) {
  const [tab, setTab] = useState<'edit' | 'preview'>('edit')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  return (
    <div className="flex flex-col border border-ui-border-soft rounded-xl overflow-hidden">
      {/* Tabs + Toolbar */}
      <div className="flex items-center justify-between px-2 py-1.5 bg-surface-soft border-b border-ui-border-soft">
        {/* Tab switcher */}
        <div className="flex gap-0.5">
          <button
            type="button"
            onClick={() => setTab('edit')}
            className={`text-[11px] font-medium px-2.5 py-1 rounded-md transition-colors ${
              tab === 'edit' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Editar
          </button>
          <button
            type="button"
            onClick={() => setTab('preview')}
            className={`text-[11px] font-medium px-2.5 py-1 rounded-md transition-colors ${
              tab === 'preview' ? 'bg-white text-slate-700 shadow-sm' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            Preview
          </button>
        </div>

        {/* Toolbar (only in edit mode) */}
        {tab === 'edit' && (
          <div className="flex items-center gap-0.5">
            {TOOLBAR_ACTIONS.map((action) => (
              <button
                key={action.label}
                type="button"
                title={action.label}
                onClick={() => textareaRef.current && applyAction(textareaRef.current, action, value, onChange)}
                className="p-1.5 rounded text-slate-400 hover:text-slate-700 hover:bg-white transition-colors"
              >
                {action.icon}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Edit mode */}
      {tab === 'edit' && (
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? 'Escreva em Markdown...'}
          rows={14}
          className="w-full text-sm font-mono text-slate-700 bg-white px-3 py-3 resize-none focus:outline-none leading-relaxed placeholder:text-slate-300"
        />
      )}

      {/* Preview mode */}
      {tab === 'preview' && (
        <div className="min-h-[224px] px-4 py-3 bg-white overflow-y-auto">
          {value.trim() ? (
            <div className="prose prose-sm prose-slate max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{value}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-sm text-slate-300 italic">Nenhum conteúdo para exibir.</p>
          )}
        </div>
      )}
    </div>
  )
}
