import { AreaModel, FolderModel, ItemModel } from '@doit/db'
import type { UpdateItemInput } from '@doit/types'

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
