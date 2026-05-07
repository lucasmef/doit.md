export type ItemComplexity = 'capture' | 'task' | 'note' | 'project' | 'document'

export type ItemStatus = 'inbox' | 'todo' | 'doing' | 'waiting' | 'done' | 'archived'
export type ItemRecurrence = 'daily' | 'weekdays' | 'weekly' | 'monthly' | 'yearly'

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

  projectId?: string
  areaId?: string
  parentId?: string

  tags: string[]
  backlinks: string[]

  localPath?: string
  syncHash?: string

  googleEventId?: string
  calendarEventId?: string

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
    | 'projectId'
    | 'areaId'
    | 'parentId'
    | 'tags'
    | 'backlinks'
  >
>
