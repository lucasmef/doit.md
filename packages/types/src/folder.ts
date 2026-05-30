export type Folder = {
  id: string
  userId: string

  name: string
  parentId?: string
  order: number
  viewMode?: 'list' | 'kanban'
  viewModeManual?: boolean
  hideCompleted?: boolean

  createdAt: string
  updatedAt: string
}

export type CreateFolderInput = Pick<Folder, 'name'> &
  Partial<Pick<Folder, 'parentId' | 'order' | 'viewMode' | 'viewModeManual' | 'hideCompleted'>>

export type UpdateFolderInput = Partial<
  Pick<Folder, 'name' | 'parentId' | 'order' | 'viewMode' | 'viewModeManual' | 'hideCompleted'>
>
