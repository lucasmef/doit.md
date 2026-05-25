'use client'

import type { Folder } from '@doit/types'
import { buildFolderTree, type FolderTreeNode } from '@/hooks/use-folders'

export type FolderOption = {
  folder: Folder
  depth: number
}

export function FolderGlyph({ className = 'h-3.5 w-3.5' }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.8}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"
      />
    </svg>
  )
}

export function flattenFolderOptions(folders: Folder[]): FolderOption[] {
  const out: FolderOption[] = []

  function visit(nodes: FolderTreeNode[], depth: number) {
    for (const node of nodes) {
      out.push({ folder: node, depth })
      visit(node.children, depth + 1)
    }
  }

  visit(buildFolderTree(folders), 0)
  return out
}

export function FolderOptionContent({ name, depth }: { name: string; depth: number }) {
  return (
    <>
      <span className="flex h-4 w-4 shrink-0 items-center justify-center text-slate-400">
        <FolderGlyph />
      </span>
      <span className="min-w-0 flex-1 truncate" style={{ paddingLeft: depth ? depth * 12 : 0 }}>
        {name}
      </span>
    </>
  )
}
