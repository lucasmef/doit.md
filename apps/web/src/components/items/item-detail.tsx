'use client'

import { useState, useEffect, useMemo, useRef, type CSSProperties } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useItem, updateItem, archiveItem, useItems } from '@/hooks/use-items'
import { createProject, useProjects } from '@/hooks/use-projects'
import { useUI } from '@/store/ui'
import { ComplexitySelect } from './complexity-select'
import { StatusSelect } from './status-select'
import { ItemVersions } from './item-versions'
import { MarkdownEditor } from './markdown-editor'
import { PRIORITY_CONFIG, PrioritySelect } from './priority-select'
import { DueDatePicker } from './due-date-picker'
import { RecurrencePopover } from './recurrence-popover'
import type { Priority } from './priority-select'
import { useToast } from '@/components/ui/toast'
import { FolderGlyph, flattenFolderOptions } from '@/components/folders/folder-options'
import type { ItemComplexity, ItemRecurrence, ItemStatus, UpdateItemInput } from '@doit/types'
import {
  formatRecurrenceLabel,
  nextRecurringDate as computeNextRecurringDate,
  toLocalDateKey,
} from '@doit/core'

type Popover = 'date' | 'priority' | 'recurrence' | 'tags' | 'project' | null
const PRIORITIES: Priority[] = [1, 2, 3, 4]
function nullablePatch<T extends Record<string, unknown>>(patch: T): UpdateItemInput {
  return patch as unknown as UpdateItemInput
}

