export type ProjectStatus = 'active' | 'paused' | 'done' | 'archived'

export type Project = {
  id: string
  userId: string

  name: string
  description?: string

  status: ProjectStatus

  areaId?: string
  color?: string
  order: number

  createdAt: string
  updatedAt: string
}

export type CreateProjectInput = Pick<Project, 'name'> &
  Partial<Pick<Project, 'description' | 'areaId' | 'color' | 'order'>>

export type UpdateProjectInput = Partial<
  Pick<Project, 'name' | 'description' | 'status' | 'areaId' | 'color' | 'order'>
>
