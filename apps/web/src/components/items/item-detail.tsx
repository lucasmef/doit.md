'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import { useItem, updateItem, archiveItem, useItems } from '@/hooks/use-items'
import { createProject, useProjects } from '@/hooks/use-projects'
import { useUI } from '@/store/ui'
import { ComplexitySelect } from './complexity-select'
import { StatusSelect } from './status-select'
import { ItemVersions } from './item-versions'
import { MarkdownEditor } from './markdown-editor'
import { PRIORITY_CONFIG, PrioritySelect } from './priority-select'
import { DueDatePicker } from './due-date-picker'
import type { Priority } from './priority-select'
import { useToast } from '@/components/ui/toast'
import type { ItemComplexity, ItemRecurrence, ItemStatus, Project, UpdateItemInput } from '@doit/types'
import { toLocalDateKey } from '@doit/core'

type Popover = 'date' | 'priority' | 'recurrence' | 'tags' | 'project' | null
const PRIORITIES: Priority[] = [1, 2, 3, 4]
const RECURRENCE_OPTIONS: Array<{ value: ItemRecurrence | ''; label: string }> = [
  { value: '', label: 'Sem recorrência' },
  { value: 'daily', label: 'Todo dia' },
  { value: 'weekdays', label: 'Dias úteis' },
  { value: 'weekly', label: 'Toda semana' },
  { value: 'monthly', label: 'Todo mês' },
  { value: 'yearly', label: 'Todo ano' },
]

function nullablePatch<T extends Record<string, unknown>>(patch: T): UpdateItemInput {
  return patch as unknown as UpdateItemInput
}

