'use client'

import type { Folder } from '@doit/types'
import { useFolders, createFolder, updateFolder } from './use-folders'

export type ProjectShim = Folder & {
  status: 'active' | 'paused' | 'done' | 'archived'
  description?: string
  color?: string
  areaId?: string
}

function asProject(folder: Folder): ProjectShim {
  return { ...folder, status: 'active' }
}

export function useProjects() {
  const { folders, isLoading, isError } = useFolders()
  return { projects: folders.map(asProject), isLoading, isError }
}

export async function createProject(input: { name: string; description?: string; color?: string; areaId?: string; order?: number }): Promise<ProjectShim> {
  const folder = await createFolder({ name: input.name, order: input.order })
  return asProject(folder)
}

export async function updateProject(id: string, input: { name?: string; status?: string; color?: string; description?: string; areaId?: string; order?: number }): Promise<void> {
  const patch: { name?: string; order?: number } = {}
  if (input.name !== undefined) patch.name = input.name
  if (input.order !== undefined) patch.order = input.order
  if (Object.keys(patch).length > 0) await updateFolder(id, patch)
}
