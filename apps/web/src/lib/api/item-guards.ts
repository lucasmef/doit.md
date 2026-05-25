import { AreaModel, FolderModel, ItemModel } from '@doit/db'
import { parseCustomRecurrence } from '@doit/core'
import type { ItemComplexity, ItemRecurrence, ItemStatus, UpdateItemInput } from '@doit/types'

const ITEM_COMPLEXITIES = new Set<ItemComplexity>([
  'capture',
  'task',
  'note',
  'project',
  'document',
])

const ITEM_STATUSES = new Set<ItemStatus>([
  'inbox',
  'todo',
  'doing',
  'waiting',
  'done',
  'archived',
])

const BUILT_IN_RECURRENCES = new Set<ItemRecurrence>([
  'daily',
  'weekdays',
  'weekly',
  'monthly',
  'yearly',
])

const ITEM_PATCH_FIELDS = new Set<keyof UpdateItemInput>([
  'title',
  'contentMd',
  'complexity',
  'status',
  'priority',
  'dueDate',
  'dueTime',
  'recurrence',
  'startDate',
  'scheduledDate',
  'folderId',
  'projectId',
  'areaId',
  'parentId',
  'tags',
  'backlinks',
  'order',
])

export function pickItemPatch(input: unknown): UpdateItemInput {
  if (!input || typeof input !== 'object') return {}

  const out: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(input)) {
    if (ITEM_PATCH_FIELDS.has(key as keyof UpdateItemInput)) out[key] = value
  }
  return out as UpdateItemInput
}

function hasOwn(input: UpdateItemInput, field: keyof UpdateItemInput) {
  return Object.prototype.hasOwnProperty.call(input, field)
}

function isDateKey(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false

  const [yearText, monthText, dayText] = value.split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

function isTimeKey(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value)
}

function isValidRecurrence(value: string) {
  if (BUILT_IN_RECURRENCES.has(value as ItemRecurrence)) return true
  return value.startsWith('custom:') && parseCustomRecurrence(value as ItemRecurrence) !== null
}

export function validateItemPatchInput(input: UpdateItemInput) {
  if (hasOwn(input, 'title') && typeof input.title !== 'string') return 'title must be a string'
  if (hasOwn(input, 'contentMd') && typeof input.contentMd !== 'string') {
    return 'contentMd must be a string'
  }

  if (hasOwn(input, 'complexity')) {
    if (typeof input.complexity !== 'string' || !ITEM_COMPLEXITIES.has(input.complexity)) {
      return 'complexity is invalid'
    }
  }

  if (hasOwn(input, 'status')) {
    if (typeof input.status !== 'string' || !ITEM_STATUSES.has(input.status)) {
      return 'status is invalid'
    }
  }

  if (hasOwn(input, 'priority')) {
    if (
      input.priority !== null &&
      input.priority !== undefined &&
      (!Number.isInteger(input.priority) || input.priority < 1 || input.priority > 4)
    ) {
      return 'priority is invalid'
    }
  }

  if (hasOwn(input, 'recurrence')) {
    const recurrence = (input as Record<string, unknown>).recurrence
    if (
      recurrence !== null &&
      recurrence !== undefined &&
      recurrence !== '' &&
      (typeof recurrence !== 'string' || !isValidRecurrence(recurrence))
    ) {
      return 'recurrence is invalid'
    }
  }

  for (const field of ['dueDate', 'startDate', 'scheduledDate'] as const) {
    const value = input[field]
    if (
      hasOwn(input, field) &&
      value !== null &&
      value !== undefined &&
      value !== '' &&
      (typeof value !== 'string' || !isDateKey(value))
    ) {
      return `${field} is invalid`
    }
  }

  if (hasOwn(input, 'dueTime')) {
    if (
      input.dueTime !== null &&
      input.dueTime !== undefined &&
      input.dueTime !== '' &&
      (typeof input.dueTime !== 'string' || !isTimeKey(input.dueTime))
    ) {
      return 'dueTime is invalid'
    }
  }

  for (const field of ['folderId', 'projectId', 'areaId', 'parentId'] as const) {
    const value = input[field]
    if (
      hasOwn(input, field) &&
      value !== null &&
      value !== undefined &&
      value !== '' &&
      typeof value !== 'string'
    ) {
      return `${field} must be a string`
    }
  }

  for (const field of ['tags', 'backlinks'] as const) {
    const value = input[field]
    if (
      hasOwn(input, field) &&
      (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string'))
    ) {
      return `${field} must be an array of strings`
    }
  }

  if (hasOwn(input, 'order')) {
    if (
      input.order !== null &&
      input.order !== undefined &&
      (typeof input.order !== 'number' || !Number.isFinite(input.order))
    ) {
      return 'order must be a number'
    }
  }

  return null
}

export function validateItemState(input: Pick<UpdateItemInput, 'title' | 'complexity'>) {
  const complexity = input.complexity ?? 'task'
  if (complexity !== 'note' && !String(input.title ?? '').trim()) {
    return 'title is required'
  }
  return null
}

export async function validateItemReferences(input: UpdateItemInput, userId: string) {
  if (input.folderId) {
    const folder = await FolderModel.findOne({ _id: input.folderId, userId }).lean()
    if (!folder) return 'folderId is invalid'
  }

  if (input.projectId) {
    const folder = await FolderModel.findOne({ _id: input.projectId, userId }).lean()
    if (!folder) return 'projectId is invalid'
  }

  if (input.areaId) {
    const area = await AreaModel.findOne({ _id: input.areaId, userId }).lean()
    if (!area) return 'areaId is invalid'
  }

  if (input.parentId) {
    const parent = await ItemModel.findOne({ _id: input.parentId, userId }).lean()
    if (!parent) return 'parentId is invalid'
  }

  return null
}
