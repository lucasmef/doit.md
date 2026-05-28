'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createItem, updateItem, useItem, useItems } from '@/hooks/use-items'
import { createProject, useProjects } from '@/hooks/use-projects'
import { useUI } from '@/store/ui'
import { useToast } from '@/components/ui/toast'
import { useDialog } from '@/components/ui/dialog'
import { MarkdownEditor } from './markdown-editor'
import { isTypingTarget } from '@/hooks/use-keyboard'
import { PRIORITY_CONFIG } from './priority-select'
import { FolderGlyph, flattenFolderOptions } from '@/components/folders/folder-options'
import { RecurrencePopover } from './recurrence-popover'
import { CaptureModeTabs, createCaptureSwipeHandlers } from '@/components/capture/capture-mode-tabs'
import type { Priority } from './priority-select'
import type { ItemComplexity, ItemRecurrence } from '@doit/types'
import { formatRecurrenceLabel } from '@doit/core'

type ItemMode = Extract<ItemComplexity, 'task' | 'note'>
type Popover = 'date' | 'priority' | 'recurrence' | 'tags' | 'folder' | null
type ActiveShortcut =
  | { kind: 'tag'; query: string; start: number; end: number }
  | { kind: 'folder'; query: string; start: number; end: number }
  | { kind: 'priority'; query: string; start: number; end: number }

const PRIORITY_SHORTCUT = /(?:^|\s)p([1-4])\b/i
const FOLDER_SHORTCUT = /(?:^|\s)#([\p{L}\p{N}][\p{L}\p{N}_-]*)/iu
const TAG_SHORTCUT = /(?:^|\s)@([\p{L}\p{N}][\p{L}\p{N}_-]*)/giu
const TIME_SHORTCUT = /(?:^|\s)(?:as\s+|\u00e0s\s+)?([01]?\d|2[0-3])(?::([0-5]\d)|h([0-5]\d)?)\b/iu
const INLINE_METADATA_PATTERN =
  /(\bp[1-4]\b|[@#][\p{L}\p{N}][\p{L}\p{N}_-]*|(?:^|\s)(?:hoje|amanh(?:a|\u00e3)|depois de amanh(?:a|\u00e3)|fim de semana|final de semana|semana que vem|segunda(?:-feira)?|ter(?:c|\u00e7)a(?:-feira)?|quarta(?:-feira)?|quinta(?:-feira)?|sexta(?:-feira)?|s(?:a|\u00e1)bado|domingo)(?=$|\s|[,.!?])|\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b|\b\d{4}-\d{2}-\d{2}\b|\b(?:as\s+|\u00e0s\s+)?(?:[01]?\d|2[0-3])(?::[0-5]\d|h[0-5]\d?)\b)/giu
const DATE_WORD_SHORTCUT =
  /(?:^|\s)(hoje|amanh(?:a|\u00e3)|depois de amanh(?:a|\u00e3)|fim de semana|final de semana|semana que vem|segunda(?:-feira)?|ter(?:c|\u00e7)a(?:-feira)?|quarta(?:-feira)?|quinta(?:-feira)?|sexta(?:-feira)?|s(?:a|\u00e1)bado|domingo)(?=$|\s|[,.!?])/iu
const SLASH_DATE_SHORTCUT = /(?:^|\s)(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/u
const ISO_DATE_SHORTCUT = /(?:^|\s)(\d{4}-\d{2}-\d{2})\b/u
const PRIORITIES: Priority[] = [1, 2, 3, 4]
const DRAFT_KEY = 'doit:quick-capture-draft'

type QuickCaptureDraft = {
  title: string
  contentMd: string
  complexity: ItemMode
  dueDate: string
  dueTime: string
  projectId: string
  tags: string[]
  priority: Priority
  recurrence: ItemRecurrence | ''
}

function loadDraft(): Partial<QuickCaptureDraft> | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    return JSON.parse(raw) as Partial<QuickCaptureDraft>
  } catch {
    return null
  }
}

function saveDraft(draft: QuickCaptureDraft) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  } catch {
    // ignore quota errors
  }
}

function clearDraft() {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(DRAFT_KEY)
  } catch {
    // ignore
  }
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function todayDate() {
  return toDateInputValue(new Date())
}

function formatDueDate(dateStr: string) {
  const today = todayDate()
  const tomorrow = dateAfter(1)
  if (dateStr === today) return 'Hoje'
  if (dateStr === tomorrow) return 'AmanhÃ£'
  const date = new Date(`${dateStr}T12:00:00`)
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function formatTimeLabel(time: string) {
  if (!time) return ''
  const [hour, minute] = time.split(':')
  const date = new Date()
  date.setHours(Number(hour), Number(minute), 0, 0)
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function dateAfter(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return toDateInputValue(date)
}

function nextWeekday(targetDay: number, minimumDays = 1) {
  const date = new Date()
  let days = (targetDay - date.getDay() + 7) % 7
  if (days < minimumDays) days += 7
  date.setDate(date.getDate() + days)
  return toDateInputValue(date)
}

function laterThisWeekDate() {
  const day = new Date().getDay()
  if (day <= 3) return nextWeekday(5)
  return dateAfter(1)
}

const DATE_SUGGESTIONS = [
  { label: 'Hoje', getValue: todayDate },
  { label: 'AmanhÃ£', getValue: () => dateAfter(1) },
  { label: 'Mais tarde essa semana', getValue: laterThisWeekDate },
  { label: 'Final de semana', getValue: () => nextWeekday(6) },
  { label: 'Semana que vem', getValue: () => nextWeekday(1) },
]
const TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const hour = Math.floor(index / 2)
    .toString()
    .padStart(2, '0')
  const minute = index % 2 === 0 ? '00' : '30'
  return `${hour}:${minute}`
})
const TIME_SUGGESTIONS = ['09:00', '12:00', '18:00', '20:00']

