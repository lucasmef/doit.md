'use client'

import useSWR, { mutate as globalMutate } from 'swr'
import type { Project, CreateProjectInput, UpdateProjectInput } from '@doit/types'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export function useProjects() {
  const { data, error, isLoading } = useSWR<{ projects: Project[] }>('/api/projects', fetcher)
  return { projects: data?.projects ?? [], isLoading, isError: !!error }
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  const res = await fetch('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error('Falha ao criar projeto')
  const { project } = await res.json()
  await globalMutate('/api/projects')
  return project
}

export async function updateProject(id: string, input: UpdateProjectInput): Promise<void> {
  await fetch(`/api/projects/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  await globalMutate('/api/projects')
}
