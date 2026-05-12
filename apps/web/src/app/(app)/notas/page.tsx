'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useFolders, buildFolderTree, createFolder, deleteFolder, updateFolder, type FolderTreeNode } from '@/hooks/use-folders'
import { useItems } from '@/hooks/use-items'
import { useDialog } from '@/components/ui/dialog'

function FolderRow({
  node,
  depth,
  expanded,
  toggle,
  noteCounts,
  index,
  siblingsCount,
  onMove,
  busy,
}: {
  node: FolderTreeNode
  depth: number
  expanded: Set<string>
  toggle: (id: string) => void
  noteCounts: Map<string, number>
  index: number
  siblingsCount: number
  onMove: (parentId: string | null, fromIndex: number, direction: -1 | 1) => Promise<void>
  busy: boolean
}) {
  const hasChildren = node.children.length > 0
  const isOpen = expanded.has(node.id)
  const noteCount = noteCounts.get(node.id) ?? 0
  const { confirm, prompt } = useDialog()
  const canUp = index > 0 && !busy
  const canDown = index < siblingsCount - 1 && !busy

  async function handleRename() {
    const next = await prompt({ title: 'Renomear pasta', message: 'Novo nome', defaultValue: node.name })
    if (!next?.trim() || next === node.name) return
    await updateFolder(node.id, { name: next.trim() })
  }

  async function handleDelete() {
    const ok = await confirm({
      title: 'Apagar pasta',
      message: `Apagar pasta "${node.name}" e todas as subpastas? As notas voltam para a raiz.`,
      confirmLabel: 'Apagar',
      variant: 'danger',
    })
    if (!ok) return
    await deleteFolder(node.id)
  }

  async function handleNewSub() {
    const name = await prompt({ title: 'Nova subpasta', message: 'Nome da subpasta', placeholder: 'Nome' })
    if (!name?.trim()) return
    await createFolder({ name: name.trim(), parentId: node.id })
  }

  return (
    <>
      <div
        className="group flex min-h-14 items-center gap-2 border-b border-ui-border-soft py-2 pr-2 text-[14px] last:border-b-0"
        style={{ paddingLeft: `${10 + depth * 14}px` }}
      >
        <button
          type="button"
          onClick={() => hasChildren && toggle(node.id)}
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-transparent ${
            hasChildren ? 'bg-surface-soft text-navy-500 hover:border-ui-border-soft hover:bg-white' : 'text-transparent'
          }`}
          aria-label={hasChildren ? (isOpen ? 'Recolher' : 'Expandir') : ''}
        >
          {hasChildren ? (
            <svg className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m9 6 6 6-6 6" />
            </svg>
          ) : null}
        </button>
        <Link href={`/notas/${node.id}`} className="flex min-w-0 flex-1 items-center gap-3 text-navy-900 hover:text-brand-600">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-soft text-navy-400">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
            </svg>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium leading-5">{node.name}</span>
            <span className="block font-mono text-[10px] leading-4 text-navy-300">
              {node.children.length > 0 ? `${node.children.length} subpasta${node.children.length === 1 ? '' : 's'}` : 'Pasta'}
            </span>
          </span>
          <span className="flex h-7 min-w-7 shrink-0 items-center justify-center rounded-md bg-surface-soft px-2 font-mono text-[11px] text-navy-400">
            {noteCount}
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => void onMove(node.parentId ?? null, index, -1)}
            disabled={!canUp}
            title="Mover para cima"
            aria-label={`Mover ${node.name} para cima`}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-navy-500 hover:bg-surface-soft disabled:opacity-30"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => void onMove(node.parentId ?? null, index, 1)}
            disabled={!canDown}
            title="Mover para baixo"
            aria-label={`Mover ${node.name} para baixo`}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-navy-500 hover:bg-surface-soft disabled:opacity-30"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12l7 7 7-7" />
            </svg>
          </button>
        </div>
        <div className="flex shrink-0 items-center gap-1 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
          <button
            type="button"
            onClick={handleNewSub}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-navy-500 hover:bg-surface-soft"
            title="Subpasta"
            aria-label={`Criar subpasta em ${node.name}`}
          >
            +
          </button>
          <button
            type="button"
            onClick={handleRename}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-navy-500 hover:bg-surface-soft"
            title="Renomear"
            aria-label={`Renomear ${node.name}`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="m16.9 4.6 2.5 2.5M4 20h4.5L20 8.5a1.8 1.8 0 0 0 0-2.5L18 4a1.8 1.8 0 0 0-2.5 0L4 15.5V20Z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-red-500 hover:bg-red-50"
            title="Apagar"
            aria-label={`Apagar ${node.name}`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 7h14M10 11v6M14 11v6M9 7l1-3h4l1 3M7 7l1 13h8l1-13" />
            </svg>
          </button>
        </div>
      </div>
      {hasChildren && isOpen && node.children.map((child, childIndex) => (
        <FolderRow
          key={child.id}
          node={child}
          depth={depth + 1}
          expanded={expanded}
          toggle={toggle}
          noteCounts={noteCounts}
          index={childIndex}
          siblingsCount={node.children.length}
          onMove={onMove}
          busy={busy}
        />
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
  const { prompt } = useDialog()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [reorderBusy, setReorderBusy] = useState(false)

  const tree = useMemo(() => buildFolderTree(folders), [folders])

  async function handleMove(parentId: string | null, fromIndex: number, direction: -1 | 1) {
    if (reorderBusy) return
    const siblings = folders
      .filter((folder) => (folder.parentId ?? null) === parentId)
      .slice()
      .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, 'pt-BR'))
    const toIndex = fromIndex + direction
    if (fromIndex < 0 || fromIndex >= siblings.length) return
    if (toIndex < 0 || toIndex >= siblings.length) return

    const reordered = siblings.slice()
    const [moved] = reordered.splice(fromIndex, 1)
    if (!moved) return
    reordered.splice(toIndex, 0, moved)

    setReorderBusy(true)
    try {
      await Promise.all(
        reordered.map((folder, index) =>
          folder.order === (index + 1) * 1000
            ? null
            : updateFolder(folder.id, { order: (index + 1) * 1000 }),
        ),
      )
    } finally {
      setReorderBusy(false)
    }
  }
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
    const name = await prompt({ title: 'Nova pasta', message: 'Nome da pasta', placeholder: 'Nome' })
    if (!name?.trim()) return
    await createFolder({ name: name.trim() })
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-3 sm:px-5 lg:pb-4">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-lg font-bold text-navy-900">Notas</h1>
          <p className="font-mono text-[10px] text-navy-300">
            {tree.length} pasta{tree.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
          {allParentIds.length > 0 && (
            <button
              type="button"
              onClick={toggleAll}
              className="h-10 rounded-lg border border-ui-border bg-white px-3 text-xs font-medium text-navy-600 hover:bg-surface-soft"
            >
              {allExpanded ? 'Recolher tudo' : 'Expandir tudo'}
            </button>
          )}
          <button
            type="button"
            onClick={handleNewRoot}
            className={`${allParentIds.length === 0 ? 'col-span-2' : ''} h-10 rounded-lg bg-brand-600 px-3 text-xs font-medium text-white hover:bg-brand-700`}
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
        <div className={`overflow-hidden rounded-xl border border-ui-border bg-white ${reorderBusy ? 'opacity-70' : ''}`}>
          {tree.map((node, index) => (
            <FolderRow
              key={node.id}
              node={node}
              depth={0}
              expanded={expanded}
              toggle={toggle}
              noteCounts={noteCounts}
              index={index}
              siblingsCount={tree.length}
              onMove={handleMove}
              busy={reorderBusy}
            />
          ))}
        </div>
      )}
    </div>
  )
}
