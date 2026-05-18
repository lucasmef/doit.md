import type { Item, ItemComplexity, ItemStatus } from '@doit/types'
import { toLocalDateKey } from './date'

export function isToday(item: Item): boolean {
  const today = toLocalDateKey()
  return item.dueDate === today || item.scheduledDate === today
}

export function isOverdue(item: Item): boolean {
  if (!item.dueDate) return false
  const today = toLocalDateKey()
  return item.dueDate < today && item.status !== 'done' && item.status !== 'archived'
}

export function isInbox(item: Item): boolean {
  return item.status === 'inbox' && !item.folderId && !item.dueDate
}

export const COMPLEXITY_LABELS: Record<ItemComplexity, string> = {
  capture: 'Captura',
  task: 'Tarefa',
  note: 'Nota',
  project: 'Projeto',
  document: 'Documento',
}

export const STATUS_LABELS: Record<ItemStatus, string> = {
  inbox: 'Inbox',
  todo: 'A fazer',
  doing: 'Fazendo',
  waiting: 'Aguardando',
  done: 'Concluído',
  archived: 'Arquivado',
}

export const PROTECTED_FIELDS = ['id', 'userId', 'syncHash', 'createdAt'] as const

export const EDITABLE_BY_AI_FIELDS = [
  'title',
  'contentMd',
  'complexity',
  'status',
  'folderId',
  'areaId',
  'tags',
  'dueDate',
  'dueTime',
  'recurrence',
  'localPath',
] as const

export const USER_AGENTS_TAG = 'system:agents' as const
export const USER_AGENTS_TITLE = 'AGENTS.md' as const
export const USER_AGENTS_FILENAME = 'AGENTS.local.md' as const

export function isUserAgentsItem(item: Pick<Item, 'title' | 'tags'>): boolean {
  return item.title === USER_AGENTS_TITLE && item.tags.includes(USER_AGENTS_TAG)
}
