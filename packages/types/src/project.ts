// Compatibility shim — the Project entity was removed in favor of Folder.
// These exports re-shape Folder as a Project so legacy UI code keeps building.
import type { Folder } from './folder'

export type ProjectStatus = 'active' | 'paused' | 'done' | 'archived'

export type Project = Folder & {
  status: ProjectStatus
  description?: string
  color?: string
  areaId?: string
}

export type CreateProjectInput = Pick<Project, 'name'> &
  Partial<Pick<Project, 'description' | 'color' | 'areaId' | 'order'>>

export type UpdateProjectInput = Partial<
  Pick<Project, 'name' | 'description' | 'status' | 'color' | 'areaId' | 'order'>
>
