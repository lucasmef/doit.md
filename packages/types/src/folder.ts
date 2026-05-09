export type Folder = {
  id: string
  userId: string

  name: string
  parentId?: string
  order: number

  createdAt: string
  updatedAt: string
}

export type CreateFolderInput = Pick<Folder, 'name'> &
  Partial<Pick<Folder, 'parentId' | 'order'>>

export type UpdateFolderInput = Partial<Pick<Folder, 'name' | 'parentId' | 'order'>>
