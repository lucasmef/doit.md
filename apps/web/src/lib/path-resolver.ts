import { slugify } from '@doit/core'
import type { Folder } from '@doit/types'

const SPECIAL = {
  Inbox: 'inbox',
  Proximos: 'upcoming',
  Arquivo: 'archive',
} as const

export type SpecialDir = (typeof SPECIAL)[keyof typeof SPECIAL]

export type ResolvedPath = {
  folderId: string | null
  special: SpecialDir | null
}

type FolderNode = Folder & { children: FolderNode[]; slug: string }

function buildTree(folders: Folder[]): FolderNode[] {
  const map = new Map<string, FolderNode>()
  for (const folder of folders) {
    map.set(folder.id, { ...folder, children: [], slug: '' })
  }
  const roots: FolderNode[] = []
  for (const folder of folders) {
    const node = map.get(folder.id)!
    if (folder.parentId && map.has(folder.parentId)) {
      map.get(folder.parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  const usedNames = new Map<string, Set<string>>()
  function assignSlugs(nodes: FolderNode[], parentKey: string) {
    nodes.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'pt-BR'))
    const siblings = usedNames.get(parentKey) ?? new Set<string>()
    usedNames.set(parentKey, siblings)
    for (const node of nodes) {
      let candidate = slugify(node.name, 'pasta')
      let attempt = candidate
      let counter = 2
      while (siblings.has(attempt)) {
        attempt = `${candidate}-${counter++}`
      }
      siblings.add(attempt)
      node.slug = attempt
      assignSlugs(node.children, `${parentKey}/${attempt}`)
    }
  }
  assignSlugs(roots, '')

  return roots
}

/**
 * Given the folder tree from DB and a relative path like
 * `Trabalho/Cliente A/proposta.md`, returns `{ folderId, special }`.
 *
 * - If path starts with `Inbox/`, `Proximos/` or `Arquivo/`, returns the
 *   matching `special` and `folderId: null`.
 * - Otherwise walks segments matching against slugified folder names. The
 *   filename (last segment) is ignored.
 */
export function resolveFolderFromPath(folders: Folder[], relativePath: string): ResolvedPath {
  const segments = relativePath.split('/').filter(Boolean)
  if (segments.length === 0) return { folderId: null, special: null }

  const first = segments[0] as keyof typeof SPECIAL
  if (first in SPECIAL) {
    return { folderId: null, special: SPECIAL[first] }
  }

  const tree = buildTree(folders)
  const dirSegments = segments.slice(0, -1) // drop filename
  if (dirSegments.length === 0) return { folderId: null, special: null }

  let currentLevel = tree
  let matched: FolderNode | null = null
  for (const segment of dirSegments) {
    const node = currentLevel.find((n) => n.slug === segment)
    if (!node) return { folderId: null, special: null }
    matched = node
    currentLevel = node.children
  }

  return { folderId: matched?.id ?? null, special: null }
}