function cleanTitle(value: string) {
  return value
    .replace(/(?:^|\s)p[1-4]\b/gi, ' ')
    .replace(/(?:^|\s)#[\p{L}\p{N}][\p{L}\p{N}_-]*/giu, ' ')
    .replace(/(?:^|\s)@[\p{L}\p{N}][\p{L}\p{N}_-]*/giu, ' ')
    .replace(DATE_WORD_SHORTCUT, ' ')
    .replace(SLASH_DATE_SHORTCUT, ' ')
    .replace(ISO_DATE_SHORTCUT, ' ')
    .replace(TIME_SHORTCUT, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function titleFromNoteContent(content: string) {
  const firstLine =
    content
      .split(/\r?\n/)
      .find((line) => line.trim())
      ?.trim() ?? ''
  return firstLine
    .replace(/^#{1,6}\s+/, '')
    .replace(/[*_`[\]]/g, '')
    .trim()
}

function parseBatchTaskLines(value: string) {
  return value
    .split(/\r?\n/)
    .map((line) => cleanTitle(line))
    .filter(Boolean)
}

function insertPastedTitle(current: string, pasted: string, start: number, end: number) {
  return `${current.slice(0, start)}${pasted.replace(/\s*\r?\n\s*/g, ' ')}${current.slice(end)}`
    .replace(/\s+/g, ' ')
    .trimStart()
}

function normalizeToken(value: string) {
  return value.trim().toLocaleLowerCase('pt-BR')
}

function isCategorizerToken(value: string) {
  return (
    /^p[1-4]?$/i.test(value) ||
    /^[@#][\p{L}\p{N}][\p{L}\p{N}_-]*$/iu.test(value) ||
    DATE_WORD_SHORTCUT.test(` ${value}`) ||
    SLASH_DATE_SHORTCUT.test(` ${value}`) ||
    ISO_DATE_SHORTCUT.test(` ${value}`) ||
    TIME_SHORTCUT.test(` ${value}`)
  )
}

function folderIdOf(project: { id?: string; _id?: string }) {
  return project.id ?? (project as unknown as { _id?: string })._id ?? ''
}

function slugToken(value: string) {
  return normalizeToken(value)
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}_-]/giu, '')
}

function parseSlashDate(dayText: string, monthText: string, yearText?: string) {
  const day = Number(dayText)
  const month = Number(monthText)
  const now = new Date()
  let year = yearText ? Number(yearText) : now.getFullYear()
  if (yearText?.length === 2) year += 2000
  if (!day || !month || month > 12 || day > 31) return ''

  let date = new Date(year, month - 1, day)
  if (!yearText && toDateInputValue(date) < todayDate()) {
    date = new Date(year + 1, month - 1, day)
  }
  if (date.getDate() !== day || date.getMonth() !== month - 1) return ''
  return toDateInputValue(date)
}

function parseDateWord(value: string) {
  const token = normalizeToken(value)
  if (token === 'hoje') return todayDate()
  if (token === 'amanha' || token === 'amanhã') return dateAfter(1)
  if (token === 'depois de amanha' || token === 'depois de amanhã') return dateAfter(2)
  if (token === 'fim de semana' || token === 'final de semana') return nextWeekday(6)
  if (token === 'semana que vem') return nextWeekday(1)

  const weekdays: Record<string, number> = {
    domingo: 0,
    segunda: 1,
    'segunda-feira': 1,
    terca: 2,
    terça: 2,
    'terca-feira': 2,
    'terça-feira': 2,
    quarta: 3,
    'quarta-feira': 3,
    quinta: 4,
    'quinta-feira': 4,
    sexta: 5,
    'sexta-feira': 5,
    sabado: 6,
    sábado: 6,
  }
  const weekday = weekdays[token]
  return weekday === undefined ? '' : nextWeekday(weekday)
}

function parseInlineDueDate(value: string) {
  const wordMatch = value.match(DATE_WORD_SHORTCUT)
  if (wordMatch?.[1]) return parseDateWord(wordMatch[1])

  const slashMatch = value.match(SLASH_DATE_SHORTCUT)
  if (slashMatch?.[1] && slashMatch[2])
    return parseSlashDate(slashMatch[1], slashMatch[2], slashMatch[3])

  const isoMatch = value.match(ISO_DATE_SHORTCUT)
  if (isoMatch?.[1] && !Number.isNaN(new Date(`${isoMatch[1]}T12:00:00`).getTime()))
    return isoMatch[1]

  return ''
}

function parseInlineDueTime(value: string) {
  const match = value.match(TIME_SHORTCUT)
  if (!match?.[1]) return ''
  const hour = match[1].padStart(2, '0')
  const minute = match[2] ?? match[3] ?? '00'
  return `${hour}:${minute.padStart(2, '0')}`
}

function activeShortcut(value: string, cursor: number): ActiveShortcut | null {
  const beforeCursor = value.slice(0, cursor)
  const match = beforeCursor.match(/(^|\s)([@#][\p{L}\p{N}_-]*|p[1-4]?)$/iu)
  if (!match?.[2]) return null

  const token = match[2]
  const start = beforeCursor.length - token.length
  if (token.startsWith('@'))
    return { kind: 'tag', query: normalizeToken(token.slice(1)), start, end: cursor }
  if (token.startsWith('#'))
    return { kind: 'folder', query: normalizeToken(token.slice(1)), start, end: cursor }
  return { kind: 'priority', query: token.toUpperCase(), start, end: cursor }
}

function IconNote({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      aria-hidden="true"
    >
      <path d="M6 3h9l3 3v15H6z" />
      <path d="M14 3v4h4" />
      <path d="M9 12h6M9 16h4" />
    </svg>
  )
}

function IconCalendar({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      aria-hidden="true"
    >
      <path d="M7 3v3M17 3v3M4 8h16M5 5h14v16H5z" />
    </svg>
  )
}

function IconFlag({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      aria-hidden="true"
    >
      <path d="M5 21V4" />
      <path d="M5 5s2-1 5-1 5 2 8 1v9c-3 1-5-1-8-1s-5 1-5 1" />
    </svg>
  )
}

function IconTag({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      aria-hidden="true"
    >
      <path d="M20 13 13 20 4 11V4h7z" />
      <path d="M8 8h.01" />
    </svg>
  )
}

function IconInbox({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      aria-hidden="true"
    >
      <path d="M4 5h16l-2 10H6z" />
      <path d="M8 15c.6 1.5 1.8 2 4 2s3.4-.5 4-2" />
      <path d="M4 15v4h16v-4" />
    </svg>
  )
}

function IconCheck({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
    >
      <path d="m5 12 4 4L19 6" />
    </svg>
  )
}

function IconRepeat({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      aria-hidden="true"
    >
      <path d="m17 2 4 4-4 4" />
      <path d="M3 11V9a3 3 0 0 1 3-3h15" />
      <path d="m7 22-4-4 4-4" />
      <path d="M21 13v2a3 3 0 0 1-3 3H3" />
    </svg>
  )
}

function IconPlus({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2}>
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  )
}

function ToolButton({
  children,
  active,
  onClick,
  title,
}: {
  children: React.ReactNode
  active?: boolean
  onClick: () => void
  title: string
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`inline-flex h-10 items-center gap-1.5 rounded-[10px] border px-3 text-[12px] font-medium transition-colors sm:h-7 sm:px-2 ${
        active
          ? 'border-ui-border-selected bg-surface-selected text-brand-700'
          : 'border-ui-border-soft bg-surface-soft text-slate-500 hover:bg-white hover:text-slate-800'
      }`}
    >
      {children}
    </button>
  )
}

function HighlightedTitleInput({
  value,
  onChange,
  onCursorChange,
  placeholder,
  inputRef,
  onPaste,
  onKeyDown,
}: {
  value: string
  onChange: (value: string) => void
  onCursorChange: (cursor: number) => void
  placeholder: string
  inputRef?: React.RefObject<HTMLTextAreaElement | null>
  onPaste?: (event: React.ClipboardEvent<HTMLTextAreaElement>) => void
  onKeyDown?: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void
}) {
  const parts = value.split(INLINE_METADATA_PATTERN)

  useEffect(() => {
    const el = inputRef?.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value, inputRef])

  return (
    <div className="relative min-w-0 flex-1">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words text-[16px] font-semibold leading-6"
      >
        {parts.map((part, index) => {
          if (!part) return null
          if (isCategorizerToken(part)) {
            return (
              <span
                key={`${part}-${index}`}
                className="rounded-[6px] bg-surface-soft px-1 text-slate-700"
              >
                {part}
              </span>
            )
          }
          return (
            <span key={`${part}-${index}`} className="text-slate-900">
              {part}
            </span>
          )
        })}
      </div>
      <textarea
        ref={inputRef}
        value={value}
        autoFocus
        rows={1}
        onChange={(e) => {
          onChange(e.target.value)
          onCursorChange(e.target.selectionStart ?? e.target.value.length)
        }}
        onPaste={onPaste}
        onClick={(e) => onCursorChange(e.currentTarget.selectionStart ?? value.length)}
        onKeyDown={onKeyDown}
        onKeyUp={(e) => onCursorChange(e.currentTarget.selectionStart ?? value.length)}
        placeholder={placeholder}
        className="relative w-full resize-none overflow-hidden border-none bg-transparent text-[16px] font-semibold leading-6 text-transparent caret-slate-900 outline-none placeholder:text-slate-300 selection:bg-brand-100"
      />
    </div>
  )
}

export function QuickCapture() {
  const pathname = usePathname()
  const {
    quickCaptureOpen,
    setQuickCaptureOpen,
    quickCaptureFolderId,
    setQuickCaptureFolderId,
    quickCaptureEditId,
    setQuickCaptureEditId,
    setSingleSelection,
    markPendingEmptyNote,
    openCalendarEventCapture,
    captureMode,
    openCapture,
  } = useUI()
  const editMode = !!quickCaptureEditId
  const isOpen = quickCaptureOpen || editMode
  const { item: editItem } = useItem(editMode ? quickCaptureEditId : null)
  const { toast } = useToast()
  const { confirm } = useDialog()
  const { projects: activeFoldersShim } = useProjects()
  const { items } = useItems()
  const [title, setTitle] = useState('')
  const [contentMd, setContentMd] = useState('')
  const [complexity, setComplexity] = useState<ItemMode>('task')
  const [dueDate, setDueDate] = useState('')
  const [dueTime, setDueTime] = useState('')
  const [folderId, setFolderId] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [priority, setPriority] = useState<Priority>(4)
  const [recurrence, setRecurrence] = useState<ItemRecurrence | ''>('')
  const [tagQuery, setTagQuery] = useState('')
  const [folderQuery, setProjectQuery] = useState('')
  const [titleCursor, setTitleCursor] = useState(0)
  const [saving, setSaving] = useState(false)
  const [creatingFolder, setCreatingProject] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [popover, setPopover] = useState<Popover>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const activeFolders = activeFoldersShim.filter((p) => p.status !== 'archived')
  const folderOptions = useMemo(() => flattenFolderOptions(activeFolders), [activeFolders])
  const selectedFolder = activeFolders.find((p) => folderIdOf(p) === folderId)
  const isTodayContext = pathname === '/today'
  const isNote = complexity === 'note'
  const swipeHandlers = createCaptureSwipeHandlers({
    mode: isNote ? 'note' : 'task',
    onExpand: () => setExpanded(true),
    onModeChange: (nextMode) => {
      if (nextMode === 'event') {
        openCapture('event', dueDate || null)
        return
      }
      openCapture(nextMode)
      handleComplexityChange(nextMode)
    },
  })

  const knownTags = useMemo(() => {
    return Array.from(new Set(items.flatMap((item) => item.tags ?? []).map(normalizeToken))).sort()
  }, [items])

  const filteredTags = knownTags.filter((tag) => {
    const query = normalizeToken(tagQuery)
    return !tags.includes(tag) && (!query || tag.includes(query))
  })

  const filteredFolders = folderOptions.filter(({ folder: project }) => {
    const query = normalizeToken(folderQuery)
    return !query || normalizeToken(project.name).includes(query)
  })

  const shortcut = !isNote ? activeShortcut(title, titleCursor) : null
  const shortcutTags =
    shortcut?.kind === 'tag'
      ? knownTags
          .filter((tag) => !tags.includes(tag) && (!shortcut.query || tag.includes(shortcut.query)))
          .slice(0, 8)
      : []
  const shortcutFolders =
    shortcut?.kind === 'folder'
      ? folderOptions
          .filter(({ folder: project }) => {
            const query = shortcut.query
            const name = normalizeToken(project.name)
            const slug = slugToken(project.name)
            return !query || name.includes(query) || slug.includes(query)
          })
          .slice(0, 8)
      : []
  const shortcutPriorities =
    shortcut?.kind === 'priority'
      ? PRIORITIES.filter((p) =>
          `p${p}`.startsWith(shortcut.query.toLocaleLowerCase('pt-BR') || 'p'),
        ).map((p) => ({ value: p, config: PRIORITY_CONFIG[p] }))
      : []

  function closeAll() {
    setQuickCaptureOpen(false)
    setQuickCaptureEditId(null)
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        if (isTypingTarget(e.target) && !isOpen) return
        if (popover) setPopover(null)
        else closeAll()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popover, isOpen, setQuickCaptureOpen])

  useEffect(() => {
    if (isOpen) {
      if (editMode && editItem) {
        setTitle(editItem.title ?? '')
        setContentMd(editItem.contentMd ?? '')
        setComplexity((editItem.complexity === 'note' ? 'note' : 'task') as ItemMode)
        setDueDate(editItem.dueDate ?? '')
        setDueTime(editItem.dueTime ?? '')
        setFolderId(editItem.folderId ?? '')
        setTags(editItem.tags ?? [])
        setPriority(((editItem.priority as Priority) ?? 4) as Priority)
        setRecurrence((editItem.recurrence ?? '') as ItemRecurrence | '')
      } else if (quickCaptureOpen) {
        const draft = loadDraft()
        if (draft) {
          const nextComplexity = captureMode === 'note' ? 'note' : 'task'
          setTitle(draft.title ?? '')
          setContentMd(draft.contentMd ?? '')
          setComplexity(nextComplexity)
          setDueDate(nextComplexity === 'task' ? draft.dueDate ?? (isTodayContext ? todayDate() : '') : '')
          setDueTime(nextComplexity === 'task' ? draft.dueTime ?? '' : '')
          setFolderId(draft.projectId ?? quickCaptureFolderId ?? '')
          setTags(draft.tags ?? [])
          setPriority((draft.priority as Priority) ?? 4)
          setRecurrence((draft.recurrence as ItemRecurrence | '') ?? '')
        } else {
          setComplexity(captureMode === 'note' ? 'note' : 'task')
          setDueDate(isTodayContext ? todayDate() : '')
          if (quickCaptureFolderId) {
            setFolderId(quickCaptureFolderId)
          } else {
            const folderMatch = pathname?.match(/^\/notas\/([^/]+)/)
            if (folderMatch?.[1]) setFolderId(folderMatch[1])
          }
        }
      }
      const focusInput = () => {
        const el = inputRef.current
        if (!el) return
        el.focus()
        const len = el.value.length
        try {
          el.setSelectionRange(len, len)
        } catch {
          // ignore (some input types disallow setSelectionRange)
        }
      }
      requestAnimationFrame(focusInput)
      setTimeout(focusInput, 80)
    } else {
      setTitle('')
      setContentMd('')
      setComplexity('task')
      setDueDate('')
      setDueTime('')
      setFolderId('')
      setTags([])
      setPriority(4)
      setRecurrence('')
      setTagQuery('')
      setProjectQuery('')
      setTitleCursor(0)
      setPopover(null)
      setExpanded(false)
      setQuickCaptureFolderId(null)
    }
  }, [isOpen, editMode, editItem?.id, captureMode, isTodayContext, quickCaptureFolderId, pathname, setQuickCaptureFolderId])

  useEffect(() => {
    if (!quickCaptureOpen || editMode) return
    const hasContent = !!title.trim() || !!contentMd.trim()
    if (hasContent) {
      saveDraft({
        title,
        contentMd,
        complexity,
        dueDate,
        dueTime,
        projectId: folderId,
        tags,
        priority,
        recurrence,
      })
    } else {
      clearDraft()
    }
  }, [quickCaptureOpen, editMode, title, contentMd, complexity, dueDate, dueTime, folderId, tags, priority, recurrence])

  function applyTitleShortcuts(value: string) {
    setTitle(value)

    const priorityMatch = value.match(PRIORITY_SHORTCUT)
    if (priorityMatch?.[1] && complexity === 'task') {
      setPriority(Number(priorityMatch[1]) as Priority)
    }

    const projectMatch = value.match(FOLDER_SHORTCUT)
    const projectToken = projectMatch?.[1]
    if (projectToken) {
      const wanted = normalizeToken(projectToken.replace(/-/g, ' '))
      const project = activeFolders.find(
        (p) =>
          normalizeToken(p.name) === wanted ||
          normalizeToken(p.name).replace(/\s+/g, '-') === normalizeToken(projectToken),
      )
      if (project) setFolderId(folderIdOf(project))
    }

    const foundTags = Array.from(value.matchAll(TAG_SHORTCUT))
      .map((m) => m[1])
      .filter(Boolean) as string[]
    if (foundTags.length > 0) {
      setTags(Array.from(new Set(foundTags.map((tag) => normalizeToken(tag)))))
    }

    const inlineDueDate = parseInlineDueDate(value)
    if (inlineDueDate && complexity === 'task') {
      setDueDate(inlineDueDate)
    }

    const inlineDueTime = parseInlineDueTime(value)
    if (inlineDueTime && complexity === 'task') {
      setDueTime(inlineDueTime)
      if (!inlineDueDate && !dueDate) setDueDate(todayDate())
    }
  }

  function handleComplexityChange(next: ItemMode) {
    setComplexity(next)
    if (next === 'note') {
      setPriority(4)
      setRecurrence('')
      setDueDate('')
      setDueTime('')
    } else if (!dueDate && isTodayContext) {
      setDueDate(todayDate())
    }
  }

  function handleRecurrenceChange(next: ItemRecurrence | '') {
    setRecurrence(next)
    if (next && !dueDate) setDueDate(todayDate())
    setPopover(null)
  }

  function handleDueTimeChange(next: string) {
    setDueTime(next)
    if (next && !dueDate) setDueDate(todayDate())
  }

  function addTag(value: string) {
    const tag = normalizeToken(value).replace(/^@/, '')
    if (!tag) return
    setTags((current) => Array.from(new Set([...current, tag])))
    setTagQuery('')
  }

  function replaceShortcut(token: string) {
    if (!shortcut) return
    const nextTitle = `${title.slice(0, shortcut.start)}${token}${title.slice(shortcut.end)}`
    const insertAt = shortcut.start + token.length
    const spacer = nextTitle[insertAt] === ' ' ? '' : ' '
    const finalTitle = `${nextTitle.slice(0, insertAt)}${spacer}${nextTitle.slice(insertAt)}`
    const nextCursor = insertAt + spacer.length
    setTitle(finalTitle)
    setTitleCursor(nextCursor)
    setTimeout(() => {
      inputRef.current?.focus()
      inputRef.current?.setSelectionRange(nextCursor, nextCursor)
    }, 0)
  }

  function selectShortcutTag(tag: string) {
    addTag(tag)
    replaceShortcut(`@${tag}`)
  }

  function selectShortcutFolder(project: { id?: string; _id?: string; name: string }) {
    setFolderId(folderIdOf(project))
    replaceShortcut(`#${slugToken(project.name)}`)
  }

  function selectShortcutPriority(next: Priority) {
    setPriority(next)
    replaceShortcut(`p${next}`)
  }

  async function addFolder(value: string) {
    const name = value.trim()
    if (!name) return

    const existing = activeFolders.find(
      (project) => normalizeToken(project.name) === normalizeToken(name),
    )
    if (existing) {
      setFolderId(folderIdOf(existing))
      setProjectQuery('')
      setPopover(null)
      return
    }

    setCreatingProject(true)
    try {
      const project = await createProject({ name })
      const id = folderIdOf(project)
      if (id) setFolderId(id)
      setProjectQuery('')
      setPopover(null)
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Erro ao criar pasta.', 'error')
    } finally {
      setCreatingProject(false)
    }
  }

  async function handleOpenFullscreen() {
    if (saving) return
    setSaving(true)
    try {
      const trimmedContent = contentMd.trim()
      const parsedTitle = titleFromNoteContent(contentMd)
      const item = await createItem({
        title: parsedTitle,
        complexity: 'note',
        status: !folderId ? 'inbox' : 'todo',
        contentMd: trimmedContent || undefined,
        folderId: folderId || undefined,
        tags,
      })
      clearDraft()
      closeAll()
      if (item?.id) {
        if (!parsedTitle && !trimmedContent) markPendingEmptyNote(item.id)
        setSingleSelection(item.id)
      }
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Erro ao criar nota.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function submitAndContinue() {
    if (saving) return
    if (editMode) {
      await handleSubmit({ preventDefault: () => {} } as React.FormEvent)
      return
    }
    const parsedTitle = isNote ? titleFromNoteContent(contentMd) : cleanTitle(title)
    if (!parsedTitle) return

    setSaving(true)
    try {
      const inboxContext = !folderId && !dueDate
      await createItem({
        title: parsedTitle,
        complexity,
        status: inboxContext ? 'inbox' : 'todo',
        contentMd: contentMd.trim() || undefined,
        dueDate: dueDate || undefined,
        dueTime: dueDate && dueTime ? dueTime : undefined,
        folderId: folderId || undefined,
        tags,
        priority: complexity === 'task' && priority < 4 ? priority : undefined,
        recurrence: complexity === 'task' && recurrence ? recurrence : undefined,
      })
      toast('Item criado', 'success')
      setTitle('')
      setContentMd('')
      setTitleCursor(0)
      clearDraft()
      requestAnimationFrame(() => inputRef.current?.focus())
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Erro ao criar item.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsedTitle = isNote ? titleFromNoteContent(contentMd) : cleanTitle(title)
    if (!parsedTitle) return

    setSaving(true)
    try {
      if (editMode && quickCaptureEditId) {
        await updateItem(quickCaptureEditId, {
          title: parsedTitle,
          complexity,
          contentMd: contentMd.trim(),
          dueDate: complexity === 'task' ? dueDate || '' : '',
          dueTime: complexity === 'task' && dueDate ? dueTime || '' : '',
          folderId: folderId || '',
          tags,
          priority: complexity === 'task' && priority < 4 ? priority : null,
          recurrence: complexity === 'task' && recurrence ? recurrence : '',
        } as never)
        toast('Item atualizado', 'success')
      } else {
        const inboxContext = !folderId && !dueDate
        await createItem({
          title: parsedTitle,
          complexity,
          status: inboxContext ? 'inbox' : 'todo',
          contentMd: contentMd.trim() || undefined,
          dueDate: dueDate || undefined,
          dueTime: dueDate && dueTime ? dueTime : undefined,
          folderId: folderId || undefined,
          tags,
          priority: complexity === 'task' && priority < 4 ? priority : undefined,
          recurrence: complexity === 'task' && recurrence ? recurrence : undefined,
        })
        clearDraft()
        toast('Item criado com sucesso', 'success')
      }
      closeAll()
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Erro ao salvar item.', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function createTasksFromLines(lines: string[]) {
    if (lines.length === 0) return

    setSaving(true)
    try {
      const inboxContext = !folderId && !dueDate
      await Promise.all(
        lines.map((line) =>
          createItem({
            title: line,
            complexity: 'task',
            status: inboxContext ? 'inbox' : 'todo',
            contentMd: contentMd.trim() || undefined,
            dueDate: dueDate || undefined,
            dueTime: dueDate && dueTime ? dueTime : undefined,
            folderId: folderId || undefined,
            tags,
            priority: priority < 4 ? priority : undefined,
            recurrence: recurrence ? recurrence : undefined,
          }),
        ),
      )
      clearDraft()
      setQuickCaptureOpen(false)
      toast(`${lines.length} tarefas criadas`, 'success')
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Erro ao criar tarefas.', 'error')
    } finally {
      setSaving(false)
    }
  }

  function handleTitlePaste(event: React.ClipboardEvent<HTMLTextAreaElement>) {
    if (isNote || saving) return

    const pasted = event.clipboardData.getData('text')
    const lines = parseBatchTaskLines(pasted)
    if (lines.length <= 1) return

    event.preventDefault()
    const start = event.currentTarget.selectionStart ?? title.length
    const end = event.currentTarget.selectionEnd ?? start
    void confirm({
      title: 'Adicionar varias tarefas',
      message: `Deseja adicionar ${lines.length} tarefas? Cada linha sera uma tarefa.`,
      confirmLabel: 'Adicionar todas',
      cancelLabel: 'Colar como uma',
    }).then((ok) => {
      if (ok) {
        void createTasksFromLines(lines)
        return
      }
      const pastedInline = pasted.replace(/\s*\r?\n\s*/g, ' ')
      const nextTitle = insertPastedTitle(title, pasted, start, end)
      applyTitleShortcuts(nextTitle)
      const nextCursor = start + pastedInline.length
      setTitleCursor(nextCursor)
      setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.setSelectionRange(nextCursor, nextCursor)
      }, 0)
    })
  }

  if (!isOpen) return null
  if (editMode && !editItem) return null

  const saveDisabled = (isNote ? !titleFromNoteContent(contentMd) : !cleanTitle(title)) || saving
  const isExpanded = editMode || expanded
  const canSwitchMode =
    !isNote || contentMd.split(/\r?\n/).filter((line) => line.trim()).length <= 1
  const priorityConfig = PRIORITY_CONFIG[priority]
  const recurrenceLabel = formatRecurrenceLabel(recurrence, dueDate)

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-navy-900/32 p-0 backdrop-blur-md sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) closeAll()
      }}
      {...swipeHandlers}
    >
      <div
        className={
          isExpanded
            ? `w-full overflow-hidden border border-white/65 bg-white shadow-[0_30px_80px_-20px_rgba(15,35,66,.30),0_14px_30px_-10px_rgba(15,35,66,.18)] sm:max-h-none sm:overflow-visible sm:rounded-[24px] ${
                isNote
                  ? `h-full max-h-none rounded-none border-0 sm:h-auto sm:max-w-[720px] sm:rounded-[24px] sm:border`
                  : 'max-h-[calc(100dvh-1rem)] max-w-[560px] rounded-t-[24px]'
              }`
            : 'w-full max-w-[500px] overflow-hidden bg-white/92 backdrop-blur-[24px] p-3 rounded-t-[30px] border border-white/76 shadow-[0_-28px_70px_-36px_rgba(15,35,66,0.64)] sm:rounded-[28px] sm:shadow-[0_34px_90px_-42px_rgba(15,35,66,0.58),0_10px_26px_rgba(15,35,66,0.1),0_1px_0_rgba(255,255,255,0.76)_inset]'
        }
      >
        <form
          onSubmit={handleSubmit}
          className={`flex flex-col sm:max-h-none ${isExpanded ? (isNote ? 'h-full' : 'max-h-[calc(100dvh-1rem)]') : ''}`}
        >
          {!isExpanded ? (
            <div className="w-full">
              <div className="mb-3 flex items-center justify-between">
                <CaptureModeTabs
                  mode={isNote ? 'note' : 'task'}
                  onModeChange={(nextMode) => {
                    if (nextMode === 'event') {
                      openCapture('event', dueDate || null)
                      return
                    }
                    openCapture(nextMode)
                    handleComplexityChange(nextMode)
                  }}
                />
              </div>

              <div className="flex items-center gap-2 rounded-[20px] border border-white/70 bg-white/76 p-1.5 shadow-cool-sm backdrop-blur-md">
                <input
                  ref={inputRef as any}
                  value={title}
                  onChange={(e) => {
                    applyTitleShortcuts(e.target.value)
                    setTitleCursor(e.target.selectionStart ?? e.target.value.length)
                  }}
                  onPaste={handleTitlePaste as any}
                  onClick={(e) => setTitleCursor(e.currentTarget.selectionStart ?? title.length)}
                  onKeyDown={(e) => {
                    if (
                      e.key === 'Enter' &&
                      !e.shiftKey &&
                      !e.metaKey &&
                      !e.ctrlKey &&
                      !e.altKey
                    ) {
                      e.preventDefault()
                      void submitAndContinue()
                    }
                  }}
                  placeholder={isNote ? 'Escreva uma nota...' : 'Nome da tarefa...'}
                  className="min-w-0 flex-1 border-none bg-transparent px-2.5 py-1.5 text-[15px] font-medium leading-5 text-navy-900 outline-none placeholder:text-navy-300"
                />
                <button
                  type="button"
                  onClick={() => setExpanded(true)}
                  className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl bg-white/60 text-navy-500 shadow-sm transition-colors hover:bg-white hover:text-navy-900"
                  aria-label="Expandir"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                </button>
                <button
                  type="submit"
                  disabled={saveDisabled}
                  className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[14px] bg-brand-600 text-white shadow-[0_4px_12px_-4px_rgba(47,107,255,0.6)] transition-colors hover:bg-brand-700 disabled:opacity-40"
                  aria-label="Adicionar"
                >
                  <IconPlus className="h-5 w-5" />
                </button>
              </div>

              {!isNote && dueDate && (
                <div className="mt-[7px] mx-[5px] flex min-h-[18px] items-center gap-[6px] font-mono text-[10.5px] leading-[1.35] text-slate-500">
                  <span className="h-[5px] w-[5px] rounded-full bg-[#28C7B7] shadow-[0_0_7px_rgba(40,199,183,0.85)]"></span>
                  <span>
                    Detectado: <b className="font-[850] text-navy-900">{formatDueDate(dueDate).toLowerCase()}</b>
                    {dueTime && <> · <b className="font-[850] text-navy-900">{dueTime}</b></>}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <>
              {!editMode && (
            <div className="shrink-0 border-b border-navy-900/[0.04] bg-white px-4 pb-3 pt-3">
              {!isExpanded && (
                <button
                  type="button"
                  onClick={() => setExpanded(true)}
                  className="mx-auto mb-3 block h-1.5 w-11 rounded-full bg-slate-300/80 sm:hidden"
                  aria-label="Expandir captura"
                  title="Expandir"
                />
              )}
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <CaptureModeTabs
                    mode={isNote ? 'note' : 'task'}
                    onModeChange={(nextMode) => {
                      if (nextMode === 'event') {
                        openCapture('event', dueDate || null)
                        return
                      }
                      openCapture(nextMode)
                      handleComplexityChange(nextMode)
                    }}
                  />
                </div>
                {isNote && (
                  <button
                    type="button"
                    title="Abrir em tela cheia"
                    aria-label="Abrir em tela cheia"
                    onClick={() => void handleOpenFullscreen()}
                    disabled={saving}
                    className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-[14px] border border-white/70 bg-white/56 text-slate-500 shadow-sm backdrop-blur transition-colors hover:bg-white hover:text-slate-800 disabled:opacity-50 sm:inline-flex"
                  >
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={1.8}
                      aria-hidden="true"
                    >
                      <path d="M4 9V4h5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M20 9V4h-5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M4 15v5h5" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M20 15v5h-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          )}
          {!isExpanded && (
            <div className="px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:hidden">
              <div className="flex items-end gap-2 rounded-[20px] border border-white/70 bg-white/76 p-2 shadow-cool-sm backdrop-blur">
                {isNote ? (
                  <textarea
                    value={contentMd}
                    onChange={(e) => setContentMd(e.target.value)}
                    placeholder="Escreva uma nota"
                    rows={1}
                    className="block min-h-10 flex-1 resize-none border-none bg-transparent px-1 py-2 text-[16px] font-medium leading-5 text-slate-900 outline-none placeholder:text-slate-300"
                  />
                ) : (
                  <textarea
                    ref={inputRef}
                    value={title}
                    onChange={(e) => {
                      applyTitleShortcuts(e.target.value)
                      setTitleCursor(e.target.selectionStart ?? e.target.value.length)
                    }}
                    onPaste={handleTitlePaste}
                    onClick={(e) => setTitleCursor(e.currentTarget.selectionStart ?? title.length)}
                    onKeyDown={(e) => {
                      if (
                        e.key === 'Enter' &&
                        !e.shiftKey &&
                        !e.metaKey &&
                        !e.ctrlKey &&
                        !e.altKey
                      ) {
                        e.preventDefault()
                        void submitAndContinue()
                      }
                    }}
                    placeholder="Nome da tarefa"
                    rows={1}
                    className="block min-h-10 flex-1 resize-none border-none bg-transparent px-1 py-2 text-[16px] font-semibold leading-5 text-slate-900 outline-none placeholder:text-slate-300"
                  />
                )}
                <button
                  type="submit"
                  disabled={saveDisabled}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-600 to-violet-600 text-white shadow-[0_8px_20px_-10px_rgba(47,107,255,.8)] transition-colors hover:from-brand-700 hover:to-violet-700 disabled:opacity-40"
                  aria-label="Adicionar"
                  title="Adicionar"
                >
                  <IconPlus className="h-5 w-5" />
                </button>
              </div>
            </div>
          )}
          <div className={`${isExpanded ? '' : 'hidden sm:block'} min-h-0 flex-1 overflow-y-auto bg-white px-6 pb-5 pt-5`}>
            <div className="flex items-center gap-3">
              {!isNote && (
                <HighlightedTitleInput
                  inputRef={inputRef}
                  value={title}
                  onChange={applyTitleShortcuts}
                  onPaste={handleTitlePaste}
                  onCursorChange={setTitleCursor}
                  onKeyDown={(e) => {
                    if (
                      e.key === 'Enter' &&
                      !e.shiftKey &&
                      !e.metaKey &&
                      !e.ctrlKey &&
                      !e.altKey
                    ) {
                      e.preventDefault()
                      void submitAndContinue()
                    }
                  }}
                  placeholder="Nome da tarefa"
                />
              )}
              {isNote && <div className="min-w-0 flex-1" />}
              {canSwitchMode && editMode && (
                <div className="flex shrink-0 items-center overflow-hidden rounded-[10px] border border-ui-border-soft bg-surface-soft">
                  <button
                    type="button"
                    title={isNote ? 'Trocar para tarefa' : 'Trocar para nota'}
                    onClick={() => handleComplexityChange(isNote ? 'task' : 'note')}
                    className={`inline-flex h-8 w-9 items-center justify-center transition-colors ${
                      isNote
                        ? 'bg-surface-selected text-brand-700'
                        : 'text-slate-500 hover:bg-white hover:text-slate-800'
                    }`}
                    aria-label={isNote ? 'Trocar para tarefa' : 'Trocar para nota'}
                  >
                    <IconNote className="h-3.5 w-3.5" />
                  </button>
                  {!editMode && (
                    <button
                      type="button"
                      title="Criar evento de calendario"
                      onClick={() => {
                        closeAll()
                        openCalendarEventCapture(dueDate || null)
                      }}
                      className="inline-flex h-8 w-9 items-center justify-center border-l border-ui-border-soft text-slate-500 transition-colors hover:bg-white hover:text-slate-800"
                      aria-label="Criar evento de calendario"
                    >
                      <IconCalendar className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )}
              {isNote && editMode && (
                <button
                  type="button"
                  title="Abrir em tela cheia"
                  aria-label="Abrir em tela cheia"
                  onClick={() => void handleOpenFullscreen()}
                  disabled={saving}
                  className="hidden h-7 w-7 shrink-0 items-center justify-center rounded-[10px] border border-ui-border-soft bg-surface-soft text-slate-500 transition-colors hover:bg-white hover:text-slate-800 disabled:opacity-50 sm:inline-flex"
                >
                  <svg
                    className="h-3.5 w-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.8}
                    aria-hidden="true"
                  >
                    <path d="M4 9V4h5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M20 9V4h-5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M4 15v5h5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M20 15v5h-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              )}
              {shortcut &&
                (shortcutTags.length > 0 ||
                  shortcutFolders.length > 0 ||
                  shortcutPriorities.length > 0) && (
                  <div className="absolute left-0 right-0 top-12 z-20 rounded-xl border border-ui-border bg-white p-1.5 shadow-cool-md sm:left-5 sm:right-16">
                    {shortcut.kind === 'tag' &&
                      shortcutTags.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => selectShortcutTag(tag)}
                          className="flex w-full items-center gap-2 rounded-[10px] bg-surface-soft px-2 py-1.5 text-left text-[12px] text-slate-700 hover:bg-surface-selected"
                        >
                          <IconTag className="h-3.5 w-3.5 text-slate-400" />@{tag}
                        </button>
                      ))}
                    {shortcut.kind === 'folder' &&
                      shortcutFolders.map(({ folder: project, depth }) => (
                        <button
                          key={folderIdOf(project)}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => selectShortcutFolder(project)}
                          className="flex w-full items-center gap-2 rounded-[10px] bg-surface-soft px-2 py-1.5 text-left text-[12px] text-slate-700 hover:bg-surface-selected"
                        >
                          <FolderGlyph className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <span
                            className="min-w-0 flex-1 truncate"
                            style={{ paddingLeft: depth ? depth * 12 : 0 }}
                          >
                            {project.name}
                          </span>
                        </button>
                      ))}
                    {shortcut.kind === 'priority' &&
                      shortcutPriorities.map(({ value, config }) => (
                        <button
                          key={value}
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => selectShortcutPriority(value)}
                          className="flex w-full items-center gap-2 rounded-[10px] bg-surface-soft px-2 py-1.5 text-left text-[12px] text-slate-700 hover:bg-surface-selected"
                        >
                          <IconFlag className={`h-3.5 w-3.5 ${config.color}`} />
                          <span className="flex-1">
                            {config.label} - {config.title}
                          </span>
                        </button>
                      ))}
                  </div>
                )}
            </div>

            {isNote ? (
              <div className="mt-3 flex flex-col">
                <MarkdownEditor
                  value={contentMd}
                  onChange={setContentMd}
                  placeholder="Escreva em Markdown..."
                  minHeight="min-h-[320px] max-h-[60vh] overflow-y-auto"
                  plain
                  hideDocumentActions
                />
              </div>
            ) : (
              <textarea
                value={contentMd}
                onChange={(e) => setContentMd(e.target.value)}
                placeholder="DescriÃ§Ã£o"
                rows={2}
                className="mt-1 block max-h-[40vh] min-h-[48px] w-full resize-y border-none bg-transparent text-[14px] leading-5 text-slate-700 outline-none placeholder:text-slate-300"
              />
            )}

            <div className="relative mt-2 flex flex-wrap items-center gap-2">
              {!isNote && (
                <div className="relative">
                  <ToolButton
                    title="Selecionar data"
                    active={!!dueDate}
                    onClick={() => setPopover(popover === 'date' ? null : 'date')}
                  >
                    <IconCalendar className="h-3.5 w-3.5" />
                    {dueDate ? formatDueDate(dueDate) : 'Hoje'}
                  </ToolButton>
                  {popover === 'date' && (
                    <div className="fixed inset-x-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-10 max-h-[55dvh] overflow-y-auto rounded-xl border border-ui-border bg-white p-2 shadow-cool-md sm:absolute sm:inset-x-auto sm:bottom-auto sm:left-0 sm:top-9 sm:w-64">
                      {DATE_SUGGESTIONS.map((suggestion) => {
                        const value = suggestion.getValue()
                        return (
                          <button
                            key={suggestion.label}
                            type="button"
                            onClick={() => {
                              setDueDate(value)
                              setPopover(null)
                            }}
                            className="flex w-full items-center gap-2 rounded-[10px] bg-surface-soft px-2 py-1.5 text-left text-[12px] text-slate-700 hover:bg-surface-selected"
                          >
                            <IconCalendar className="h-3.5 w-3.5 text-brand-600" />
                            <span className="flex-1">{suggestion.label}</span>
                            <span className="text-[11px] font-normal text-slate-400">
                              {formatDueDate(value)}
                            </span>
                            {dueDate === value && (
                              <IconCheck className="h-3.5 w-3.5 text-slate-500" />
                            )}
                          </button>
                        )
                      })}
                      <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="mt-1 h-8 w-full rounded-[10px] border border-ui-border-soft bg-surface-soft px-2 text-[12px] text-slate-800 outline-none focus:ring-2 focus:ring-brand-500"
                      />
                      <div className="mt-2 border-t border-ui-border-soft pt-2">
                        <div className="mb-1 px-1 text-[11px] font-medium text-slate-400">
                          HorÃ¡rio
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDueTimeChange(dueTime || '09:00')}
                          className={`flex h-8 w-full items-center gap-2 rounded-[10px] border px-2 text-left text-[12px] outline-none transition-colors ${
                            dueTime
                              ? 'border-ui-border-selected bg-surface-selected text-brand-700'
                              : 'border-ui-border-soft bg-surface-soft text-slate-500 hover:bg-white hover:text-slate-800'
                          }`}
                        >
                          <IconCalendar className="h-3.5 w-3.5" />
                          <span className="flex-1">
                            {dueTime ? formatTimeLabel(dueTime) : 'Adicionar horÃ¡rio'}
                          </span>
                          {dueTime && <IconCheck className="h-3.5 w-3.5 text-slate-500" />}
                        </button>
                        <div className="mt-1 grid grid-cols-2 gap-1">
                          {TIME_SUGGESTIONS.map((time) => (
                            <button
                              key={time}
                              type="button"
                              onClick={() => handleDueTimeChange(time)}
                              className={`flex items-center justify-between rounded-[10px] px-2 py-1.5 text-left text-[12px] hover:bg-surface-selected ${
                                dueTime === time
                                  ? 'bg-surface-selected text-brand-700'
                                  : 'bg-surface-soft text-slate-700'
                              }`}
                            >
                              {formatTimeLabel(time)}
                              {dueTime === time && (
                                <IconCheck className="h-3.5 w-3.5 text-slate-500" />
                              )}
                            </button>
                          ))}
                        </div>
                        <div className="mt-1 max-h-36 overflow-y-auto rounded-[10px] border border-ui-border-soft bg-white p-1">
                          {TIME_OPTIONS.map((time) => (
                            <button
                              key={time}
                              type="button"
                              onClick={() => handleDueTimeChange(time)}
                              className={`flex w-full items-center gap-2 rounded-[8px] px-2 py-1.5 text-left text-[12px] hover:bg-surface-selected ${
                                dueTime === time
                                  ? 'bg-surface-selected text-brand-700'
                                  : 'text-slate-700'
                              }`}
                            >
                              <span className="flex-1">{formatTimeLabel(time)}</span>
                              {dueTime === time && (
                                <IconCheck className="h-3.5 w-3.5 text-slate-500" />
                              )}
                            </button>
                          ))}
                        </div>
                        {dueTime && (
                          <button
                            type="button"
                            onClick={() => setDueTime('')}
                            className="mt-1 flex w-full items-center gap-2 rounded-[10px] bg-surface-soft px-2 py-1.5 text-left text-[12px] text-slate-500 hover:bg-surface-selected"
                          >
                            Remover horÃ¡rio
                          </button>
                        )}
                      </div>
                      {dueDate && (
                        <button
                          type="button"
                          onClick={() => {
                            setDueDate('')
                            setDueTime('')
                            setPopover(null)
                          }}
                          className="mt-1 flex w-full items-center gap-2 rounded-[10px] bg-surface-soft px-2 py-1.5 text-left text-[12px] text-slate-500 hover:bg-surface-selected"
                        >
                          Remover data
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              {!isNote && (
                <div className="relative">
                  <ToolButton
                    title="Selecionar recorrÃªncia"
                    active={!!recurrence}
                    onClick={() => setPopover(popover === 'recurrence' ? null : 'recurrence')}
                  >
                    <IconRepeat className="h-3.5 w-3.5" />
                    {recurrence ? recurrenceLabel : ''}
                  </ToolButton>
                  {popover === 'recurrence' && (
                    <RecurrencePopover
                      value={recurrence}
                      dueDate={dueDate}
                      onChange={handleRecurrenceChange}
                    />
                  )}
                </div>
              )}

              {!isNote && (
                <div className="relative">
                  <ToolButton
                    title="Editar prioridade"
                    active={priority < 4}
                    onClick={() => setPopover(popover === 'priority' ? null : 'priority')}
                  >
                    <IconFlag className={`h-3.5 w-3.5 ${priorityConfig.color}`} />
                  </ToolButton>
                  {popover === 'priority' && (
                    <div className="fixed inset-x-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-10 max-h-[55dvh] overflow-y-auto rounded-xl border border-ui-border bg-white p-1.5 shadow-cool-md sm:absolute sm:inset-x-auto sm:bottom-auto sm:left-0 sm:top-9 sm:w-44">
                      {PRIORITIES.map((p) => {
                        const cfg = PRIORITY_CONFIG[p]
                        return (
                          <button
                            key={p}
                            type="button"
                            onClick={() => {
                              setPriority(p)
                              setPopover(null)
                            }}
                            className="flex w-full items-center gap-2 rounded-[10px] bg-surface-soft px-2 py-1.5 text-left text-[12px] text-slate-700 hover:bg-surface-selected"
                          >
                            <IconFlag className={`h-3.5 w-3.5 ${cfg.color}`} />
                            <span className="flex-1">
                              {cfg.label} - {cfg.title}
                            </span>
                            {priority === p && <IconCheck className="h-3.5 w-3.5 text-slate-500" />}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className="relative">
                <ToolButton
                  title="Selecionar ou criar tag"
                  active={tags.length > 0}
                  onClick={() => setPopover(popover === 'tags' ? null : 'tags')}
                >
                  <IconTag className="h-3.5 w-3.5" />
                  {tags.length > 0 ? tags.length : ''}
                </ToolButton>
                {popover === 'tags' && (
                  <div className="fixed inset-x-3 bottom-[calc(5rem+env(safe-area-inset-bottom))] z-10 max-h-[55dvh] overflow-y-auto rounded-xl border border-ui-border bg-white p-2 shadow-cool-md sm:absolute sm:inset-x-auto sm:bottom-auto sm:left-0 sm:top-9 sm:w-64">
                    {tags.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-1">
                        {tags.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() =>
                              setTags((current) => current.filter((item) => item !== tag))
                            }
                            className="rounded-[8px] bg-surface-soft px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-surface-selected"
                          >
                            @{tag}
                          </button>
                        ))}
                      </div>
                    )}
                    <input
                      value={tagQuery}
                      onChange={(e) => setTagQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          addTag(tagQuery)
                        }
                      }}
                      placeholder="Buscar ou criar tag"
                      className="h-8 w-full rounded-[10px] border border-ui-border-soft bg-surface-soft px-2 text-[12px] text-slate-800 outline-none focus:ring-2 focus:ring-brand-500"
                      autoFocus
                    />
                    <div className="mt-1 max-h-44 overflow-y-auto">
                      {filteredTags.slice(0, 8).map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => addTag(tag)}
                          className="flex w-full items-center gap-2 rounded-[10px] bg-surface-soft px-2 py-1.5 text-left text-[12px] text-slate-700 hover:bg-surface-selected"
                        >
                          <IconTag className="h-3.5 w-3.5 text-slate-400" />@{tag}
                        </button>
                      ))}
                      {tagQuery.trim() && !knownTags.includes(normalizeToken(tagQuery)) && (
                        <button
                          type="button"
                          onClick={() => addTag(tagQuery)}
                          className="flex w-full items-center gap-2 rounded-[10px] bg-surface-soft px-2 py-1.5 text-left text-[12px] font-medium text-slate-700 hover:bg-surface-selected"
                        >
                          <IconTag className="h-3.5 w-3.5 text-slate-400" />
                          Criar @{normalizeToken(tagQuery)}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className={`${isExpanded ? 'flex' : 'hidden sm:flex'} shrink-0 items-center gap-2 border-t border-navy-900/[0.06] bg-[#F4F6FA] px-6 py-3.5 pb-[calc(0.875rem+env(safe-area-inset-bottom))]`}>
            <div className="relative min-w-0 flex-1">
              <button
                type="button"
                title="Selecionar ou criar pasta"
                onClick={() => setPopover(popover === 'folder' ? null : 'folder')}
                className="inline-flex h-10 max-w-full items-center gap-1.5 rounded-[10px] border border-ui-border-soft bg-white px-3 text-[13px] font-medium text-slate-600 transition-colors hover:bg-surface-soft hover:text-slate-800 sm:h-7 sm:bg-surface-soft sm:px-2 sm:text-[12px]"
              >
                <IconInbox className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{selectedFolder?.name ?? 'Pasta'}</span>
              </button>
              {popover === 'folder' && (
                <div className="fixed inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-[110] max-h-[55dvh] overflow-y-auto rounded-xl border border-ui-border bg-white p-2 shadow-cool-md sm:absolute sm:inset-x-auto sm:bottom-9 sm:left-0 sm:z-10 sm:w-72">
                  <input
                    value={folderQuery}
                    onChange={(e) => setProjectQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        void addFolder(folderQuery)
                      }
                    }}
                    placeholder="Buscar ou criar pasta"
                    className="h-8 w-full rounded-[10px] border border-ui-border-soft bg-surface-soft px-2 text-[12px] text-slate-800 outline-none focus:ring-2 focus:ring-brand-500"
                    autoFocus
                  />
                  <div className="mt-1 max-h-52 overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setFolderId('')
                        setPopover(null)
                      }}
                      className="flex w-full items-center gap-2 rounded-[10px] bg-surface-soft px-2 py-1.5 text-left text-[12px] text-slate-700 hover:bg-surface-selected"
                    >
                      <IconInbox className="h-3.5 w-3.5 text-slate-400" />
                      Inbox
                      {!folderId && <IconCheck className="ml-auto h-3.5 w-3.5 text-slate-500" />}
                    </button>
                    {filteredFolders.map(({ folder: project, depth }) => {
                      const id = folderIdOf(project)
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => {
                            setFolderId(id)
                            setProjectQuery('')
                            setPopover(null)
                          }}
                          className="flex w-full items-center gap-2 rounded-[10px] bg-surface-soft px-2 py-1.5 text-left text-[12px] text-slate-700 hover:bg-surface-selected"
                        >
                          <FolderGlyph className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          <span
                            className="min-w-0 flex-1 truncate"
                            style={{ paddingLeft: depth ? depth * 12 : 0 }}
                          >
                            {project.name}
                          </span>
                          {folderId === id && <IconCheck className="h-3.5 w-3.5 text-slate-500" />}
                        </button>
                      )
                    })}
                    {folderQuery.trim() &&
                      !activeFolders.some(
                        (project) => normalizeToken(project.name) === normalizeToken(folderQuery),
                      ) && (
                        <button
                          type="button"
                          disabled={creatingFolder}
                          onClick={() => void addFolder(folderQuery)}
                          className="flex w-full items-center gap-2 rounded-[10px] bg-surface-soft px-2 py-1.5 text-left text-[12px] font-medium text-slate-700 hover:bg-surface-selected disabled:opacity-50"
                        >
                          <span className="text-base leading-none">+</span>
                          {creatingFolder ? 'Criando...' : `Criar "${folderQuery.trim()}"`}
                        </button>
                      )}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                if (!editMode) clearDraft()
                closeAll()
              }}
              className="h-10 rounded-[10px] px-3 text-[12px] font-semibold text-slate-500 hover:bg-white hover:text-slate-700 sm:h-8"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saveDisabled}
              className="h-10 rounded-[10px] bg-brand-600 px-3 text-[12px] font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-40 sm:h-8"
            >
              {saving ? '...' : editMode ? 'Salvar' : 'Adicionar'}
            </button>
          </div>
            </>
          )}
        </form>
      </div>
    </div>
  )
}
