export type ItemComplexity = 'capture' | 'task' | 'note' | 'project' | 'document'

export type ItemStatus = 'inbox' | 'todo' | 'doing' | 'waiting' | 'done' | 'archived'
export type BuiltInItemRecurrence = 'daily' | 'weekdays' | 'weekly' | 'monthly' | 'yearly'
export type CustomItemRecurrence = `custom:${string}`
export type ItemRecurrence = BuiltInItemRecurrence | CustomItemRecurrence

export type Item = {
  id: string
  userId: string

  title: string
  contentMd?: string

  complexity: ItemComplexity
  status: ItemStatus

  priority?: 1 | 2 | 3 | 4

  dueDate?: string
  dueTime?: string
  recurrence?: ItemRecurrence
  startDate?: string
  scheduledDate?: string
  /** Marca de "Limpar concluídos": oculta o item concluído da pasta sem removê-lo dela (ID 036). */
  clearedAt?: string

  folderId?: string
  /** @deprecated removed; alias for folderId during transition */
  projectId?: string
  areaId?: string
  parentId?: string

  tags: string[]
  backlinks: string[]

  localPath?: string
  syncHash?: string

  googleEventId?: string
  calendarEventId?: string

  /** Ordem manual definida pelo usuário (modo reordenar). Null/undefined = não ordenado, usa updatedAt. */
  order?: number

  createdAt: string
  updatedAt: string
  deletedAt?: string
}

export type CreateItemInput = Pick<Item, 'title' | 'complexity'> &
  Partial<
    Pick<
      Item,
      | 'contentMd'
      | 'status'
      | 'priority'
      | 'dueDate'
      | 'dueTime'
      | 'recurrence'
      | 'startDate'
      | 'scheduledDate'
      | 'folderId'
      | 'projectId'
      | 'areaId'
      | 'parentId'
      | 'tags'
    >
  >

export type UpdateItemInput = Partial<
  Pick<
    Item,
    | 'title'
    | 'contentMd'
    | 'complexity'
    | 'status'
    | 'priority'
    | 'dueDate'
    | 'dueTime'
    | 'recurrence'
    | 'startDate'
    | 'scheduledDate'
    | 'clearedAt'
    | 'folderId'
    | 'projectId'
    | 'areaId'
    | 'parentId'
    | 'tags'
    | 'backlinks'
    | 'order'
  >
>

export type BulkItemTagAction = {
  type: 'add' | 'remove' | 'set'
  tags: string[]
}

export type BulkItemActionInput = {
  ids: string[]
  patch?: UpdateItemInput
  tagAction?: BulkItemTagAction
}
