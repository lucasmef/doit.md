'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { createItem, useItems } from '@/hooks/use-items'
import { createProject, useProjects } from '@/hooks/use-projects'
import { useUI } from '@/store/ui'
import { useToast } from '@/components/ui/toast'
import { MarkdownEditor } from './markdown-editor'
import { PRIORITY_CONFIG } from './priority-select'
import type { Priority } from './priority-select'
import type { ItemComplexity, ItemRecurrence, Project } from '@doit/types'

type ItemMode = Extract<ItemComplexity, 'task' | 'note'>
type Popover = 'date' | 'priority' | 'recurrence' | 'tags' | 'project' | null
type ActiveShortcut =
  | { kind: 'tag'; query: string; start: number; end: number }
  | { kind: 'project'; query: string; start: number; end: number }
  | { kind: 'priority'; query: string; start: number; end: number }

const PRIORITY_SHORTCUT = /(?:^|\s)!P([1-4])\b/i
const PROJECT_SHORTCUT = /(?:^|\s)#([\p{L}\p{N}][\p{L}\p{N}_-]*)/iu
const TAG_SHORTCUT = /(?:^|\s)@([\p{L}\p{N}][\p{L}\p{N}_-]*)/giu
const TIME_SHORTCUT = /(?:^|\s)(?:as\s+|às\s+)?([01]?\d|2[0-3])(?::([0-5]\d)|h([0-5]\d)?)\b/iu
const INLINE_METADATA_PATTERN = /(!P[1-4]\b|[@#][\p{L}\p{N}][\p{L}\p{N}_-]*|\b(?:hoje|amanh[ãa]|depois de amanh[ãa]|fim de semana|final de semana|semana que vem|segunda(?:-feira)?|ter[cç]a(?:-feira)?|quarta(?:-feira)?|quinta(?:-feira)?|sexta(?:-feira)?|s[áa]bado|domingo)\b|\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b|\b\d{4}-\d{2}-\d{2}\b|\b(?:as\s+|às\s+)?(?:[01]?\d|2[0-3])(?::[0-5]\d|h[0-5]\d?)\b)/giu
const DATE_WORD_SHORTCUT = /(?:^|\s)(hoje|amanh[ãa]|depois de amanh[ãa]|fim de semana|final de semana|semana que vem|segunda(?:-feira)?|ter[cç]a(?:-feira)?|quarta(?:-feira)?|quinta(?:-feira)?|sexta(?:-feira)?|s[áa]bado|domingo)\b/iu
const SLASH_DATE_SHORTCUT = /(?:^|\s)(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/u
const ISO_DATE_SHORTCUT = /(?:^|\s)(\d{4}-\d{2}-\d{2})\b/u
const PRIORITIES: Priority[] = [1, 2, 3, 4]
const RECURRENCE_OPTIONS: Array<{ value: ItemRecurrence | ''; label: string }> = [
  { value: '', label: 'Sem recorrência' },
  { value: 'daily', label: 'Todo dia' },
  { value: 'weekdays', label: 'Dias úteis' },
  { value: 'weekly', label: 'Toda semana' },
  { value: 'monthly', label: 'Todo mês' },
  { value: 'yearly', label: 'Todo ano' },
]

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
  if (dateStr === tomorrow) return 'Amanhã'
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
  { label: 'Amanhã', getValue: () => dateAfter(1) },
  { label: 'Mais tarde essa semana', getValue: laterThisWeekDate },
  { label: 'Final de semana', getValue: () => nextWeekday(6) },
  { label: 'Semana que vem', getValue: () => nextWeekday(1) },
]
const TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const hour = Math.floor(index / 2).toString().padStart(2, '0')
  const minute = index % 2 === 0 ? '00' : '30'
  return `${hour}:${minute}`
})
const TIME_SUGGESTIONS = ['09:00', '12:00', '18:00', '20:00']

