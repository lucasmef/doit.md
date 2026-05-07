import type { Item, ItemComplexity, ItemStatus } from '@doit/types'

export function isToday(item: Item): boolean {
  const today = new Date().toISOString().slice(0, 10)
  return item.dueDate === today || item.scheduledDate === today
}

export function isOverdue(item: Item): boolean {
  if (!item.dueDate) return false
  const today = new Date().toISOString().slice(0, 10)
  return item.dueDate < today && item.status !== 'done' && item.status !== 'archived'
}

export function isInbox(item: Item): boolean {
  return item.status === 'inbox' && !item.projectId && !item.dueDate
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
  'projectId',
  'areaId',
  'tags',
  'dueDate',
  'dueTime',
  'recurrence',
  'localPath',
] as const
