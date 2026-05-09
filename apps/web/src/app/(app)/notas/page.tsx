'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useFolders, buildFolderTree, createFolder, deleteFolder, updateFolder, type FolderTreeNode } from '@/hooks/use-folders'
import { useItems } from '@/hooks/use-items'

function FolderRow({
  node,
  depth,
  expanded,
  toggle,
  noteCounts,
}: {
  node: FolderTreeNode
  depth: number
  expanded: Set<string>
  toggle: (id: string) => void
  noteCounts: Map<string, number>
}) {
  const hasChildren = node.children.length > 0
  const isOpen = expanded.has(node.id)
  const noteCount = noteCounts.get(node.id) ?? 0

  async function handleRename() {
    const next = window.prompt('Renomear pasta', node.name)
    if (!next?.trim() || next === node.name) return
    await updateFolder(node.id, { name: next.trim() })
  }

  async function handleDelete() {
    if (!window.confirm(`Apagar pasta "${node.name}" e todas as subpastas? As notas voltam para a raiz.`)) return
    await deleteFolder(node.id)
  }

  async function handleNewSub() {
    const name = window.prompt('Nome da subpasta')
    if (!name?.trim()) return
    await createFolder({ name: name.trim(), parentId: node.id })
  }

  return (
    <>
      <div
        className="group flex items-center gap-1 border-b border-ui-border-soft py-1.5 text-[14px]"
        style={{ paddingLeft: `${12 + depth * 18}px` }}
      >
        <button
          type="button"
          onClick={() => hasChildren && toggle(node.id)}
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded ${hasChildren ? 'hover:bg-navy-50' : ''}`}
          aria-label={hasChildren ? (isOpen ? 'Recolher' : 'Expandir') : ''}
        >
          {hasChildren ? (
            <svg className={`h-3 w-3 text-navy-400 transition-transform ${isOpen ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m9 6 6 6-6 6" />
            </svg>
          ) : null}
        </button>
        <Link href={`/notas/${node.id}`} className="flex min-w-0 flex-1 items-center gap-2 text-navy-900 hover:text-brand-600">
          <svg className="h-4 w-4 shrink-0 text-navy-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
          </svg>
          <span className="truncate">{node.name}</span>
          {noteCount > 0 && (
            <span className="font-mono text-[11px] text-navy-300">{noteCount}</span>
          )}
        </Link>
        <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button onClick={handleNewSub} className="rounded px-2 py-0.5 text-[11px] text-navy-500 hover:bg-surface-soft" title="Subpasta">+ sub</button>
          <button onClick={handleRename} className="rounded px-2 py-0.5 text-[11px] text-navy-500 hover:bg-surface-soft">Renomear</button>
          <button onClick={handleDelete} className="rounded px-2 py-0.5 text-[11px] text-red-500 hover:bg-red-50">Apagar</button>
        </div>
      </div>
      {hasChildren && isOpen && node.children.map((child) => (
        <FolderRow key={child.id} node={child} depth={depth + 1} expanded={expanded} toggle={toggle} noteCounts={noteCounts} />
      ))}
    </>
  )
}

function collectIds(nodes: FolderTreeNode[], acc: string[] = []) {
  for (const node of nodes) {
    if (node.children.length > 0) {
      acc.push(node.id)
      collectIds(node.children, acc)
    }
  }
  return acc
}

export default function NotasPage() {
  const { folders, isLoading } = useFolders()
  const { items } = useItems()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const tree = useMemo(() => buildFolderTree(folders), [folders])
  const allParentIds = useMemo(() => collectIds(tree), [tree])
  const allExpanded = allParentIds.length > 0 && allParentIds.every((id) => expanded.has(id))

  const noteCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const item of items) {
      if (item.status === 'archived' || item.status === 'done') continue
      if (!item.folderId) continue
      counts.set(item.folderId, (counts.get(item.folderId) ?? 0) + 1)
    }
    return counts
  }, [items])

  function toggle(id: string) {
    setExpanded((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    setExpanded(allExpanded ? new Set() : new Set(allParentIds))
  }

  async function handleNewRoot() {
    const name = window.prompt('Nome da pasta')
    if (!name?.trim()) return
    await createFolder({ name: name.trim() })
  }

  return (
    <div className="mx-auto max-w-3xl px-5 pb-24 pt-3 lg:pb-4">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-lg font-bold text-navy-900">Notas</h1>
        <div className="flex items-center gap-2">
          {allParentIds.length > 0 && (
            <button
              type="button"
              onClick={toggleAll}
              className="rounded-md border border-ui-border px-2.5 py-1 text-xs text-navy-600 hover:bg-surface-soft"
            >
              {allExpanded ? 'Recolher tudo' : 'Expandir tudo'}
            </button>
          )}
          <button
            type="button"
            onClick={handleNewRoot}
            className="rounded-md bg-brand-600 px-3 py-1 text-xs font-medium text-white hover:bg-brand-700"
          >
            + Nova pasta
          </button>
        </div>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-10 animate-pulse rounded bg-slate-100" />
          ))}
        </div>
      )}

      {!isLoading && tree.length === 0 && (
        <div className="rounded-xl border border-dashed border-ui-border-strong px-4 py-12 text-center text-sm text-navy-300">
          Nenhuma pasta criada. Crie a primeira para organizar suas notas.
        </div>
      )}

      {tree.length > 0 && (
        <div className="rounded-xl border border-ui-border bg-white">
          {tree.map((node) => (
            <FolderRow key={node.id} node={node} depth={0} expanded={expanded} toggle={toggle} noteCounts={noteCounts} />
          ))}
        </div>
      )}
    </div>
  )
}