function formatDueDate(dateStr: string): string {
  const tomorrowDate = new Date()
  tomorrowDate.setDate(tomorrowDate.getDate() + 1)
  const today = toLocalDateKey()
  const tomorrow = toLocalDateKey(tomorrowDate)
  if (dateStr === today) return 'Hoje'
  if (dateStr === tomorrow) return 'AmanhÃ£'
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function formatTimeLabel(time: string) {
  if (!time) return ''
  const [hour, minute] = time.split(':')
  const date = new Date()
  date.setHours(Number(hour), Number(minute), 0, 0)
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function todayDate() {
  return toLocalDateKey()
}

function dateAfter(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return toLocalDateKey(date)
}

function nextWeekday(targetDay: number, minimumDays = 1) {
  const date = new Date()
  let days = (targetDay - date.getDay() + 7) % 7
  if (days < minimumDays) days += 7
  date.setDate(date.getDate() + days)
  return toLocalDateKey(date)
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
const PRIORITY_SHORTCUT = /(?:^|\s)p([1-4])\b/i
const PROJECT_SHORTCUT = /(?:^|\s)#([\p{L}\p{N}][\p{L}\p{N}_-]*)/iu
const TAG_SHORTCUT = /(?:^|\s)@([\p{L}\p{N}][\p{L}\p{N}_-]*)/giu
const DATE_WORD_SHORTCUT =
  /(?:^|\s)(hoje|amanh(?:a|\u00e3)|depois de amanh(?:a|\u00e3)|fim de semana|final de semana|semana que vem|segunda(?:-feira)?|ter(?:c|\u00e7)a(?:-feira)?|quarta(?:-feira)?|quinta(?:-feira)?|sexta(?:-feira)?|s(?:a|\u00e1)bado|domingo)(?=$|\s|[,.!?])/iu
const SLASH_DATE_SHORTCUT = /(?:^|\s)(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/u
const ISO_DATE_SHORTCUT = /(?:^|\s)(\d{4}-\d{2}-\d{2})\b/u
const TIME_SHORTCUT = /(?:^|\s)(?:as\s+|\u00e0s\s+)?([01]?\d|2[0-3])(?::([0-5]\d)|h([0-5]\d)?)\b/iu

function normalizeToken(value: string) {
  return value.trim().toLocaleLowerCase('pt-BR')
}

function cleanTaskTitle(value: string) {
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

type OutlineEntry = { level: 1 | 2 | 3; text: string }

function extractMarkdownOutline(markdown: string): OutlineEntry[] {
  return markdown
    .split(/\r?\n/)
    .map((line) => {
      const match = /^(#{1,3})\s+(.+)$/.exec(line.trim())
      if (!match) return null
      const text = (match[2] ?? '').replace(/[#*_`[\]()]/g, '').trim()
      if (!text) return null
      return { level: match[1]?.length as 1 | 2 | 3, text }
    })
    .filter((entry): entry is OutlineEntry => Boolean(entry))
    .slice(0, 8)
}

function getMarkdownTaskStats(markdown: string) {
  const matches = markdown.match(/^\s*[-*]\s+\[[ xX]\]\s+/gm) ?? []
  const done = matches.filter((line) => /\[[xX]\]/.test(line)).length
  return { done, total: matches.length }
}

function getWordCount(markdown: string) {
  const text = markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`[^`]*`/g, ' ')
    .replace(/[#>*_\-[\]()`|]/g, ' ')
  return text.trim() ? text.trim().split(/\s+/).length : 0
}

function getLinkCount(markdown: string) {
  return (markdown.match(/\[[^\]]+\]\([^)]+\)|https?:\/\/\S+/g) ?? []).length
}

function statusLabel(status: ItemStatus) {
  const labels: Record<ItemStatus, string> = {
    inbox: 'Inbox',
    todo: 'A fazer',
    doing: 'Em andamento',
    waiting: 'Aguardando',
    done: 'Feito',
    archived: 'Arquivado',
  }
  return labels[status]
}

function parseSlashDate(dayText: string, monthText: string, yearText?: string) {
  const day = Number(dayText)
  const month = Number(monthText)
  const now = new Date()
  let year = yearText ? Number(yearText) : now.getFullYear()
  if (yearText?.length === 2) year += 2000
  if (!day || !month || month > 12 || day > 31) return ''

  let date = new Date(year, month - 1, day)
  if (!yearText && toLocalDateKey(date) < todayDate()) {
    date = new Date(year + 1, month - 1, day)
  }
  if (date.getDate() !== day || date.getMonth() !== month - 1) return ''
  return toLocalDateKey(date)
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

function projectIdOf(project: { id?: string; _id?: string }) {
  return project.id ?? (project as unknown as { _id?: string })._id ?? ''
}

function parseTags(value: string) {
  return value
    .split(',')
    .map((tag) => normalizeToken(tag))
    .filter(Boolean)
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

function mergeTaskTitleIntoNoteContent(title: string, content: string) {
  const normalizedTitle = title.trim()
  const normalizedContent = content.trim()
  return [normalizedTitle, normalizedContent].filter(Boolean).join('\n\n')
}

function splitNoteContentForTask(content: string) {
  const lines = content.split(/\r?\n/)
  const titleIndex = lines.findIndex((line) => line.trim())
  if (titleIndex === -1) return { title: '', contentMd: '' }

  const title = (lines[titleIndex] ?? '')
    .trim()
    .replace(/^#{1,6}\s+/, '')
    .replace(/[*_`[\]]/g, '')
    .trim()
  const contentMd = lines
    .slice(titleIndex + 1)
    .join('\n')
    .trim()
  return { title, contentMd }
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
      className={`inline-flex h-7 items-center gap-1.5 rounded-full border px-2 text-[12px] font-medium shadow-sm backdrop-blur transition-colors ${
        active
          ? 'border-brand-200/70 bg-white/70 text-brand-700'
          : 'border-white/60 bg-white/46 text-slate-500 hover:bg-white/75 hover:text-slate-800'
      }`}
    >
      {children}
    </button>
  )
}

export function ItemDetail() {
  const pathname = usePathname()
  const router = useRouter()
  const { selectedItemId, setSelectedItemId } = useUI()
  const { item, isLoading } = useItem(selectedItemId)

  // Notas usam o editor imersivo dedicado (/notas/[id]); o overlay atende
  // apenas tarefas/eventos/capturas/projetos. Redireciona em vez de abrir o overlay.
  useEffect(() => {
    if (item && item.complexity === 'note') {
      const noteId = item.id
      setSelectedItemId(null)
      router.push(`/notas/${noteId}`)
    }
  }, [item, router, setSelectedItemId])
  const { projects } = useProjects()
  const { items } = useItems()
  const { toast } = useToast()

  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [dueTime, setDueTime] = useState('')
  const [priority, setPriority] = useState<Priority>(4)
  const [recurrence, setRecurrence] = useState<ItemRecurrence | ''>('')
  const [dirty, setDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [creatingEvent, setCreatingEvent] = useState(false)
  const [tagQuery, setTagQuery] = useState('')
  const [projectQuery, setProjectQuery] = useState('')
  const [creatingProject, setCreatingProject] = useState(false)
  const [popover, setPopover] = useState<Popover>(null)

  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const taskTitleRef = useRef<HTMLTextAreaElement>(null)
  const taskContentRef = useRef<HTMLTextAreaElement>(null)
  const backdropPointerStarted = useRef(false)

  function autosizeTextarea(el: HTMLTextAreaElement | null) {
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

  function handleBackdropPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    backdropPointerStarted.current = e.target === e.currentTarget
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    const selectedText = window.getSelection()?.toString()
    if (backdropPointerStarted.current && e.target === e.currentTarget && !selectedText) {
      setSelectedItemId(null)
    }
    backdropPointerStarted.current = false
  }

  function handleModalKeyDown(e: React.KeyboardEvent) {
    if (e.key !== 'Escape') return
    e.preventDefault()
    e.stopPropagation()
    void flushAndClose()
  }

  function insertTextareaLineBreak(textarea: HTMLTextAreaElement) {
    const start = textarea.selectionStart ?? title.length
    const end = textarea.selectionEnd ?? start
    const next = `${title.slice(0, start)}\n${title.slice(end)}`
    setTitle(next)
    scheduleAutosave({ title: next })
    requestAnimationFrame(() => {
      textarea.setSelectionRange(start + 1, start + 1)
      autosizeTextarea(textarea)
    })
  }

  function handleTaskTitleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    e.stopPropagation()

    if (e.ctrlKey || e.metaKey) {
      insertTextareaLineBreak(e.currentTarget)
      return
    }

    void flushAndClose()
  }

  useEffect(() => {
    if (item) {
      setTitle(item.title)
      setContent(item.contentMd ?? '')
      setTags(item.tags.join(', '))
      setDueDate(item.dueDate ?? '')
      setDueTime(item.dueTime ?? '')
      setPriority((item.priority as Priority) ?? 4)
      setRecurrence(item.recurrence ?? '')
      setDirty(false)
      setIsSaving(false)
      setTagQuery('')
      setProjectQuery('')
      setPopover(null)
    }
  }, [item?.id])

  useEffect(() => {
    if (!item || dirty || isSaving) return
    setDueDate(item.dueDate ?? '')
    setDueTime(item.dueTime ?? '')
    setRecurrence(item.recurrence ?? '')
    setPriority((item.priority as Priority) ?? 4)
  }, [dirty, isSaving, item?.dueDate, item?.dueTime, item?.id, item?.priority, item?.recurrence])

  useEffect(() => {
    autosizeTextarea(taskTitleRef.current)
  }, [title])

  useEffect(() => {
    autosizeTextarea(taskContentRef.current)
  }, [content])

  const activeProjects = projects.filter((p) => p.status !== 'archived')
  const noteBackdropStyle = {
    '--item-detail-sidebar-offset': '0px',
  } as CSSProperties
  const noteFullscreenStyle = {
    ...noteBackdropStyle,
    paddingTop: 'env(safe-area-inset-top, 0px)',
    paddingBottom: 'env(safe-area-inset-bottom, 0px)',
    paddingLeft: 'env(safe-area-inset-left, 0px)',
    paddingRight: 'env(safe-area-inset-right, 0px)',
  } as CSSProperties
  const folderOptions = useMemo(() => flattenFolderOptions(activeProjects), [activeProjects])
  const tagList = useMemo(() => parseTags(tags), [tags])
  const knownTags = useMemo(() => {
    return Array.from(
      new Set(items.flatMap((current) => current.tags ?? []).map(normalizeToken)),
    ).sort()
  }, [items])

  const filteredTags = knownTags.filter((tag) => {
    const query = normalizeToken(tagQuery)
    return !tagList.includes(tag) && (!query || tag.includes(query))
  })

  const filteredProjects = folderOptions.filter(({ folder: project }) => {
    const query = normalizeToken(projectQuery)
    return !query || normalizeToken(project.name).includes(query)
  })
  const noteOutline = extractMarkdownOutline(content)
  const noteTaskStats = getMarkdownTaskStats(content)
  const noteTaskProgress =
    noteTaskStats.total > 0 ? Math.round((noteTaskStats.done / noteTaskStats.total) * 100) : 100
  const noteWordCount = getWordCount(content)
  const noteLinkCount = getLinkCount(content)
  const currentTitleForRelations = normalizeToken(title || item?.title || '')
  const relatedItems =
    item && currentTitleForRelations
      ? items
          .filter((current) => current.id !== item.id)
          .filter((current) =>
            normalizeToken(current.contentMd ?? '').includes(currentTitleForRelations),
          )
          .slice(0, 3)
      : []

  function applyTaskTitleCategorizerShortcuts(value: string) {
    const patch: Record<string, unknown> = {}
    let hasCategorizer = false

    const priorityMatch = value.match(PRIORITY_SHORTCUT)
    if (priorityMatch?.[1]) {
      const nextPriority = Number(priorityMatch[1]) as Priority
      setPriority(nextPriority)
      patch['priority'] = nextPriority === 4 ? null : nextPriority
      hasCategorizer = true
    }

    const projectMatch = value.match(PROJECT_SHORTCUT)
    const projectToken = projectMatch?.[1]
    if (projectToken) {
      const wanted = normalizeToken(projectToken.replace(/-/g, ' '))
      const project = activeProjects.find(
        (p) =>
          normalizeToken(p.name) === wanted ||
          normalizeToken(p.name).replace(/\s+/g, '-') === normalizeToken(projectToken),
      )
      if (project) {
        patch['folderId'] = projectIdOf(project)
        hasCategorizer = true
      }
    }

    const foundTags = Array.from(value.matchAll(TAG_SHORTCUT))
      .map((match) => match[1])
      .filter(Boolean) as string[]
    if (foundTags.length > 0) {
      const nextTags = Array.from(
        new Set([...tagList, ...foundTags.map((tag) => normalizeToken(tag))]),
      )
      setTags(nextTags.join(', '))
      patch['tags'] = nextTags
      hasCategorizer = true
    }

    const inlineDueDate = parseInlineDueDate(value)
    if (inlineDueDate) {
      setDueDate(inlineDueDate)
      patch['dueDate'] = inlineDueDate
      hasCategorizer = true
    }

    const inlineDueTime = parseInlineDueTime(value)
    if (inlineDueTime) {
      const nextDueDate = inlineDueDate || dueDate || todayDate()
      setDueTime(inlineDueTime)
      if (!dueDate) setDueDate(nextDueDate)
      patch['dueDate'] = nextDueDate
      patch['dueTime'] = inlineDueTime
      hasCategorizer = true
    }

    const nextTitle = hasCategorizer ? cleanTaskTitle(value) : value
    if (nextTitle) patch['title'] = nextTitle
    return { nextTitle: nextTitle || value, patch: nullablePatch(patch) }
  }

  const pendingPatch = useRef<Parameters<typeof updateItem>[1] | null>(null)

  function scheduleAutosave(patch: Parameters<typeof updateItem>[1]) {
    if (!selectedItemId) return
    if (saveTimeout.current) clearTimeout(saveTimeout.current)
    pendingPatch.current = { ...(pendingPatch.current ?? {}), ...patch }
    setDirty(true)
    setIsSaving(true)
    saveTimeout.current = setTimeout(async () => {
      const next = pendingPatch.current
      pendingPatch.current = null
      try {
        if (next) await updateItem(selectedItemId, next)
        setDirty(false)
      } catch {
        toast('Erro ao salvar alteracoes.', 'error')
      } finally {
        setIsSaving(false)
      }
    }, 800)
  }

  async function flushAndClose() {
    const id = selectedItemId
    if (saveTimeout.current) {
      clearTimeout(saveTimeout.current)
      saveTimeout.current = null
    }
    const patch = pendingPatch.current
    pendingPatch.current = null
    if (id && patch) {
      try {
        await updateItem(id, patch)
      } catch {
        toast('Erro ao salvar alteracoes.', 'error')
      }
    }
    setIsSaving(false)
    setDirty(false)
    setSelectedItemId(null)
  }

  const lastPathname = useRef(pathname)
  useEffect(() => {
    if (lastPathname.current !== pathname) {
      lastPathname.current = pathname
      if (selectedItemId) {
        void flushAndClose()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const value = e.target.value
    if (item?.complexity === 'task' || item?.complexity === 'capture') {
      const { nextTitle, patch } = applyTaskTitleCategorizerShortcuts(value)
      setTitle(nextTitle)
      scheduleAutosave(patch)
      return
    }
    setTitle(value)
    scheduleAutosave({ title: value })
  }

  function handleContentChange(value: string) {
    setContent(value)
    const nextTitle = item?.complexity === 'note' ? titleFromNoteContent(value) : ''
    if (nextTitle) setTitle(nextTitle)
    scheduleAutosave(
      item?.complexity === 'note' && nextTitle
        ? { contentMd: value, title: nextTitle }
        : { contentMd: value },
    )
  }

  function handleComplexityChange(complexity: ItemComplexity) {
    if (!selectedItemId || !item) return
    if (saveTimeout.current) {
      clearTimeout(saveTimeout.current)
      saveTimeout.current = null
    }
    pendingPatch.current = null
    setDirty(false)
    setIsSaving(false)

    if (complexity === 'note') {
      const nextContent =
        item.complexity === 'note' ? content : mergeTaskTitleIntoNoteContent(title, content)
      setPriority(4)
      setRecurrence('')
      setDueTime('')
      setContent(nextContent)
      setTitle(titleFromNoteContent(nextContent) || title)
      updateItem(selectedItemId, {
        complexity,
        contentMd: nextContent || undefined,
      })
      return
    }
    if (item.complexity === 'note' && complexity === 'task') {
      const next = splitNoteContentForTask(content)
      if (!next.title) return
      setTitle(next.title)
      setContent(next.contentMd)
      updateItem(selectedItemId, {
        complexity,
        title: next.title,
        contentMd: next.contentMd || undefined,
      })
      return
    }
    updateItem(selectedItemId, { complexity })
  }

  function handleStatusChange(status: ItemStatus) {
    if (!selectedItemId || !item) return
    const activeRecurrence = recurrence || item.recurrence
    if (item.status !== 'done' && status === 'done' && activeRecurrence) {
      if (saveTimeout.current) {
        clearTimeout(saveTimeout.current)
        saveTimeout.current = null
      }
      pendingPatch.current = null
      const nextDueDate = computeNextRecurringDate(dueDate || item.dueDate, activeRecurrence)
      setDueDate(nextDueDate)
      setDirty(false)
      setIsSaving(false)
      updateItem(selectedItemId, {
        status: 'todo',
        dueDate: nextDueDate,
      })
      return
    }
    updateItem(selectedItemId, { status })
  }

  function handleTagsBlur() {
    if (!selectedItemId) return
    updateItem(selectedItemId, { tags: parseTags(tags) })
  }

  function updateTags(nextTags: string[]) {
    const next = Array.from(new Set(nextTags.map(normalizeToken).filter(Boolean)))
    setTags(next.join(', '))
    if (selectedItemId) updateItem(selectedItemId, { tags: next })
  }

  function addTag(value: string) {
    const tag = normalizeToken(value).replace(/^@/, '')
    if (!tag) return
    updateTags([...tagList, tag])
    setTagQuery('')
  }

  function handleDueDateChange(value: string) {
    setDueDate(value)
    if (value) {
      scheduleAutosave({ dueDate: value })
    } else {
      setDueTime('')
      scheduleAutosave(nullablePatch({ dueDate: null, dueTime: null }))
    }
  }

  function handleDueTimeChange(next: string) {
    setDueTime(next)
    const nextDueDate = dueDate || todayDate()
    if (!dueDate) setDueDate(nextDueDate)
    if (!selectedItemId) return
    updateItem(
      selectedItemId,
      nullablePatch({
        dueDate: nextDueDate,
        dueTime: next || null,
      }),
    )
  }

  function handlePriorityChange(p: Priority) {
    setPriority(p)
    if (!selectedItemId) return
    updateItem(selectedItemId, p === 4 ? nullablePatch({ priority: null }) : { priority: p })
  }

  function handleRecurrenceChange(next: ItemRecurrence | '') {
    setRecurrence(next)
    const nextDueDate = next && !dueDate ? todayDate() : dueDate
    if (nextDueDate !== dueDate) setDueDate(nextDueDate)
    if (!selectedItemId) return
    updateItem(
      selectedItemId,
      nullablePatch({
        recurrence: next || null,
        ...(next && !dueDate ? { dueDate: nextDueDate } : {}),
      }),
    )
    setPopover(null)
  }

  function handleProjectChange(projectId: string) {
    if (!selectedItemId) return
    updateItem(selectedItemId, nullablePatch({ folderId: projectId || null }))
  }

  async function addProject(value: string) {
    const name = value.trim()
    if (!name || !selectedItemId) return

    const existing = activeProjects.find(
      (project) => normalizeToken(project.name) === normalizeToken(name),
    )
    if (existing) {
      handleProjectChange(projectIdOf(existing))
      setProjectQuery('')
      setPopover(null)
      return
    }

    setCreatingProject(true)
    try {
      const project = await createProject({ name })
      const id = projectIdOf(project)
      if (id) handleProjectChange(id)
      setProjectQuery('')
      setPopover(null)
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Erro ao criar pasta.', 'error')
    } finally {
      setCreatingProject(false)
    }
  }

  async function handleArchive() {
    if (!selectedItemId) return
    await archiveItem(selectedItemId)
    setSelectedItemId(null)
  }

  async function handleCreateCalendarEvent() {
    if (!selectedItemId) return
    setCreatingEvent(true)
    try {
      const res = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: selectedItemId }),
      })
      if (res.ok) {
        toast('Evento criado no Google Calendar!', 'success')
      } else {
        const { error } = (await res.json()) as { error: string }
        toast(
          error === 'Google account not connected'
            ? 'Conecte o Google Calendar em ConfiguraÃ§Ãµes.'
            : 'Erro ao criar evento.',
          'error',
        )
      }
    } catch {
      toast('Erro ao criar evento.', 'error')
    } finally {
      setCreatingEvent(false)
    }
  }

  if (!selectedItemId) return null

  // Evita o flash do overlay enquanto o redirecionamento para /notas/[id] acontece.
  if (item && item.complexity === 'note') return null

  if (isLoading || !item) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-navy-900/40 backdrop-blur-sm">
        <div className="animate-pulse rounded-xl bg-white p-8 shadow-cool-lg">
          <div className="h-6 bg-slate-100 rounded mb-4 w-48" />
          <div className="h-4 bg-slate-100 rounded mb-2 w-32" />
        </div>
      </div>
    )
  }

  const isNote = item.complexity === 'note'
  const today = todayDate()
  const isTodaySelected = dueDate === today
  const selectedProject = activeProjects.find((project) => projectIdOf(project) === item.folderId)
  const priorityConfig = PRIORITY_CONFIG[priority]
  const canSwitchNoteToTask = content.split(/\r?\n/).filter((line) => line.trim()).length <= 1
  const recurrenceLabel = formatRecurrenceLabel(recurrence, dueDate)

  if (isNote) {
    return (
      <>
        <div
          className="fixed inset-0 z-[55] hidden lg:block lg:left-[var(--item-detail-sidebar-offset)]"
          style={noteBackdropStyle}
          onClick={() => void flushAndClose()}
          aria-hidden="true"
        />
        <div
          className="fixed inset-0 z-[60] flex flex-col bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.96),rgba(236,247,255,0.82)_36%,rgba(246,241,255,0.86)_72%)] lg:left-[var(--item-detail-sidebar-offset)]"
          role="dialog"
          aria-modal="true"
          style={noteFullscreenStyle}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault()
              e.stopPropagation()
              void flushAndClose()
            }
          }}
          tabIndex={-1}
          ref={(el) => {
            if (el && !el.contains(document.activeElement)) el.focus()
          }}
        >
          <div className="relative flex min-h-0 flex-1 flex-col">
            <div className="relative z-[65] flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1 border-b border-white/45 bg-white/50 px-3 py-2 shadow-sm backdrop-blur-xl">
              <button
                type="button"
                title="Fechar nota (Esc)"
                onClick={() => void flushAndClose()}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-white/75 hover:text-slate-800"
              >
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
              <span
                className="hidden shrink-0 text-[11px] font-medium text-slate-400 sm:inline"
                title={dirty || isSaving ? 'Salvando...' : 'Salvo'}
              >
                {dirty || isSaving ? 'Salvando...' : 'Salvo'}
              </span>
              <span
                aria-hidden="true"
                title={dirty || isSaving ? 'Salvando...' : 'Salvo'}
                className={`inline-block h-1.5 w-1.5 shrink-0 rounded-full sm:hidden ${
                  dirty || isSaving ? 'bg-amber-400' : 'bg-emerald-500'
                }`}
              />

              {canSwitchNoteToTask && (
                <button
                  type="button"
                  title="Trocar para tarefa"
                  onClick={() => handleComplexityChange('task')}
                  className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-brand-200/70 bg-white/64 px-2 text-[12px] font-medium text-brand-700 shadow-sm backdrop-blur transition-colors hover:bg-white/80"
                >
                  <IconNote className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Nota</span>
                </button>
              )}

              <div className="relative shrink-0">
                <ToolButton
                  title="Selecionar ou criar tag"
                  active={tagList.length > 0}
                  onClick={() => setPopover(popover === 'tags' ? null : 'tags')}
                >
                  <IconTag className="h-3.5 w-3.5" />
                  {tagList.length > 0 ? tagList.length : ''}
                </ToolButton>
                {popover === 'tags' && (
                  <div className="absolute left-0 top-9 z-[80] w-64 rounded-xl border border-ui-border bg-white p-2 shadow-cool-md">
                    {tagList.length > 0 && (
                      <div className="mb-2 flex flex-wrap gap-1">
                        {tagList.map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => updateTags(tagList.filter((current) => current !== tag))}
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

              <div className="relative shrink-0">
                <button
                  type="button"
                  title={selectedProject ? `Pasta: ${selectedProject.name}` : 'Selecionar pasta'}
                  aria-label={
                    selectedProject ? `Pasta: ${selectedProject.name}` : 'Selecionar pasta'
                  }
                  onClick={() => setPopover(popover === 'project' ? null : 'project')}
                  className={`inline-flex h-7 items-center gap-1.5 rounded-[10px] border px-2 text-[12px] font-medium transition-colors ${
                    selectedProject
                      ? 'border-ui-border-selected bg-surface-selected text-brand-700'
                      : 'border-ui-border-soft bg-surface-soft text-slate-500 hover:bg-white hover:text-slate-800'
                  }`}
                >
                  <IconInbox className="h-3.5 w-3.5 shrink-0" />
                  <span className="hidden max-w-[120px] truncate sm:inline">
                    {selectedProject?.name ?? 'Pasta'}
                  </span>
                </button>
                {popover === 'project' && (
                  <div className="absolute left-0 top-9 z-[80] w-72 rounded-xl border border-ui-border bg-white p-2 shadow-cool-md">
                    <input
                      value={projectQuery}
                      onChange={(e) => setProjectQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          void addProject(projectQuery)
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
                          handleProjectChange('')
                          setPopover(null)
                        }}
                        className="flex w-full items-center gap-2 rounded-[10px] bg-surface-soft px-2 py-1.5 text-left text-[12px] text-slate-700 hover:bg-surface-selected"
                      >
                        <IconInbox className="h-3.5 w-3.5 text-slate-400" />
                        Inbox
                        {!item.folderId && (
                          <IconCheck className="ml-auto h-3.5 w-3.5 text-slate-500" />
                        )}
                      </button>
                      {filteredProjects.map(({ folder: project, depth }) => {
                        const id = projectIdOf(project)
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => {
                              handleProjectChange(id)
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
                            {item.folderId === id && (
                              <IconCheck className="h-3.5 w-3.5 text-slate-500" />
                            )}
                          </button>
                        )
                      })}
                      {projectQuery.trim() &&
                        !activeProjects.some(
                          (project) =>
                            normalizeToken(project.name) === normalizeToken(projectQuery),
                        ) && (
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

              <div className="relative shrink-0">
                <ToolButton
                  title={dueDate ? `Data: ${formatDueDate(dueDate)}` : 'Selecionar data'}
                  active={!!dueDate}
                  onClick={() => setPopover(popover === 'date' ? null : 'date')}
                >
                  <IconCalendar className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">
                    {dueDate ? formatDueDate(dueDate) : 'Data'}
                  </span>
                </ToolButton>
                {popover === 'date' && (
                  <div className="absolute left-0 top-9 z-[80] w-64 rounded-xl border border-ui-border bg-white p-2 shadow-cool-md">
                    {DATE_SUGGESTIONS.map((suggestion) => {
                      const value = suggestion.getValue()
                      return (
                        <button
                          key={suggestion.label}
                          type="button"
                          onClick={() => {
                            handleDueDateChange(value)
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
                      onChange={(e) => handleDueDateChange(e.target.value)}
                      className="mt-1 h-8 w-full rounded-[10px] border border-ui-border-soft bg-surface-soft px-2 text-[12px] text-slate-800 outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    {dueDate && (
                      <button
                        type="button"
                        onClick={() => {
                          handleDueDateChange('')
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

              <div className="shrink-0">
                <ItemVersions itemId={item.id} iconTrigger />
              </div>

              <button
                type="button"
                onClick={handleArchive}
                title="Arquivar"
                aria-label="Arquivar"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-white/75 hover:text-red-500"
              >
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  aria-hidden="true"
                >
                  <path d="M3 5h18v4H3z" />
                  <path d="M5 9v10h14V9" />
                  <path d="M10 13h4" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="min-h-0 flex-1 gap-3 p-2 sm:p-4 xl:flex">
              <div
                className="min-h-0 flex-1 overflow-y-auto"
                data-note-scroll-container="true"
              >
                <MarkdownEditor
                  value={content}
                  onChange={handleContentChange}
                  placeholder="Escreva em Markdown..."
                  minHeight="min-h-[calc(100vh-96px)] sm:min-h-[calc(100vh-128px)]"
                  plain
                  itemId={item.id}
                  focusAtStart
                />
              </div>

              <aside className="hidden w-[286px] shrink-0 flex-col overflow-y-auto rounded-[24px] border border-white/60 bg-white/58 p-4 shadow-cool-sm backdrop-blur-xl xl:flex">
                <div className="rounded-[18px] border border-brand-200/45 bg-gradient-to-br from-brand-50/80 to-teal-50/70 p-3">
                  <div className="flex items-center justify-between text-[12px] font-semibold text-navy-700">
                    <span>Progresso</span>
                    <span>{noteTaskStats.total > 0 ? `${noteTaskProgress}%` : 'Nota'}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/70">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand-500 to-teal-400"
                      style={{ width: `${noteTaskProgress}%` }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                      {noteTaskStats.total > 0
                        ? `${noteTaskStats.done} / ${noteTaskStats.total} checklist`
                        : `${noteWordCount} palavras`}
                    </span>
                    <span>{noteLinkCount} links</span>
                  </div>
                </div>

                <section className="mt-5">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                    Outline
                  </p>
                  <div className="mt-2 space-y-1">
                    {noteOutline.length > 0 ? (
                      noteOutline.map((entry, index) => (
                        <div
                          key={`${entry.text}-${index}`}
                          className="truncate rounded-[12px] px-2 py-1.5 text-[12px] font-medium text-slate-600 hover:bg-white/65"
                          style={{ paddingLeft: `${8 + (entry.level - 1) * 12}px` }}
                        >
                          {entry.text}
                        </div>
                      ))
                    ) : (
                      <p className="rounded-[14px] border border-white/60 bg-white/46 px-3 py-2 text-[12px] text-slate-500">
                        Use titulos Markdown para montar o sumario desta nota.
                      </p>
                    )}
                  </div>
                </section>

                <section className="mt-5">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                    Propriedades
                  </p>
                  <div className="mt-2 space-y-2 text-[12px] text-slate-600">
                    <div className="flex items-center justify-between rounded-[14px] border border-white/60 bg-white/46 px-3 py-2">
                      <span>Pasta</span>
                      <span className="min-w-0 max-w-[150px] truncate font-semibold text-navy-700">
                        {selectedProject?.name ?? 'Inbox'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-[14px] border border-white/60 bg-white/46 px-3 py-2">
                      <span>Data</span>
                      <span className="font-semibold text-navy-700">
                        {dueDate ? formatDueDate(dueDate) : 'Sem data'}
                      </span>
                    </div>
                    <div className="rounded-[14px] border border-white/60 bg-white/46 px-3 py-2">
                      <span className="block text-slate-500">Tags</span>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {tagList.length > 0 ? (
                          tagList.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full bg-brand-50 px-2 py-0.5 font-mono text-[10px] font-semibold text-brand-700"
                            >
                              @{tag}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-slate-400">Sem tags</span>
                        )}
                      </div>
                    </div>
                  </div>
                </section>

                <section className="mt-5">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                    Relacionados
                  </p>
                  <div className="mt-2 space-y-2">
                    {relatedItems.length > 0 ? (
                      relatedItems.map((related) => (
                        <button
                          key={related.id}
                          type="button"
                          onClick={() => setSelectedItemId(related.id)}
                          className="block w-full rounded-[14px] border border-white/60 bg-white/46 px-3 py-2 text-left hover:bg-white/75"
                        >
                          <span className="block truncate text-[12px] font-semibold text-navy-700">
                            {related.title}
                          </span>
                          <span className="mt-0.5 block font-mono text-[10px] uppercase tracking-wide text-slate-400">
                            {statusLabel(related.status)}
                          </span>
                        </button>
                      ))
                    ) : (
                      <p className="rounded-[14px] border border-white/60 bg-white/46 px-3 py-2 text-[12px] text-slate-500">
                        Nenhum Item referencia este titulo ainda.
                      </p>
                    )}
                  </div>
                </section>
              </aside>
            </div>
          </div>
        </div>
      </>
    )
  }

  if (!isNote && (item.complexity === 'task' || item.complexity === 'capture')) {
    return (
      <div
        className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-navy-900/22 p-3 pt-[6vh] backdrop-blur-md sm:p-4 sm:pt-[8vh]"
        role="dialog"
        aria-modal="true"
        onPointerDown={handleBackdropPointerDown}
        onClick={handleBackdropClick}
        onKeyDown={handleModalKeyDown}
      >
        <div className="w-full max-w-[560px] overflow-visible rounded-[28px] border border-white/70 bg-white/90 shadow-cool-lg backdrop-blur-xl">
          <div className="flex flex-col">
            <div className="px-5 pb-4 pt-5">
              <div className="flex items-center gap-3">
                <textarea
                  ref={taskTitleRef}
                  value={title}
                  onKeyDown={handleTaskTitleKeyDown}
                  onChange={(e) => {
                    handleTitleChange(e)
                    autosizeTextarea(e.currentTarget)
                  }}
                  placeholder="Nome da tarefa"
                  rows={1}
                  className="max-h-40 min-w-0 flex-1 resize-none overflow-hidden border-none bg-transparent text-[16px] font-semibold leading-6 text-slate-900 outline-none placeholder:text-slate-300"
                />
                <button
                  type="button"
                  title="Trocar para nota"
                  onClick={() => handleComplexityChange('note')}
                  className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-white/60 bg-white/46 px-2 text-[12px] font-medium text-slate-500 shadow-sm backdrop-blur transition-colors hover:bg-white/75 hover:text-slate-800"
                >
                  <IconNote className="h-3.5 w-3.5" />
                  Nota
                </button>
              </div>

              <textarea
                ref={taskContentRef}
                value={content}
                onChange={(e) => {
                  handleContentChange(e.target.value)
                  autosizeTextarea(e.currentTarget)
                }}
                placeholder="DescriÃ§Ã£o"
                rows={2}
                className="mt-1 block min-h-[48px] w-full resize-none overflow-hidden border-none bg-transparent text-[14px] leading-5 text-slate-700 outline-none placeholder:text-slate-300"
              />

              <div className="relative mt-2 flex flex-wrap items-center gap-2">
                <div className="relative">
                  <ToolButton
                    title="Selecionar data"
                    active={!!dueDate}
                    onClick={() => setPopover(popover === 'date' ? null : 'date')}
                  >
                    <IconCalendar className="h-3.5 w-3.5" />
                    {isTodaySelected ? 'Hoje' : dueDate ? formatDueDate(dueDate) : 'Hoje'}
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
                              if (selectedItemId) updateItem(selectedItemId, { dueDate: value })
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
                        onChange={(e) => {
                          setDueDate(e.target.value)
                          if (selectedItemId)
                            updateItem(
                              selectedItemId,
                              nullablePatch({ dueDate: e.target.value || null }),
                            )
                        }}
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
                            onClick={() => handleDueTimeChange('')}
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
                            if (selectedItemId)
                              updateItem(
                                selectedItemId,
                                nullablePatch({ dueDate: null, dueTime: null }),
                              )
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
                              handlePriorityChange(p)
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

                <div className="relative">
                  <ToolButton
                    title="Selecionar ou criar tag"
                    active={tagList.length > 0}
                    onClick={() => setPopover(popover === 'tags' ? null : 'tags')}
                  >
                    <IconTag className="h-3.5 w-3.5" />
                    {tagList.length > 0 ? tagList.length : ''}
                  </ToolButton>
                  {popover === 'tags' && (
                    <div className="absolute left-0 top-9 z-10 w-64 rounded-xl border border-ui-border bg-white p-2 shadow-cool-md">
                      {tagList.length > 0 && (
                        <div className="mb-2 flex flex-wrap gap-1">
                          {tagList.map((tag) => (
                            <button
                              key={tag}
                              type="button"
                              onClick={() =>
                                updateTags(tagList.filter((current) => current !== tag))
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

            <div className="flex items-center gap-2 border-t border-white/55 bg-white/66 px-5 py-3 backdrop-blur">
              <div className="relative min-w-0 flex-1">
                <button
                  type="button"
                  title="Selecionar ou criar pasta"
                  onClick={() => setPopover(popover === 'project' ? null : 'project')}
                  className="inline-flex h-7 max-w-full items-center gap-1.5 rounded-full border border-white/60 bg-white/46 px-2 text-[12px] font-medium text-slate-500 shadow-sm backdrop-blur transition-colors hover:bg-white/75 hover:text-slate-800"
                >
                  <IconInbox className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{selectedProject?.name ?? 'Pasta'}</span>
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
                      placeholder="Buscar ou criar pasta"
                      className="h-8 w-full rounded-[10px] border border-ui-border-soft bg-surface-soft px-2 text-[12px] text-slate-800 outline-none focus:ring-2 focus:ring-brand-500"
                      autoFocus
                    />
                    <div className="mt-1 max-h-52 overflow-y-auto">
                      <button
                        type="button"
                        onClick={() => {
                          handleProjectChange('')
                          setPopover(null)
                        }}
                        className="flex w-full items-center gap-2 rounded-[10px] bg-surface-soft px-2 py-1.5 text-left text-[12px] text-slate-700 hover:bg-surface-selected"
                      >
                        <IconInbox className="h-3.5 w-3.5 text-slate-400" />
                        Inbox
                        {!item.folderId && (
                          <IconCheck className="ml-auto h-3.5 w-3.5 text-slate-500" />
                        )}
                      </button>
                      {filteredProjects.map(({ folder: project, depth }) => {
                        const id = projectIdOf(project)
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => {
                              handleProjectChange(id)
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
                            {item.folderId === id && (
                              <IconCheck className="h-3.5 w-3.5 text-slate-500" />
                            )}
                          </button>
                        )
                      })}
                      {projectQuery.trim() &&
                        !activeProjects.some(
                          (project) =>
                            normalizeToken(project.name) === normalizeToken(projectQuery),
                        ) && (
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

              <span className="hidden text-[11px] text-slate-400 sm:inline">
                {dirty || isSaving ? 'Salvando...' : 'Salvo'}
              </span>
              <button
                type="button"
                onClick={handleArchive}
                className="h-8 rounded-full px-3 text-[12px] font-semibold text-slate-400 hover:bg-white/75 hover:text-red-500"
              >
                Arquivar
              </button>
              <button
                type="button"
                onClick={() => setSelectedItemId(null)}
                className="h-8 rounded-full px-3 text-[12px] font-semibold text-slate-500 hover:bg-white/75 hover:text-slate-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => setSelectedItemId(null)}
                className="h-8 rounded-full bg-brand-600 px-3 text-[12px] font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-navy-900/22 p-0 backdrop-blur-md sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      onClick={(e) => e.target === e.currentTarget && setSelectedItemId(null)}
    >
      <div
        className={`flex flex-col overflow-hidden border border-white/70 bg-white/90 shadow-cool-lg backdrop-blur-xl transition-all duration-300 ${
          isNote
            ? 'h-full w-full max-w-5xl rounded-t-2xl sm:rounded-xl'
            : 'max-h-[85vh] w-full max-w-lg rounded-t-2xl sm:rounded-xl'
        }`}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/45 bg-white/42 px-6 py-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedItemId(null)}
              className="-ml-2 rounded-full p-2 text-slate-400 transition-colors hover:bg-white/75 hover:text-slate-600"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
            <span className="text-sm font-medium text-slate-500">{isNote ? 'Nota' : 'Tarefa'}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-400">
              {dirty || isSaving ? 'Salvando...' : 'Salvo'}
            </span>
            <button
              onClick={handleArchive}
              className="text-xs font-semibold text-slate-400 hover:text-red-500 transition-colors px-2 py-1"
            >
              Arquivar
            </button>
          </div>
        </div>

        <div className={`flex-1 overflow-y-auto ${isNote ? 'flex flex-col lg:flex-row' : ''}`}>
          {/* Main Content Area */}
          <div
            className={`p-6 space-y-6 ${isNote ? 'flex-1 lg:border-r border-ui-border-soft' : ''}`}
          >
            {/* TÃ­tulo */}
            <input
              value={title}
              onChange={handleTitleChange}
              placeholder="TÃ­tulo"
              className={`w-full font-bold text-slate-900 border-none outline-none bg-transparent placeholder:text-slate-300 ${
                isNote ? 'text-3xl' : 'text-xl'
              }`}
            />

            {/* Editor Markdown */}
            <div className="min-h-[200px]">
              <label className="text-xs text-slate-400 font-medium block mb-2">ConteÃºdo</label>
              <MarkdownEditor value={content} onChange={handleContentChange} itemId={item.id} />
            </div>
          </div>

          {/* Sidebar Properties (only visible or layouted differently for notes) */}
          <div
            className={`${isNote ? 'w-full lg:w-80 p-6 space-y-6 bg-white/36 backdrop-blur' : 'px-6 pb-6 space-y-4'}`}
          >
            {/* Status */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-slate-500">Status</label>
              <StatusSelect value={item.status} onChange={handleStatusChange} />
            </div>

            {!isNote && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-slate-500">Prioridade</label>
                <PrioritySelect value={priority} onChange={handlePriorityChange} />
              </div>
            )}

            {/* Complexidade */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-slate-500">Complexidade</label>
              <ComplexitySelect value={item.complexity} onChange={handleComplexityChange} />
            </div>

            {/* Prazo (Mainly for tasks) */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-slate-500">Prazo</label>
              <DueDatePicker value={dueDate} onChange={handleDueDateChange} />
              {dueDate && (
                <button
                  onClick={handleCreateCalendarEvent}
                  disabled={creatingEvent}
                  className="flex items-center gap-1.5 text-[12px] text-brand-600 hover:text-brand-700 disabled:opacity-50 transition-colors w-fit"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <path d="M16 2v4M8 2v4M3 10h18" />
                    <path d="M12 14v4M10 16h4" strokeLinecap="round" />
                  </svg>
                  {creatingEvent ? 'Criando...' : 'Google Calendar'}
                </button>
              )}
            </div>

            {/* Pasta */}
            <div className="grid grid-cols-1 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-slate-500">Pasta</label>
                <select
                  value={item.folderId ?? ''}
                  onChange={(e) => handleProjectChange(e.target.value)}
                  className="w-full text-[14px] border border-ui-border-soft rounded-[10px] px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
                >
                  <option value="">Nenhum</option>
                  {projects
                    .filter((p) => p.status !== 'archived')
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-medium text-slate-500">Etiquetas</label>
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                onBlur={handleTagsBlur}
                placeholder="ex: trabalho, urgente"
                className="w-full text-[14px] border border-ui-border-soft rounded-[10px] px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500 transition-colors"
              />
            </div>

            {/* Versions only in Note mode or at the bottom */}
            {isNote && (
              <div className="pt-4 border-t border-slate-100">
                <ItemVersions itemId={item.id} />
              </div>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="flex justify-between border-t border-white/45 bg-white/42 px-6 py-3 text-[10px] text-slate-400 backdrop-blur">
          <span>Criado em {new Date(item.createdAt).toLocaleString('pt-BR')}</span>
          <span>Atualizado em {new Date(item.updatedAt).toLocaleString('pt-BR')}</span>
        </div>
      </div>
    </div>
  )
}
