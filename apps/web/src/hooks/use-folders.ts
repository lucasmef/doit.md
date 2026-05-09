'use client'

import useSWR, { mutate as globalMutate } from 'swr'
import type { Folder, CreateFolderInput, UpdateFolderInput } from '@doit/types'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

async function readError(res: Response, fallback: string) {
  try {
    const data = (await res.json()) as { error?: string }
    return data.error ?? fallback
  } catch {
    return fallback
  }
}

export function useFolders() {
  const { data, error, isLoading } = useSWR<{ folders: Folder[] }>('/api/folders', fetcher)
  return {
    folders: Array.isArray(data?.folders) ? data.folders : [],
    isLoading,
    isError: !!error,
  }
}

export async function createFolder(input: CreateFolderInput): Promise<Folder> {
  const res = await fetch('/api/folders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error(await readError(res, 'Falha ao criar pasta'))
  const { folder } = await res.json()
  await globalMutate('/api/folders')
  return folder
}

export async function updateFolder(id: string, input: UpdateFolderInput): Promise<void> {
  const res = await fetch(`/api/folders/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
  if (!res.ok) throw new Error(await readError(res, 'Falha ao atualizar pasta'))
  await globalMutate('/api/folders')
}

export async function deleteFolder(id: string): Promise<void> {
  const res = await fetch(`/api/folders/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(await readError(res, 'Falha ao apagar pasta'))
  await globalMutate('/api/folders')
}

export type FolderTreeNode = Folder & { children: FolderTreeNode[] }

export function buildFolderTree(folders: Folder[]): FolderTreeNode[] {
  const map = new Map<string, FolderTreeNode>()
  for (const folder of folders) map.set(folder.id, { ...folder, children: [] })
  const roots: FolderTreeNode[] = []
  for (const folder of folders) {
    const node = map.get(folder.id)!
    if (folder.parentId && map.has(folder.parentId)) {
      map.get(folder.parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  }
  const sortNodes = (nodes: FolderTreeNode[]) => {
    nodes.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'pt-BR'))
    for (const node of nodes) sortNodes(node.children)
  }
  sortNodes(roots)
  return roots
}
