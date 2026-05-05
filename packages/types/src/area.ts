export type Area = {
  id: string
  userId: string

  name: string
  description?: string
  color?: string
  order: number

  createdAt: string
  updatedAt: string
}

export type CreateAreaInput = Pick<Area, 'name'> &
  Partial<Pick<Area, 'description' | 'color' | 'order'>>

export type UpdateAreaInput = Partial<Pick<Area, 'name' | 'description' | 'color' | 'order'>>
