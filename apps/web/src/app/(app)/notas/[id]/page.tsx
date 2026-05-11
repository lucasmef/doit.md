'use client'

import { Fragment, use, useMemo, useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import {
  DndContext,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
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
import { useDialog } from '@/components/ui/dialog'
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

const FOLDER_DRAG_MIME = 'application/x-folder-id'

function KanbanCard({
  item,
  selected,
  active,
  orderedIds,
}: {
  item: Item
  selected: boolean
  active: boolean
  orderedIds: string[]
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `item:${item.id}`,
    data: { itemId: item.id },
  })

  return (
    <div
      ref={setNodeRef}
      className={`group/card flex items-stretch rounded-md border border-ui-border bg-white ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div
        {...attributes}
        {...listeners}
        title="Arrastar"
        onClick={(e) => e.stopPropagation()}
        className="flex w-3 shrink-0 cursor-grab touch-none items-center justify-center rounded-l-md text-navy-300 opacity-100 transition-opacity active:cursor-grabbing lg:opacity-0 lg:group-hover/card:opacity-100"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
          <path d="M5 3a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm6 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2ZM5 7a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm6 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2ZM5 11a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm6 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z" />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <SharedItemRow item={item} active={active} selected={selected} orderedIds={orderedIds} />
      </div>
    </div>
  )
}

function ColumnInserter({ onAdd, edge }: { onAdd: () => void; edge?: boolean }) {
  return (
    <button
      type="button"
      onClick={onAdd}
      title="Adicionar coluna aqui"
      aria-label="Adicionar coluna aqui"
      className={`group/inserter relative flex shrink-0 cursor-pointer items-center justify-center self-stretch ${edge ? 'w-3' : 'w-4'}`}
    >
      <span className="absolute inset-y-3 left-1/2 w-px -translate-x-1/2 bg-transparent transition-colors group-hover/inserter:bg-brand-300" />
      <span className="relative flex h-7 w-7 items-center justify-center rounded-full border border-brand-300 bg-white text-brand-600 opacity-0 shadow-sm transition-opacity group-hover/inserter:opacity-100">
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14M5 12h14" />
        </svg>
      </span>
    </button>
  )
}

function KanbanDropZone({
  folderId,
  children,
}: {
  folderId: string | null
  children: React.ReactNode
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `col:${folderId ?? 'root'}`,
    data: { folderId },
  })
  return (
    <div
      ref={setNodeRef}
      className={`flex flex-1 flex-col gap-1 px-2 py-2 overflow-y-auto transition-colors ${
        isOver ? 'bg-brand-50' : ''
      }`}
    >
      {children}
    </div>
  )
}

function KanbanColumn({
  title,
  href,
  items,
  childFolders,
  addFolderId,
  folderId,
  selectedItemIds,
  orderedIds,
  dragging,
  columnDragging,
  columnDropTarget,
  onDropItems,
  onColumnDragStart,
  onColumnDragOver,
  onColumnDragLeave,
  onColumnDragEnd,
  onColumnDrop,
}: {
  title: string
  href?: string
  items: Item[]
  childFolders: FolderTreeNode[]
  addFolderId: string | null
  folderId?: string
  selectedItemIds: string[]
  orderedIds: string[]
  dragging: boolean
  columnDragging?: boolean
  columnDropTarget?: boolean
  onDropItems: (folderId: string | null, event: React.DragEvent) => void
  onColumnDragStart?: (folderId: string, event: React.DragEvent) => void
  onColumnDragOver?: (folderId: string, event: React.DragEvent) => void
  onColumnDragLeave?: () => void
  onColumnDragEnd?: () => void
  onColumnDrop?: (folderId: string, event: React.DragEvent) => void
}) {
  const { selectedItemId, setQuickCaptureOpen, setQuickCaptureFolderId } = useUI()

  function handleAdd() {
    setQuickCaptureFolderId(addFolderId)
    setQuickCaptureOpen(true)
  }

  const reorderable = !!folderId && !!onColumnDragStart

  function handleDragOver(event: React.DragEvent) {
    event.preventDefault()
    if (reorderable && folderId && event.dataTransfer.types.includes(FOLDER_DRAG_MIME)) {
      onColumnDragOver?.(folderId, event)
    }
  }

  function handleDrop(event: React.DragEvent) {
    if (reorderable && folderId && event.dataTransfer.types.includes(FOLDER_DRAG_MIME)) {
      event.preventDefault()
      onColumnDrop?.(folderId, event)
      return
    }
    onDropItems(addFolderId, event)
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={onColumnDragLeave}
      onDrop={handleDrop}
      className={`flex w-80 shrink-0 flex-col rounded-xl border bg-surface-soft transition-colors ${
        columnDragging
          ? 'opacity-50 border-brand-400'
          : columnDropTarget
            ? 'border-brand-500 ring-2 ring-brand-200'
            : dragging
              ? 'border-brand-300'
              : 'border-ui-border'
      }`}
    >
      <div
        draggable={reorderable}
        onDragStart={(event) => {
          if (!reorderable || !folderId) return
          event.dataTransfer.effectAllowed = 'move'
          event.dataTransfer.setData(FOLDER_DRAG_MIME, folderId)
          onColumnDragStart?.(folderId, event)
        }}
        onDragEnd={onColumnDragEnd}
        className={`flex items-center justify-between gap-2 px-3 py-2 border-b border-ui-border-soft ${reorderable ? 'cursor-grab active:cursor-grabbing' : ''}`}
      >
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

      <KanbanDropZone folderId={addFolderId}>
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
          <KanbanCard
            key={item.id}
            item={item}
            active={item.id === selectedItemId}
            selected={selectedItemIds.includes(item.id)}
            orderedIds={orderedIds}
          />
        ))}
        {childFolders.length === 0 && items.length === 0 && (
          <p className="px-2 py-3 text-center font-mono text-[11px] text-navy-300">Vazio</p>
        )}
      </KanbanDropZone>

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
  const { confirm, prompt } = useDialog()

  const folder = data?.folder
  const tree = useMemo(() => buildFolderTree(folders), [folders])
  const node = useMemo(() => findNode(tree, id), [tree, id])
  const breadcrumb = useMemo(() => buildBreadcrumb(folders, id), [folders, id])
  const [editingName, setEditingName] = useState(false)
  const [name, setName] = useState('')
  const [draggingIds, setDraggingIds] = useState<string[]>([])
  const [draggingFolderId, setDraggingFolderId] = useState<string | null>(null)
  const [columnDropTargetId, setColumnDropTargetId] = useState<string | null>(null)

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

  function handleDndDragStart(event: DragStartEvent) {
    const activeId = String(event.active.id)
    if (!activeId.startsWith('item:')) return
    const itemId = activeId.slice('item:'.length)
    const ids =
      selectedItemIds.includes(itemId) && selectedItemIds.length > 1 ? selectedItemIds : [itemId]
    if (!selectedItemIds.includes(itemId)) setSingleSelection(itemId)
    setDraggingIds(ids)
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

  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
  )

  async function handleDndDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setDraggingIds([])
    if (!over) return
    const activeId = String(active.id)
    const overId = String(over.id)
    if (!activeId.startsWith('item:') || !overId.startsWith('col:')) return
    const itemId = activeId.slice('item:'.length)
    const folderKey = overId.slice('col:'.length)
    const targetFolderId = folderKey === 'root' ? null : folderKey
    const item = activeItemsById.get(itemId)
    if (!item) return
    if ((item.folderId ?? null) === targetFolderId) return

    const ids =
      selectedItemIds.includes(itemId) && selectedItemIds.length > 1 ? selectedItemIds : [itemId]
    const targets = ids.map((id) => activeItemsById.get(id)).filter(Boolean) as Item[]
    if (targets.length === 0) return
    await bulkUpdateItems(
      { ids: targets.map((t) => t.id), patch: { folderId: (targetFolderId ?? '') as never } },
      targets,
    )
    toast(targets.length === 1 ? 'Item movido' : `${targets.length} itens movidos`, 'success')
  }

  function handleColumnDragStart(fid: string) {
    setDraggingFolderId(fid)
  }

  function handleColumnDragOver(fid: string) {
    if (draggingFolderId && draggingFolderId !== fid) setColumnDropTargetId(fid)
  }

  function handleColumnDragEnd() {
    setDraggingFolderId(null)
    setColumnDropTargetId(null)
  }

  async function handleColumnDrop(targetFolderId: string, event: React.DragEvent) {
    const sourceId = event.dataTransfer.getData(FOLDER_DRAG_MIME) || draggingFolderId
    setDraggingFolderId(null)
    setColumnDropTargetId(null)
    if (!sourceId || sourceId === targetFolderId) return

    const siblings = childFolders
    const sourceIdx = siblings.findIndex((f) => f.id === sourceId)
    const targetIdx = siblings.findIndex((f) => f.id === targetFolderId)
    if (sourceIdx < 0 || targetIdx < 0) return

    const reordered = [...siblings]
    const moved = reordered[sourceIdx]
    if (!moved) return
    reordered.splice(sourceIdx, 1)
    const insertAt = sourceIdx < targetIdx ? targetIdx : targetIdx
    reordered.splice(insertAt, 0, moved)

    const updates: Promise<void>[] = []
    reordered.forEach((f, idx) => {
      const newOrder = (idx + 1) * 1000
      if (f.order !== newOrder) updates.push(updateFolder(f.id, { order: newOrder }))
    })
    await Promise.all(updates)
    toast('Ordem atualizada', 'success')
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
    const subName = await prompt({ title: 'Nova subpasta', message: 'Nome da subpasta', placeholder: 'Nome' })
    if (!subName?.trim()) return
    await createFolder({ name: subName.trim(), parentId: id })
  }

  async function addColumnAt(insertionIdx: number) {
    const colName = await prompt({ title: 'Nova coluna', message: 'Nome da coluna', placeholder: 'Nome' })
    if (!colName?.trim()) return
    const created = await createFolder({ name: colName.trim(), parentId: id, order: 0 })
    const siblings = [...childFolders]
    const newNode = { ...created, children: [] } as FolderTreeNode
    siblings.splice(insertionIdx, 0, newNode)
    await Promise.all(
      siblings.map((f, idx) => {
        const newOrder = (idx + 1) * 1000
        if (f.order === newOrder) return Promise.resolve()
        return updateFolder(f.id, { order: newOrder })
      }),
    )
  }

  async function handleDelete() {
    const ok = await confirm({
      title: 'Apagar pasta',
      message: `Apagar pasta "${folder?.name}" e todas as subpastas? As notas voltam para a raiz.`,
      confirmLabel: 'Apagar',
      variant: 'danger',
    })
    if (!ok) return
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
        <DndContext
          sensors={dndSensors}
          onDragStart={handleDndDragStart}
          onDragCancel={() => setDraggingIds([])}
          onDragEnd={handleDndDragEnd}
        >
        <div className="flex items-stretch gap-0 overflow-x-auto pb-4">
          {childFolders.length === 0 ? (
            <>
              <ColumnInserter edge onAdd={() => void addColumnAt(0)} />
              <KanbanColumn
                title={folder.name}
                items={directOpenItems}
                childFolders={[]}
                addFolderId={id}
                selectedItemIds={selectedItemIds}
                orderedIds={directOpenItems.map((item) => item.id)}
                dragging={draggingIds.length > 0}
                onDropItems={handleDropItems}
              />
              <ColumnInserter edge onAdd={() => void addColumnAt(0)} />
            </>
          ) : (
            <>
              <ColumnInserter edge onAdd={() => void addColumnAt(0)} />
              {directOpenItems.length > 0 && (
                <>
                  <KanbanColumn
                    title="Sem pasta"
                    items={directOpenItems}
                    childFolders={[]}
                    addFolderId={id}
                    selectedItemIds={selectedItemIds}
                    orderedIds={directOpenItems.map((item) => item.id)}
                    dragging={draggingIds.length > 0}
                    onDropItems={handleDropItems}
                  />
                  <ColumnInserter onAdd={() => void addColumnAt(0)} />
                </>
              )}
              {childFolders.map((sub, idx) => (
                <Fragment key={sub.id}>
                  <KanbanColumn
                    title={sub.name}
                    href={`/notas/${sub.id}`}
                    items={itemsByFolder.get(sub.id) ?? []}
                    childFolders={sub.children}
                    addFolderId={sub.id}
                    folderId={sub.id}
                    selectedItemIds={selectedItemIds}
                    orderedIds={(itemsByFolder.get(sub.id) ?? []).map((item) => item.id)}
                    dragging={draggingIds.length > 0}
                    columnDragging={draggingFolderId === sub.id}
                    columnDropTarget={columnDropTargetId === sub.id}
                    onDropItems={handleDropItems}
                    onColumnDragStart={handleColumnDragStart}
                    onColumnDragOver={handleColumnDragOver}
                    onColumnDragLeave={() => setColumnDropTargetId(null)}
                    onColumnDragEnd={handleColumnDragEnd}
                    onColumnDrop={handleColumnDrop}
                  />
                  <ColumnInserter
                    edge={idx === childFolders.length - 1}
                    onAdd={() => void addColumnAt(idx + 1)}
                  />
                </Fragment>
              ))}
            </>
          )}
        </div>
        </DndContext>
      )}
    </div>
  )
}
