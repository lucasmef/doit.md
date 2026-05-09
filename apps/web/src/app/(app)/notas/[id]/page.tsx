'use client'

import { use, useMemo, useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import {
  useFolders,
  buildFolderTree,
  createFolder,
  deleteFolder,
  updateFolder,
  type FolderTreeNode,
} from '@/hooks/use-folders'
import { bulkUpdateItems, useItems } from '@/hooks/use-items'
import { ItemList } from '@/components/items/item-list'
import { ItemRow as SharedItemRow } from '@/components/items/item-row'
import { useUI } from '@/store/ui'
import { useToast } from '@/components/ui/toast'
import type { Folder, Item } from '@doit/types'

const fetcher = (url: string) => fetch(url).then((r) => r.json())
type ViewMode = 'list' | 'kanban'

function findNode(nodes: FolderTreeNode[], id: string): FolderTreeNode | null {
  for (const node of nodes) {
    if (node.id === id) return node
    const child = findNode(node.children, id)
    if (child) return child
  }
  return null
}

function buildBreadcrumb(folders: Folder[], id: string): Folder[] {
  const map = new Map(folders.map((f) => [f.id, f]))
  const path: Folder[] = []
  let current = map.get(id)
  while (current) {
    path.unshift(current)
    current = current.parentId ? map.get(current.parentId) : undefined
  }
  return path
}

function FolderIcon({ className = 'h-4 w-4' }: { className?: string }) {
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

function KanbanColumn({
  title,
  href,
  items,
  childFolders,
  addFolderId,
  selectedItemIds,
  orderedIds,
  dragging,
  onDragStart,
  onDragEnd,
  onDropItems,
}: {
  title: string
  href?: string
  items: Item[]
  childFolders: FolderTreeNode[]
  addFolderId: string | null
  selectedItemIds: string[]
  orderedIds: string[]
  dragging: boolean
  onDragStart: (item: Item, event: React.DragEvent) => void
  onDragEnd: () => void
  onDropItems: (folderId: string | null, event: React.DragEvent) => void
}) {
  const { selectedItemId, setQuickCaptureOpen, setQuickCaptureFolderId } = useUI()

  function handleAdd() {
    setQuickCaptureFolderId(addFolderId)
    setQuickCaptureOpen(true)
  }

  return (
    <div
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => onDropItems(addFolderId, event)}
      className={`flex w-80 shrink-0 flex-col rounded-xl border bg-surface-soft transition-colors ${
        dragging ? 'border-brand-300' : 'border-ui-border'
      }`}
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-ui-border-soft">
        {href ? (
          <Link
            href={href}
            className="flex min-w-0 flex-1 items-center gap-2 text-[13px] font-bold text-navy-900 hover:text-brand-600"
          >
            <FolderIcon className="h-4 w-4 shrink-0 text-navy-400" />
            <span className="truncate">{title}</span>
          </Link>
        ) : (
          <span className="flex min-w-0 flex-1 items-center gap-2 text-[13px] font-bold text-navy-900">
            <span className="truncate">{title}</span>
          </span>
        )}
        <span className="font-mono text-[10px] text-navy-300">
          {childFolders.length + items.length}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-1 px-2 py-2 overflow-y-auto">
        {childFolders.map((sub) => (
          <Link
            key={sub.id}
            href={`/notas/${sub.id}`}
            className="group flex items-center gap-2 rounded-md border border-ui-border bg-white px-2 py-1.5 text-[13px] text-navy-900 hover:border-brand-300 hover:bg-brand-50"
          >
            <FolderIcon className="h-4 w-4 shrink-0 text-navy-400" />
            <span className="flex-1 truncate font-medium">{sub.name}</span>
            {sub.children.length > 0 && (
              <span className="font-mono text-[10px] text-navy-300">{sub.children.length}</span>
            )}
          </Link>
        ))}
        {items.map((item) => (
          <div
            key={item.id}
            draggable
            onDragStart={(event) => onDragStart(item, event)}
            onDragEnd={onDragEnd}
            className="rounded-md border border-ui-border bg-white"
          >
            <SharedItemRow
              item={item}
              active={item.id === selectedItemId}
              selected={selectedItemIds.includes(item.id)}
              orderedIds={orderedIds}
            />
          </div>
        ))}
        {childFolders.length === 0 && items.length === 0 && (
          <p className="px-2 py-3 text-center font-mono text-[11px] text-navy-300">Vazio</p>
        )}
      </div>

      <button
        type="button"
        onClick={handleAdd}
        className="flex items-center gap-1.5 border-t border-ui-border-soft px-3 py-2 text-left text-[12px] text-navy-400 hover:bg-white hover:text-brand-600"
      >
        <svg
          className="h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
        </svg>
        Adicionar
      </button>
    </div>
  )
}

export default function FolderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data, mutate } = useSWR<{ folder: Folder }>(`/api/folders/${id}`, fetcher)
  const { folders } = useFolders()
  const { items: directItems } = useItems({ folderId: id })
  const { items: allItems } = useItems()
  const { selectedItemIds, setSingleSelection } = useUI()
  const { toast } = useToast()

  const folder = data?.folder
  const tree = useMemo(() => buildFolderTree(folders), [folders])
  const node = useMemo(() => findNode(tree, id), [tree, id])
  const breadcrumb = useMemo(() => buildBreadcrumb(folders, id), [folders, id])
  const [editingName, setEditingName] = useState(false)
  const [name, setName] = useState('')
  const [draggingIds, setDraggingIds] = useState<string[]>([])

  async function changeView(mode: ViewMode) {
    await updateFolder(id, { viewMode: mode, viewModeManual: true })
    await mutate()
  }

  const childFolders = node?.children ?? []
  const directOpenItems = directItems.filter((i) => i.status !== 'archived' && i.status !== 'done')
  const viewMode: ViewMode = folder?.viewMode === 'kanban' ? 'kanban' : 'list'

  const itemsByFolder = useMemo(() => {
    const map = new Map<string, Item[]>()
    for (const item of allItems) {
      if (item.status === 'archived' || item.status === 'done') continue
      if (!item.folderId) continue
      const list = map.get(item.folderId) ?? []
      list.push(item)
      map.set(item.folderId, list)
    }
    return map
  }, [allItems])

  const activeItemsById = useMemo(() => {
    const map = new Map<string, Item>()
    for (const item of allItems) {
      if (item.status !== 'archived') map.set(item.id, item)
    }
    return map
  }, [allItems])

  function handleDragStart(item: Item, event: React.DragEvent) {
    const ids =
      selectedItemIds.includes(item.id) && selectedItemIds.length > 1 ? selectedItemIds : [item.id]
    if (!selectedItemIds.includes(item.id)) setSingleSelection(item.id)
    setDraggingIds(ids)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', ids.join(','))
  }

  async function handleDropItems(folderId: string | null, event: React.DragEvent) {
    event.preventDefault()
    const ids = (event.dataTransfer.getData('text/plain') || draggingIds.join(','))
      .split(',')
      .map((itemId) => itemId.trim())
      .filter(Boolean)
    setDraggingIds([])
    const targets = ids.map((itemId) => activeItemsById.get(itemId)).filter(Boolean) as Item[]
    if (targets.length === 0) return
    await bulkUpdateItems(
      { ids: targets.map((item) => item.id), patch: { folderId: (folderId ?? '') as never } },
      targets,
    )
    toast(targets.length === 1 ? 'Item movido' : `${targets.length} itens movidos`, 'success')
  }

  if (!folder) {
    return (
      <div className="mx-auto max-w-3xl px-5 pt-3">
        <div className="h-8 w-48 animate-pulse rounded bg-slate-100" />
      </div>
    )
  }

  async function saveName() {
    if (!name.trim() || name === folder?.name) {
      setEditingName(false)
      return
    }
    await updateFolder(id, { name: name.trim() })
    await mutate()
    setEditingName(false)
  }

  async function handleNewSub() {
    const subName = window.prompt('Nome da subpasta')
    if (!subName?.trim()) return
    await createFolder({ name: subName.trim(), parentId: id })
  }

  async function handleDelete() {
    if (
      !window.confirm(
        `Apagar pasta "${folder?.name}" e todas as subpastas? As notas voltam para a raiz.`,
      )
    )
      return
    await deleteFolder(id)
    if (typeof window !== 'undefined') window.location.href = '/notas'
  }

  return (
    <div
      className={`${viewMode === 'kanban' ? 'w-full px-4' : 'mx-auto max-w-3xl px-5'} pb-24 pt-3 lg:pb-4`}
    >
      <nav className="mb-2 flex flex-wrap items-center gap-1 text-[12px] text-navy-400">
        <Link href="/notas" className="hover:text-navy-700">
          Notas
        </Link>
        {breadcrumb.map((f, idx) => (
          <span key={f.id} className="flex items-center gap-1">
            <span>/</span>
            {idx === breadcrumb.length - 1 ? (
              <span className="text-navy-700">{f.name}</span>
            ) : (
              <Link href={`/notas/${f.id}`} className="hover:text-navy-700">
                {f.name}
              </Link>
            )}
          </span>
        ))}
      </nav>

      <div className="mb-4 flex items-center gap-3">
        <FolderIcon className="h-6 w-6 shrink-0 text-navy-400" />
        {editingName ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={saveName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveName()
              if (e.key === 'Escape') setEditingName(false)
            }}
            className="flex-1 border-none bg-transparent text-2xl font-semibold text-navy-900 outline-none"
          />
        ) : (
          <h1
            className="flex-1 cursor-pointer text-2xl font-semibold text-navy-900 hover:text-brand-700"
            onClick={() => {
              setName(folder.name)
              setEditingName(true)
            }}
          >
            {folder.name}
          </h1>
        )}
        <div className="flex rounded-md border border-ui-border bg-white p-0.5">
          <button
            type="button"
            onClick={() => void changeView('list')}
            className={`rounded px-2 py-1 text-xs font-medium transition-colors ${viewMode === 'list' ? 'bg-brand-100 text-brand-700' : 'text-navy-500 hover:text-navy-900'}`}
          >
            Lista
          </button>
          <button
            type="button"
            onClick={() => void changeView('kanban')}
            className={`rounded px-2 py-1 text-xs font-medium transition-colors ${viewMode === 'kanban' ? 'bg-brand-100 text-brand-700' : 'text-navy-500 hover:text-navy-900'}`}
          >
            Kanban
          </button>
        </div>
        <button
          onClick={handleNewSub}
          className="rounded-md border border-ui-border px-2.5 py-1 text-xs text-navy-600 hover:bg-surface-soft"
        >
          + Subpasta
        </button>
        <button
          onClick={handleDelete}
          className="rounded-md border border-red-200 px-2.5 py-1 text-xs text-red-500 hover:bg-red-50"
        >
          Apagar
        </button>
      </div>

      {viewMode === 'list' ? (
        <>
          {childFolders.length > 0 && (
            <section className="mb-6">
              <h2 className="mb-2 font-mono text-[10px] font-bold uppercase tracking-wide text-navy-300">
                Subpastas / {childFolders.length}
              </h2>
              <div className="rounded-xl border border-ui-border bg-white divide-y divide-ui-border-soft">
                {childFolders.map((child) => (
                  <Link
                    key={child.id}
                    href={`/notas/${child.id}`}
                    className="flex items-center gap-2 px-3 py-2 text-[14px] text-navy-900 hover:bg-surface-soft"
                  >
                    <FolderIcon className="h-4 w-4 shrink-0 text-navy-400" />
                    <span className="truncate">{child.name}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <section>
            <h2 className="mb-2 font-mono text-[10px] font-bold uppercase tracking-wide text-navy-300">
              Itens / {directOpenItems.length}
            </h2>
            {directOpenItems.length === 0 ? (
              <div className="rounded-xl border border-dashed border-ui-border-strong px-4 py-8 text-center text-sm text-navy-300">
                Nenhum item nesta pasta.
              </div>
            ) : (
              <div className="rounded-xl border border-ui-border bg-white px-2 pb-2">
                <ItemList items={directOpenItems} />
              </div>
            )}
          </section>
        </>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-4">
          {childFolders.length === 0 ? (
            <KanbanColumn
              title={folder.name}
              items={directOpenItems}
              childFolders={[]}
              addFolderId={id}
              selectedItemIds={selectedItemIds}
              orderedIds={directOpenItems.map((item) => item.id)}
              dragging={draggingIds.length > 0}
              onDragStart={handleDragStart}
              onDragEnd={() => setDraggingIds([])}
              onDropItems={handleDropItems}
            />
          ) : (
            childFolders.map((sub) => (
              <KanbanColumn
                key={sub.id}
                title={sub.name}
                href={`/notas/${sub.id}`}
                items={itemsByFolder.get(sub.id) ?? []}
                childFolders={sub.children}
                addFolderId={sub.id}
                selectedItemIds={selectedItemIds}
                orderedIds={(itemsByFolder.get(sub.id) ?? []).map((item) => item.id)}
                dragging={draggingIds.length > 0}
                onDragStart={handleDragStart}
                onDragEnd={() => setDraggingIds([])}
                onDropItems={handleDropItems}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}