function cleanTitle(value: string) {
  return value
    .replace(/(?:^|\s)!P[1-4]\b/gi, ' ')
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
  const firstLine = content.split(/\r?\n/).find((line) => line.trim())?.trim() ?? ''
  return firstLine.replace(/^#{1,6}\s+/, '').replace(/[*_`[\]]/g, '').trim()
}

function normalizeToken(value: string) {
  return value.trim().toLocaleLowerCase('pt-BR')
}

function isCategorizerToken(value: string) {
  return /^!P?[1-4]?$/i.test(value) ||
    /^[@#][\p{L}\p{N}][\p{L}\p{N}_-]*$/iu.test(value) ||
    DATE_WORD_SHORTCUT.test(` ${value}`) ||
    SLASH_DATE_SHORTCUT.test(` ${value}`) ||
    ISO_DATE_SHORTCUT.test(` ${value}`) ||
    TIME_SHORTCUT.test(` ${value}`)
}

function projectIdOf(project: Project) {
  return project.id ?? ((project as unknown as { _id?: string })._id ?? '')
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
  if (slashMatch?.[1] && slashMatch[2]) return parseSlashDate(slashMatch[1], slashMatch[2], slashMatch[3])

  const isoMatch = value.match(ISO_DATE_SHORTCUT)
  if (isoMatch?.[1] && !Number.isNaN(new Date(`${isoMatch[1]}T12:00:00`).getTime())) return isoMatch[1]

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
  const match = beforeCursor.match(/(^|\s)([@#][\p{L}\p{N}_-]*|!P?[1-4]?)$/iu)
  if (!match?.[2]) return null

  const token = match[2]
  const start = beforeCursor.length - token.length
  if (token.startsWith('@')) return { kind: 'tag', query: normalizeToken(token.slice(1)), start, end: cursor }
  if (token.startsWith('#')) return { kind: 'project', query: normalizeToken(token.slice(1)), start, end: cursor }
  return { kind: 'priority', query: token.toUpperCase(), start, end: cursor }
}

function IconNote({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path d="M6 3h9l3 3v15H6z" />
      <path d="M14 3v4h4" />
      <path d="M9 12h6M9 16h4" />
    </svg>
  )
}

function IconCalendar({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path d="M7 3v3M17 3v3M4 8h16M5 5h14v16H5z" />
    </svg>
  )
}

function IconFlag({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path d="M5 21V4" />
      <path d="M5 5s2-1 5-1 5 2 8 1v9c-3 1-5-1-8-1s-5 1-5 1" />
    </svg>
  )
}

function IconTag({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path d="M20 13 13 20 4 11V4h7z" />
      <path d="M8 8h.01" />
    </svg>
  )
}

function IconInbox({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path d="M4 5h16l-2 10H6z" />
      <path d="M8 15c.6 1.5 1.8 2 4 2s3.4-.5 4-2" />
      <path d="M4 15v4h16v-4" />
    </svg>
  )
}

function IconCheck({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
      <path d="m5 12 4 4L19 6" />
    </svg>
  )
}

function IconRepeat({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path d="m17 2 4 4-4 4" />
      <path d="M3 11V9a3 3 0 0 1 3-3h15" />
      <path d="m7 22-4-4 4-4" />
      <path d="M21 13v2a3 3 0 0 1-3 3H3" />
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
      className={`inline-flex h-7 items-center gap-1.5 rounded-[10px] border px-2 text-[12px] font-medium transition-colors ${
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
}: {
  value: string
  onChange: (value: string) => void
  onCursorChange: (cursor: number) => void
  placeholder: string
  inputRef?: React.RefObject<HTMLInputElement | null>
}) {
  const parts = value.split(INLINE_METADATA_PATTERN)

  return (
    <div className="relative min-w-0 flex-1">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre text-[16px] font-semibold leading-6"
      >
        {parts.map((part, index) => {
          if (!part) return null
          if (isCategorizerToken(part)) {
            return (
              <span key={`${part}-${index}`} className="rounded-[6px] bg-surface-soft px-1 text-slate-700">
                {part}
              </span>
            )
          }
          return <span key={`${part}-${index}`} className="text-slate-900">{part}</span>
        })}
      </div>
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => {
          onChange(e.target.value)
          onCursorChange(e.target.selectionStart ?? e.target.value.length)
        }}
        onClick={(e) => onCursorChange(e.currentTarget.selectionStart ?? value.length)}
        onKeyUp={(e) => onCursorChange(e.currentTarget.selectionStart ?? value.length)}
        placeholder={placeholder}
        className="relative w-full border-none bg-transparent text-[16px] font-semibold leading-6 text-transparent caret-slate-900 outline-none placeholder:text-slate-300 selection:bg-brand-100"
      />
    </div>
  )
}

export function QuickCapture() {
  const pathname = usePathname()
  const { quickCaptureOpen, setQuickCaptureOpen } = useUI()
  const { toast } = useToast()
  const { projects } = useProjects()
  const { items } = useItems()
  const [title, setTitle] = useState('')
  const [contentMd, setContentMd] = useState('')
  const [complexity, setComplexity] = useState<ItemMode>('task')
  const [dueDate, setDueDate] = useState('')
  const [dueTime, setDueTime] = useState('')
  const [projectId, setProjectId] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [priority, setPriority] = useState<Priority>(4)
  const [recurrence, setRecurrence] = useState<ItemRecurrence | ''>('')
  const [tagQuery, setTagQuery] = useState('')
  const [projectQuery, setProjectQuery] = useState('')
  const [titleCursor, setTitleCursor] = useState(0)
  const [saving, setSaving] = useState(false)
  const [creatingProject, setCreatingProject] = useState(false)
  const [popover, setPopover] = useState<Popover>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const activeProjects = projects.filter((p) => p.status !== 'archived')
  const selectedProject = activeProjects.find((p) => projectIdOf(p) === projectId)
  const isTodayContext = pathname === '/today'
  const isNote = complexity === 'note'

  const knownTags = useMemo(() => {
    return Array.from(new Set(items.flatMap((item) => item.tags ?? []).map(normalizeToken))).sort()
  }, [items])

  const filteredTags = knownTags.filter((tag) => {
    const query = normalizeToken(tagQuery)
    return !tags.includes(tag) && (!query || tag.includes(query))
  })

  const filteredProjects = activeProjects.filter((project) => {
    const query = normalizeToken(projectQuery)
    return !query || normalizeToken(project.name).includes(query)
  })

  const shortcut = !isNote ? activeShortcut(title, titleCursor) : null
  const shortcutTags = shortcut?.kind === 'tag'
    ? knownTags.filter((tag) => !tags.includes(tag) && (!shortcut.query || tag.includes(shortcut.query))).slice(0, 8)
    : []
  const shortcutProjects = shortcut?.kind === 'project'
    ? activeProjects.filter((project) => {
        const query = shortcut.query
        const name = normalizeToken(project.name)
        const slug = slugToken(project.name)
        return !query || name.includes(query) || slug.includes(query)
      }).slice(0, 8)
    : []
  const shortcutPriorities = shortcut?.kind === 'priority'
    ? PRIORITIES.filter((p) => `!P${p}`.startsWith(shortcut.query || '!')).map((p) => ({ value: p, config: PRIORITY_CONFIG[p] }))
    : []

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setQuickCaptureOpen(true)
      }
      if (e.key === 'Escape') {
        if (popover) setPopover(null)
        else setQuickCaptureOpen(false)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [popover, setQuickCaptureOpen])

  useEffect(() => {
    if (quickCaptureOpen) {
      setComplexity('task')
      setDueDate(isTodayContext ? todayDate() : '')
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      setTitle('')
      setContentMd('')
      setComplexity('task')
      setDueDate('')
      setDueTime('')
      setProjectId('')
      setTags([])
      setPriority(4)
      setRecurrence('')
      setTagQuery('')
      setProjectQuery('')
      setTitleCursor(0)
      setPopover(null)
    }
  }, [quickCaptureOpen, isTodayContext])

  function applyTitleShortcuts(value: string) {
    setTitle(value)

    const priorityMatch = value.match(PRIORITY_SHORTCUT)
    if (priorityMatch?.[1] && complexity === 'task') {
      setPriority(Number(priorityMatch[1]) as Priority)
    }

    const projectMatch = value.match(PROJECT_SHORTCUT)
    const projectToken = projectMatch?.[1]
    if (projectToken) {
      const wanted = normalizeToken(projectToken.replace(/-/g, ' '))
      const project = activeProjects.find(
        (p) => normalizeToken(p.name) === wanted || normalizeToken(p.name).replace(/\s+/g, '-') === normalizeToken(projectToken),
      )
      if (project) setProjectId(projectIdOf(project))
    }

    const foundTags = Array.from(value.matchAll(TAG_SHORTCUT)).map((m) => m[1]).filter(Boolean) as string[]
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

  function selectShortcutProject(project: Project) {
    setProjectId(projectIdOf(project))
    replaceShortcut(`#${slugToken(project.name)}`)
  }

  function selectShortcutPriority(next: Priority) {
    setPriority(next)
    replaceShortcut(`!P${next}`)
  }

  async function addProject(value: string) {
    const name = value.trim()
    if (!name) return

    const existing = activeProjects.find((project) => normalizeToken(project.name) === normalizeToken(name))
    if (existing) {
      setProjectId(projectIdOf(existing))
      setProjectQuery('')
      setPopover(null)
      return
    }

    setCreatingProject(true)
    try {
      const project = await createProject({ name })
      const id = projectIdOf(project)
      if (id) setProjectId(id)
      setProjectQuery('')
      setPopover(null)
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Erro ao criar projeto.', 'error')
    } finally {
      setCreatingProject(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsedTitle = isNote ? titleFromNoteContent(contentMd) : cleanTitle(title)
    if (!parsedTitle) return

    setSaving(true)
    try {
      const inboxContext = !projectId && !dueDate
      await createItem({
        title: parsedTitle,
        complexity,
        status: inboxContext ? 'inbox' : 'todo',
        contentMd: contentMd.trim() || undefined,
        dueDate: dueDate || undefined,
        dueTime: dueDate && dueTime ? dueTime : undefined,
        projectId: projectId || undefined,
        tags,
        priority: complexity === 'task' && priority < 4 ? priority : undefined,
        recurrence: complexity === 'task' && recurrence ? recurrence : undefined,
      })
      setQuickCaptureOpen(false)
      toast('Item criado com sucesso', 'success')
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Erro ao criar item.', 'error')
    } finally {
      setSaving(false)
    }
  }

  if (!quickCaptureOpen) return null

  const saveDisabled = (isNote ? !titleFromNoteContent(contentMd) : !cleanTitle(title)) || saving
  const priorityConfig = PRIORITY_CONFIG[priority]
  const recurrenceLabel = RECURRENCE_OPTIONS.find((option) => option.value === recurrence)?.label ?? 'Recorrência'

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-navy-900/40 p-4 pt-[8vh] backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && setQuickCaptureOpen(false)}
    >
      <div className={`w-full overflow-visible rounded-xl border border-ui-border bg-white shadow-cool-lg ${isNote ? 'max-w-4xl' : 'max-w-[560px]'}`}>
        <form onSubmit={handleSubmit} className="flex flex-col">
          <div className="px-5 pb-4 pt-5">
            <div className="flex items-center gap-3">
              {!isNote && (
                <HighlightedTitleInput
                  inputRef={inputRef}
                  value={title}
                  onChange={applyTitleShortcuts}
                  onCursorChange={setTitleCursor}
                  placeholder="Nome da tarefa"
                />
              )}
              {isNote && (
                <div className="min-w-0 flex-1" />
              )}
              <button
                type="button"
                title={isNote ? 'Trocar para tarefa' : 'Trocar para nota'}
                onClick={() => handleComplexityChange(isNote ? 'task' : 'note')}
                className={`inline-flex h-7 shrink-0 items-center gap-1.5 rounded-[10px] border px-2 text-[12px] font-medium transition-colors ${
                  isNote
                    ? 'border-ui-border-selected bg-surface-selected text-brand-700'
                    : 'border-ui-border-soft bg-surface-soft text-slate-500 hover:bg-white hover:text-slate-800'
                }`}
              >
                <IconNote className="h-3.5 w-3.5" />
                Nota
              </button>
              {shortcut && (shortcutTags.length > 0 || shortcutProjects.length > 0 || shortcutPriorities.length > 0) && (
                <div className="absolute left-5 right-16 top-12 z-20 rounded-xl border border-ui-border bg-white p-1.5 shadow-cool-md">
                  {shortcut.kind === 'tag' && shortcutTags.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectShortcutTag(tag)}
                      className="flex w-full items-center gap-2 rounded-[10px] bg-surface-soft px-2 py-1.5 text-left text-[12px] text-slate-700 hover:bg-surface-selected"
                    >
                      <IconTag className="h-3.5 w-3.5 text-slate-400" />
                      @{tag}
                    </button>
                  ))}
                  {shortcut.kind === 'project' && shortcutProjects.map((project) => (
                    <button
                      key={projectIdOf(project)}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectShortcutProject(project)}
                      className="flex w-full items-center gap-2 rounded-[10px] bg-surface-soft px-2 py-1.5 text-left text-[12px] text-slate-700 hover:bg-surface-selected"
                    >
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: project.color ?? '#94a3b8' }} />
                      <span className="min-w-0 flex-1 truncate">{project.name}</span>
                    </button>
                  ))}
                  {shortcut.kind === 'priority' && shortcutPriorities.map(({ value, config }) => (
                    <button
                      key={value}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => selectShortcutPriority(value)}
                      className="flex w-full items-center gap-2 rounded-[10px] bg-surface-soft px-2 py-1.5 text-left text-[12px] text-slate-700 hover:bg-surface-selected"
                    >
                      <IconFlag className={`h-3.5 w-3.5 ${config.color}`} />
                      <span className="flex-1">{config.label} - {config.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {isNote ? (
              <div className="mt-3">
                <MarkdownEditor
                  value={contentMd}
                  onChange={setContentMd}
                  placeholder="Escreva em Markdown..."
                  minHeight="min-h-[440px]"
                />
                <div className="mt-3 rounded-xl border border-dashed border-ui-border-strong bg-surface-soft p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-[13px] font-semibold text-slate-700">Anexos</h3>
                      <p className="text-[12px] text-slate-400">Espaco reservado para upload de arquivos.</p>
                    </div>
                    <button
                      type="button"
                      disabled
                      className="h-8 rounded-[10px] border border-ui-border-soft bg-white px-3 text-[12px] font-semibold text-slate-300"
                    >
                      Upload em breve
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <textarea
                value={contentMd}
                onChange={(e) => setContentMd(e.target.value)}
                placeholder="Descrição"
                rows={2}
                className="mt-1 block max-h-28 min-h-[48px] w-full resize-y border-none bg-transparent text-[14px] leading-5 text-slate-700 outline-none placeholder:text-slate-300"
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
                    <div className="absolute left-0 top-9 z-10 w-64 rounded-xl border border-ui-border bg-white p-2 shadow-cool-md">
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
                            <span className="text-[11px] font-normal text-slate-400">{formatDueDate(value)}</span>
                            {dueDate === value && <IconCheck className="h-3.5 w-3.5 text-slate-500" />}
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
                        <div className="mb-1 px-1 text-[11px] font-medium text-slate-400">Horário</div>
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
                          <span className="flex-1">{dueTime ? formatTimeLabel(dueTime) : 'Adicionar horário'}</span>
                          {dueTime && <IconCheck className="h-3.5 w-3.5 text-slate-500" />}
                        </button>
                        <div className="mt-1 grid grid-cols-2 gap-1">
                          {TIME_SUGGESTIONS.map((time) => (
                            <button
                              key={time}
                              type="button"
                              onClick={() => handleDueTimeChange(time)}
                              className={`flex items-center justify-between rounded-[10px] px-2 py-1.5 text-left text-[12px] hover:bg-surface-selected ${
                                dueTime === time ? 'bg-surface-selected text-brand-700' : 'bg-surface-soft text-slate-700'
                              }`}
                            >
                              {formatTimeLabel(time)}
                              {dueTime === time && <IconCheck className="h-3.5 w-3.5 text-slate-500" />}
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
                                dueTime === time ? 'bg-surface-selected text-brand-700' : 'text-slate-700'
                              }`}
                            >
                              <span className="flex-1">{formatTimeLabel(time)}</span>
                              {dueTime === time && <IconCheck className="h-3.5 w-3.5 text-slate-500" />}
                            </button>
                          ))}
                        </div>
                        {dueTime && (
                          <button
                            type="button"
                            onClick={() => setDueTime('')}
                            className="mt-1 flex w-full items-center gap-2 rounded-[10px] bg-surface-soft px-2 py-1.5 text-left text-[12px] text-slate-500 hover:bg-surface-selected"
                          >
                            Remover horário
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
                    title="Selecionar recorrência"
                    active={!!recurrence}
                    onClick={() => setPopover(popover === 'recurrence' ? null : 'recurrence')}
                  >
                    <IconRepeat className="h-3.5 w-3.5" />
                    {recurrence ? recurrenceLabel : ''}
                  </ToolButton>
                  {popover === 'recurrence' && (
                    <div className="absolute left-0 top-9 z-10 w-48 rounded-xl border border-ui-border bg-white p-1.5 shadow-cool-md">
                      {RECURRENCE_OPTIONS.map((option) => (
                        <button
                          key={option.value || 'none'}
                          type="button"
                          onClick={() => handleRecurrenceChange(option.value)}
                          className="flex w-full items-center gap-2 rounded-[10px] bg-surface-soft px-2 py-1.5 text-left text-[12px] text-slate-700 hover:bg-surface-selected"
                        >
                          <IconRepeat className="h-3.5 w-3.5 text-slate-400" />
                          <span className="flex-1">{option.label}</span>
                          {recurrence === option.value && <IconCheck className="h-3.5 w-3.5 text-slate-500" />}
                        </button>
                      ))}
                    </div>
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
                    <div className="absolute left-0 top-9 z-10 w-44 rounded-xl border border-ui-border bg-white p-1.5 shadow-cool-md">
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
                            <span className="flex-1">{cfg.label} - {cfg.title}</span>
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
                  <div className="absolute left-0 top-9 z-10 w-64 rounded-xl border border-ui-border bg-white p-2 shadow-cool-md">
                    {tags.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-1">
                        {tags.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => setTags((current) => current.filter((item) => item !== tag))}
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
                          <IconTag className="h-3.5 w-3.5 text-slate-400" />
                          @{tag}
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

          <div className="flex items-center gap-2 border-t border-ui-border bg-surface-soft px-5 py-3">
            <div className="relative min-w-0 flex-1">
              <button
                type="button"
                title="Selecionar ou criar projeto"
                onClick={() => setPopover(popover === 'project' ? null : 'project')}
                className="inline-flex h-7 max-w-full items-center gap-1.5 rounded-[10px] border border-ui-border-soft bg-surface-soft px-2 text-[12px] font-medium text-slate-500 transition-colors hover:bg-white hover:text-slate-800"
              >
                <IconInbox className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{selectedProject?.name ?? 'Projeto'}</span>
              </button>
              {popover === 'project' && (
                <div className="absolute bottom-9 left-0 z-10 w-72 rounded-xl border border-ui-border bg-white p-2 shadow-cool-md">
                  <input
                    value={projectQuery}
                    onChange={(e) => setProjectQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        void addProject(projectQuery)
                      }
                    }}
                    placeholder="Buscar ou criar projeto"
                    className="h-8 w-full rounded-[10px] border border-ui-border-soft bg-surface-soft px-2 text-[12px] text-slate-800 outline-none focus:ring-2 focus:ring-brand-500"
                    autoFocus
                  />
                  <div className="mt-1 max-h-52 overflow-y-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setProjectId('')
                        setPopover(null)
                      }}
                      className="flex w-full items-center gap-2 rounded-[10px] bg-surface-soft px-2 py-1.5 text-left text-[12px] text-slate-700 hover:bg-surface-selected"
                    >
                      <IconInbox className="h-3.5 w-3.5 text-slate-400" />
                      Inbox
                      {!projectId && <IconCheck className="ml-auto h-3.5 w-3.5 text-slate-500" />}
                    </button>
                    {filteredProjects.map((project) => {
                      const id = projectIdOf(project)
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => {
                            setProjectId(id)
                            setProjectQuery('')
                            setPopover(null)
                          }}
                          className="flex w-full items-center gap-2 rounded-[10px] bg-surface-soft px-2 py-1.5 text-left text-[12px] text-slate-700 hover:bg-surface-selected"
                        >
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: project.color ?? '#94a3b8' }} />
                          <span className="min-w-0 flex-1 truncate">{project.name}</span>
                          {projectId === id && <IconCheck className="h-3.5 w-3.5 text-slate-500" />}
                        </button>
                      )
                    })}
                    {projectQuery.trim() && !activeProjects.some((project) => normalizeToken(project.name) === normalizeToken(projectQuery)) && (
                      <button
                        type="button"
                        disabled={creatingProject}
                        onClick={() => void addProject(projectQuery)}
                        className="flex w-full items-center gap-2 rounded-[10px] bg-surface-soft px-2 py-1.5 text-left text-[12px] font-medium text-slate-700 hover:bg-surface-selected disabled:opacity-50"
                      >
                        <span className="text-base leading-none">+</span>
                        {creatingProject ? 'Criando...' : `Criar "${projectQuery.trim()}"`}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setQuickCaptureOpen(false)}
              className="h-8 rounded-[10px] px-3 text-[12px] font-semibold text-slate-500 hover:bg-white hover:text-slate-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saveDisabled}
              className="h-8 rounded-[10px] bg-brand-600 px-3 text-[12px] font-semibold text-white shadow-sm transition-colors hover:bg-brand-700 disabled:opacity-40"
            >
              {saving ? '...' : 'Adicionar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
