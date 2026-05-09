'use client'

import { use, useMemo, useState } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { useFolders, buildFolderTree, createFolder, deleteFolder, updateFolder, type FolderTreeNode } from '@/hooks/use-folders'
import { useItems, updateItem } from '@/hooks/use-items'
import type { Folder, Item } from '@doit/types'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

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

function MoveNoteDialog({
  item,
  folders,
  onClose,
}: {
  item: Item
  folders: Folder[]
  onClose: () => void
}) {
  const [target, setTarget] = useState<string>(item.folderId ?? '')

  async function save() {
    await updateItem(item.id, { folderId: target || undefined })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl border border-ui-border bg-white p-4 shadow-cool-lg" onClick={(e) => e.stopPropagation()}>
        <h3 className="mb-3 text-sm font-bold text-navy-900">Mover &ldquo;{item.title}&rdquo;</h3>
        <select
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="mb-4 w-full rounded-md border border-ui-border bg-white px-2 py-2 text-sm text-navy-900 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="">Sem pasta (raiz)</option>
          {folders.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
        <div className="flex justify-end gap-2">
          <button onClick={onClose} className="rounded-md px-3 py-1.5 text-sm text-navy-600 hover:bg-surface-soft">Cancelar</button>
          <button onClick={save} className="rounded-md bg-brand-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-brand-700">Mover</button>
        </div>
      </div>
    </div>
  )
}

export default function FolderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const { data, mutate } = useSWR<{ folder: Folder }>(`/api/folders/${id}`, fetcher)
  const { folders } = useFolders()
  const { items } = useItems({ folderId: id })

  const folder = data?.folder
  const tree = useMemo(() => buildFolderTree(folders), [folders])
  const node = useMemo(() => findNode(tree, id), [tree, id])
  const breadcrumb = useMemo(() => buildBreadcrumb(folders, id), [folders, id])
  const [editingName, setEditingName] = useState(false)
  const [name, setName] = useState('')
  const [moving, setMoving] = useState<Item | null>(null)

  const childFolders = node?.children ?? []
  const notes = items.filter((i) => i.complexity === 'note' && i.status !== 'archived')

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
    if (!window.confirm(`Apagar pasta "${folder?.name}" e todas as subpastas? As notas voltam para a raiz.`)) return
    await deleteFolder(id)
    if (typeof window !== 'undefined') window.location.href = '/notas'
  }

  return (
    <div className="mx-auto max-w-3xl px-5 pb-24 pt-3 lg:pb-4">
      <nav className="mb-2 flex flex-wrap items-center gap-1 text-[12px] text-navy-400">
        <Link href="/notas" className="hover:text-navy-700">Notas</Link>
        {breadcrumb.map((f, idx) => (
          <span key={f.id} className="flex items-center gap-1">
            <span>/</span>
            {idx === breadcrumb.length - 1 ? (
              <span className="text-navy-700">{f.name}</span>
            ) : (
              <Link href={`/notas/${f.id}`} className="hover:text-navy-700">{f.name}</Link>
            )}
          </span>
        ))}
      </nav>

      <div className="mb-4 flex items-center gap-3">
        <svg className="h-6 w-6 shrink-0 text-navy-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
        </svg>
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
            onClick={() => { setName(folder.name); setEditingName(true) }}
          >
            {folder.name}
          </h1>
        )}
        <button onClick={handleNewSub} className="rounded-md border border-ui-border px-2.5 py-1 text-xs text-navy-600 hover:bg-surface-soft">+ Subpasta</button>
        <button onClick={handleDelete} className="rounded-md border border-red-200 px-2.5 py-1 text-xs text-red-500 hover:bg-red-50">Apagar</button>
      </div>

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
                <svg className="h-4 w-4 shrink-0 text-navy-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
                </svg>
                <span className="truncate">{child.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-2 font-mono text-[10px] font-bold uppercase tracking-wide text-navy-300">
          Notas / {notes.length}
        </h2>
        {notes.length === 0 ? (
          <div className="rounded-xl border border-dashed border-ui-border-strong px-4 py-8 text-center text-sm text-navy-300">
            Nenhuma nota nesta pasta.
          </div>
        ) : (
          <div className="rounded-xl border border-ui-border bg-white divide-y divide-ui-border-soft">
            {notes.map((item) => (
              <div key={item.id} className="flex items-center gap-2 px-3 py-2 text-[14px]">
                <span className="flex-1 truncate text-navy-900">{item.title}</span>
                <button
                  type="button"
                  onClick={() => setMoving(item)}
                  className="rounded-md border border-ui-border px-2 py-0.5 text-[11px] text-navy-500 hover:bg-surface-soft"
                >
                  Mover
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {moving && (
        <MoveNoteDialog
          item={moving}
          folders={folders.filter((f) => f.id !== id)}
          onClose={() => setMoving(null)}
        />
      )}
    </div>
  )
}