function formatDueDate(dateStr: string): string {
  const tomorrowDate = new Date()
  tomorrowDate.setDate(tomorrowDate.getDate() + 1)
  const today = toLocalDateKey()
  const tomorrow = toLocalDateKey(tomorrowDate)
  if (dateStr === today) return 'Hoje'
  if (dateStr === tomorrow) return 'Amanhã'
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
const PRIORITY_SHORTCUT = /(?:^|\s)p([1-4])\b/i
const PROJECT_SHORTCUT = /(?:^|\s)#([\p{L}\p{N}][\p{L}\p{N}_-]*)/iu
const TAG_SHORTCUT = /(?:^|\s)@([\p{L}\p{N}][\p{L}\p{N}_-]*)/giu
const DATE_WORD_SHORTCUT = /(?:^|\s)(hoje|amanh[ãa]|depois de amanh[ãa]|fim de semana|final de semana|semana que vem|segunda(?:-feira)?|ter[cç]a(?:-feira)?|quarta(?:-feira)?|quinta(?:-feira)?|sexta(?:-feira)?|s[áa]bado|domingo)\b/iu
const SLASH_DATE_SHORTCUT = /(?:^|\s)(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/u
const ISO_DATE_SHORTCUT = /(?:^|\s)(\d{4}-\d{2}-\d{2})\b/u
const TIME_SHORTCUT = /(?:^|\s)(?:as\s+|às\s+)?([01]?\d|2[0-3])(?::([0-5]\d)|h([0-5]\d)?)\b/iu

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

function projectIdOf(project: Project) {
  return project.id ?? ((project as unknown as { _id?: string })._id ?? '')
}

function parseTags(value: string) {
  return value.split(',').map((tag) => normalizeToken(tag)).filter(Boolean)
}

function titleFromNoteContent(content: string) {
  const firstLine = content.split(/\r?\n/).find((line) => line.trim())?.trim() ?? ''
  return firstLine.replace(/^#{1,6}\s+/, '').replace(/[*_`[\]]/g, '').trim()
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

export function ItemDetail() {
  const { selectedItemId, setSelectedItemId } = useUI()
  const { item, isLoading } = useItem(selectedItemId)
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

  const activeProjects = projects.filter((p) => p.status !== 'archived')
  const tagList = useMemo(() => parseTags(tags), [tags])
  const knownTags = useMemo(() => {
    return Array.from(new Set(items.flatMap((current) => current.tags ?? []).map(normalizeToken))).sort()
  }, [items])

  const filteredTags = knownTags.filter((tag) => {
    const query = normalizeToken(tagQuery)
    return !tagList.includes(tag) && (!query || tag.includes(query))
  })

  const filteredProjects = activeProjects.filter((project) => {
    const query = normalizeToken(projectQuery)
    return !query || normalizeToken(project.name).includes(query)
  })

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
        (p) => normalizeToken(p.name) === wanted || normalizeToken(p.name).replace(/\s+/g, '-') === normalizeToken(projectToken),
      )
      if (project) {
        patch['folderId'] = projectIdOf(project)
        hasCategorizer = true
      }
    }

    const foundTags = Array.from(value.matchAll(TAG_SHORTCUT)).map((match) => match[1]).filter(Boolean) as string[]
    if (foundTags.length > 0) {
      const nextTags = Array.from(new Set([...tagList, ...foundTags.map((tag) => normalizeToken(tag))]))
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

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
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
    scheduleAutosave(item?.complexity === 'note' && nextTitle ? { contentMd: value, title: nextTitle } : { contentMd: value })
  }

  function handleComplexityChange(complexity: ItemComplexity) {
    if (!selectedItemId) return
    if (complexity === 'note') {
      setPriority(4)
      setRecurrence('')
      setDueTime('')
    }
    updateItem(selectedItemId, { complexity })
  }

  function handleStatusChange(status: ItemStatus) {
    if (!selectedItemId) return
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
    scheduleAutosave({ dueDate: value || undefined })
  }

  function handleDueTimeChange(next: string) {
    setDueTime(next)
    const nextDueDate = dueDate || todayDate()
    if (!dueDate) setDueDate(nextDueDate)
    if (!selectedItemId) return
    updateItem(selectedItemId, nullablePatch({
      dueDate: nextDueDate,
      dueTime: next || null,
    }))
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
    updateItem(selectedItemId, nullablePatch({
      recurrence: next || null,
      ...(next && !dueDate ? { dueDate: nextDueDate } : {}),
    }))
    setPopover(null)
  }

  function handleProjectChange(projectId: string) {
    if (!selectedItemId) return
    updateItem(selectedItemId, { folderId: projectId || undefined })
  }

  async function addProject(value: string) {
    const name = value.trim()
    if (!name || !selectedItemId) return

    const existing = activeProjects.find((project) => normalizeToken(project.name) === normalizeToken(name))
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
        const { error } = await res.json() as { error: string }
        toast(error === 'Google account not connected' ? 'Conecte o Google Calendar em Configurações.' : 'Erro ao criar evento.', 'error')
      }
    } catch {
      toast('Erro ao criar evento.', 'error')
    } finally {
      setCreatingEvent(false)
    }
  }

  if (!selectedItemId) return null

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
  const recurrenceLabel = RECURRENCE_OPTIONS.find((option) => option.value === recurrence)?.label ?? 'Recorrência'

  if (isNote) {
    return (
      <>
        <div
          className="fixed inset-0 z-[55] hidden lg:block lg:left-[260px]"
          onClick={() => void flushAndClose()}
          aria-hidden="true"
        />
        <div
          className="fixed inset-0 z-[60] flex flex-col bg-white lg:left-[260px] lg:border-l lg:border-ui-border"
          role="dialog"
          aria-modal="true"
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              e.preventDefault()
              e.stopPropagation()
              void flushAndClose()
            }
          }}
          tabIndex={-1}
          ref={(el) => { if (el && !el.contains(document.activeElement)) el.focus() }}
        >
          <div className="relative flex min-h-0 flex-1 flex-col">
            <div className="flex shrink-0 items-center gap-2 overflow-x-auto border-b border-ui-border bg-surface-soft px-3 py-2">
              <button
                type="button"
                title="Fechar nota (Esc)"
                onClick={() => void flushAndClose()}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] text-slate-500 hover:bg-white hover:text-slate-800"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
              <span className="shrink-0 text-[11px] font-medium text-slate-400">{dirty || isSaving ? 'Salvando...' : 'Salvo'}</span>

              {canSwitchNoteToTask && (
                <button
                  type="button"
                  title="Trocar para tarefa"
                  onClick={() => handleComplexityChange('task')}
                  className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-[10px] border border-ui-border-selected bg-surface-selected px-2 text-[12px] font-medium text-brand-700 transition-colors hover:bg-white"
                >
                  <IconNote className="h-3.5 w-3.5" />
                  Nota
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
                  <div className="absolute left-0 top-9 z-20 w-64 rounded-xl border border-ui-border bg-white p-2 shadow-cool-md">
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

              <button
                type="button"
                disabled
                title="Anexos"
                className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-[10px] border border-ui-border-soft bg-white px-2 text-[12px] font-medium text-slate-300"
              >
                Anexos
              </button>

              <div className="relative min-w-[130px] shrink-0">
                <button
                  type="button"
                  title="Selecionar ou criar pasta"
                  onClick={() => setPopover(popover === 'project' ? null : 'project')}
                  className="inline-flex h-7 max-w-full items-center gap-1.5 rounded-[10px] border border-ui-border-soft bg-surface-soft px-2 text-[12px] font-medium text-slate-500 transition-colors hover:bg-white hover:text-slate-800"
                >
                  <IconInbox className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{selectedProject?.name ?? 'Pasta'}</span>
                </button>
                {popover === 'project' && (
                  <div className="absolute left-0 top-9 z-20 w-72 rounded-xl border border-ui-border bg-white p-2 shadow-cool-md">
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
                        {!item.folderId && <IconCheck className="ml-auto h-3.5 w-3.5 text-slate-500" />}
                      </button>
                      {filteredProjects.map((project) => {
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
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: project.color ?? '#94a3b8' }} />
                            <span className="min-w-0 flex-1 truncate">{project.name}</span>
                            {item.folderId === id && <IconCheck className="h-3.5 w-3.5 text-slate-500" />}
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

              <div className="w-56 shrink-0">
                <ItemVersions itemId={item.id} compact />
              </div>

              <button
                type="button"
                onClick={handleArchive}
                className="h-8 shrink-0 rounded-[10px] px-3 text-[12px] font-semibold text-slate-400 hover:bg-white hover:text-red-500"
              >
                Arquivar
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-2 sm:p-4">
              <MarkdownEditor
                value={content}
                onChange={handleContentChange}
                placeholder="Escreva em Markdown..."
                minHeight="min-h-[calc(100vh-96px)] sm:min-h-[calc(100vh-128px)]"
                plain
              />
            </div>
          </div>
        </div>
      </>
    )
  }

  if (!isNote && (item.complexity === 'task' || item.complexity === 'capture')) {
    return (
      <div
        className="fixed inset-0 z-[60] flex items-start justify-center bg-navy-900/40 p-4 pt-[8vh] backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && setSelectedItemId(null)}
      >
        <div className="w-full max-w-[560px] overflow-visible rounded-xl border border-ui-border bg-white shadow-cool-lg">
          <div className="flex flex-col">
            <div className="px-5 pb-4 pt-5">
              <div className="flex items-center gap-3">
                <input
                  value={title}
                  onChange={handleTitleChange}
                  placeholder="Nome da tarefa"
                  className="min-w-0 flex-1 border-none bg-transparent text-[16px] font-semibold leading-6 text-slate-900 outline-none placeholder:text-slate-300"
                />
                <button
                  type="button"
                  title="Trocar para nota"
                  onClick={() => handleComplexityChange('note')}
                  className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-[10px] border border-ui-border-soft bg-surface-soft px-2 text-[12px] font-medium text-slate-500 transition-colors hover:bg-white hover:text-slate-800"
                >
                  <IconNote className="h-3.5 w-3.5" />
                  Nota
                </button>
              </div>

              <textarea
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder="Descrição"
                rows={2}
                className="mt-1 block max-h-28 min-h-[48px] w-full resize-y border-none bg-transparent text-[14px] leading-5 text-slate-700 outline-none placeholder:text-slate-300"
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
                            <span className="text-[11px] font-normal text-slate-400">{formatDueDate(value)}</span>
                            {dueDate === value && <IconCheck className="h-3.5 w-3.5 text-slate-500" />}
                          </button>
                        )
                      })}
                      <input
                        type="date"
                        value={dueDate}
                        onChange={(e) => {
                          setDueDate(e.target.value)
                          if (selectedItemId) updateItem(selectedItemId, nullablePatch({ dueDate: e.target.value || null }))
                        }}
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
                            onClick={() => handleDueTimeChange('')}
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
                            if (selectedItemId) updateItem(selectedItemId, nullablePatch({ dueDate: null, dueTime: null }))
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
                            <span className="flex-1">{cfg.label} - {cfg.title}</span>
                            {priority === p && <IconCheck className="h-3.5 w-3.5 text-slate-500" />}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

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
                  title="Selecionar ou criar pasta"
                  onClick={() => setPopover(popover === 'project' ? null : 'project')}
                  className="inline-flex h-7 max-w-full items-center gap-1.5 rounded-[10px] border border-ui-border-soft bg-surface-soft px-2 text-[12px] font-medium text-slate-500 transition-colors hover:bg-white hover:text-slate-800"
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
                        {!item.folderId && <IconCheck className="ml-auto h-3.5 w-3.5 text-slate-500" />}
                      </button>
                      {filteredProjects.map((project) => {
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
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: project.color ?? '#94a3b8' }} />
                            <span className="min-w-0 flex-1 truncate">{project.name}</span>
                            {item.folderId === id && <IconCheck className="h-3.5 w-3.5 text-slate-500" />}
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

              <span className="hidden text-[11px] text-slate-400 sm:inline">{dirty || isSaving ? 'Salvando...' : 'Salvo'}</span>
              <button
                type="button"
                onClick={handleArchive}
                className="h-8 rounded-[10px] px-3 text-[12px] font-semibold text-slate-400 hover:bg-white hover:text-red-500"
              >
                Arquivar
              </button>
              <button
                type="button"
                onClick={() => setSelectedItemId(null)}
                className="h-8 rounded-[10px] px-3 text-[12px] font-semibold text-slate-500 hover:bg-white hover:text-slate-700"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => setSelectedItemId(null)}
                className="h-8 rounded-[10px] bg-brand-600 px-3 text-[12px] font-semibold text-white shadow-sm transition-colors hover:bg-brand-700"
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
      className="fixed inset-0 z-[60] flex items-center justify-center bg-navy-900/40 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && setSelectedItemId(null)}
    >
      <div
        className={`flex flex-col overflow-hidden bg-white shadow-cool-lg transition-all duration-300 ${
          isNote
            ? 'h-full w-full max-w-5xl rounded-xl'
            : 'max-h-[85vh] w-full max-w-lg rounded-xl'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ui-border-soft shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSelectedItemId(null)}
              className="p-2 -ml-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <span className="text-sm font-medium text-slate-500">
              {isNote ? 'Nota' : 'Tarefa'}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-400">{dirty || isSaving ? 'Salvando...' : 'Salvo'}</span>
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
          <div className={`p-6 space-y-6 ${isNote ? 'flex-1 lg:border-r border-ui-border-soft' : ''}`}>
            {/* Título */}
            <input
              value={title}
              onChange={handleTitleChange}
              placeholder="Título"
              className={`w-full font-bold text-slate-900 border-none outline-none bg-transparent placeholder:text-slate-300 ${
                isNote ? 'text-3xl' : 'text-xl'
              }`}
            />

            {/* Editor Markdown */}
            <div className="min-h-[200px]">
              <label className="text-xs text-slate-400 font-medium block mb-2">Conteúdo</label>
              <MarkdownEditor value={content} onChange={handleContentChange} />
            </div>
          </div>

          {/* Sidebar Properties (only visible or layouted differently for notes) */}
          <div className={`${isNote ? 'w-full lg:w-80 p-6 space-y-6 bg-slate-50/50' : 'px-6 pb-6 space-y-4'}`}>
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
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
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
                  {projects.filter((p) => p.status !== 'archived').map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
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
        <div className="px-6 py-3 bg-slate-50 border-t border-ui-border-soft text-[10px] text-slate-400 flex justify-between">
          <span>Criado em {new Date(item.createdAt).toLocaleString('pt-BR')}</span>
          <span>Atualizado em {new Date(item.updatedAt).toLocaleString('pt-BR')}</span>
        </div>
      </div>
    </div>
  )
}
