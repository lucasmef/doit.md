import { readdir, readFile, stat } from 'fs/promises'
import type { Dirent } from 'fs'
import { join, relative } from 'path'
import type { DriveIndex } from './indexer.js'

export type DriveReconcileReport = {
  linked: Array<{ fileId: string; path: string; markdowns: string[] }>
  broken: Array<{ fileId: string; reason: 'missing' | 'trashed'; markdowns: string[] }>
  orphans: Array<{ fileId: string; path: string }>
  inboxPending: Array<{ fileId: string; name: string; path: string; mimeType: string }>
}

const FILE_ID_REGEX = /drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/g
const TRASH_PATH_PREFIX = 'drive/_trash'

/** Arquivos na `_trash/` foram excluídos pelo app — não são órfãos nem inbox. */
function isInTrash(path: string): boolean {
  return path === TRASH_PATH_PREFIX || path.startsWith(`${TRASH_PATH_PREFIX}/`)
}

async function walkMarkdowns(root: string, skipDirs: Set<string>): Promise<string[]> {
  const out: string[] = []
  async function walk(dir: string) {
    let entries: Dirent[]
    try {
      entries = (await readdir(dir, { withFileTypes: true })) as Dirent[]
    } catch {
      return
    }
    for (const entry of entries) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        if (skipDirs.has(entry.name)) continue
        await walk(full)
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        out.push(full)
      }
    }
  }
  await walk(root)
  return out
}

export async function reconcileDrive(
  workspaceRoot: string,
  index: DriveIndex,
): Promise<DriveReconcileReport> {
  const skipDirs = new Set(['_system', '_changes', 'node_modules', '.git', 'drive'])
  const files = await walkMarkdowns(workspaceRoot, skipDirs)

  const refs = new Map<string, string[]>()
  for (const filePath of files) {
    try {
      const content = await readFile(filePath, 'utf-8')
      const matches = content.matchAll(FILE_ID_REGEX)
      const rel = relative(workspaceRoot, filePath).replace(/\\/g, '/')
      for (const m of matches) {
        const id = m[1]
        if (!id) continue
        const list = refs.get(id) ?? []
        list.push(rel)
        refs.set(id, list)
      }
    } catch {
      // ignore unreadable files
    }
  }

  const linked: DriveReconcileReport['linked'] = []
  const broken: DriveReconcileReport['broken'] = []
  for (const [fileId, markdowns] of refs) {
    const entry = index.files[fileId]
    if (!entry) {
      broken.push({ fileId, reason: 'missing', markdowns })
      continue
    }
    if (entry.trashed) {
      broken.push({ fileId, reason: 'trashed', markdowns })
      continue
    }
    linked.push({ fileId, path: entry.path, markdowns })
  }

  const orphans: DriveReconcileReport['orphans'] = []
  const inboxPending: DriveReconcileReport['inboxPending'] = []
  const inboxPathPrefix = inboxPathPrefixFor(index)
  for (const [fileId, entry] of Object.entries(index.files)) {
    if (entry.isFolder || entry.trashed) continue
    if (isInTrash(entry.path)) continue
    if (refs.has(fileId)) continue
    if (inboxPathPrefix && entry.path.startsWith(inboxPathPrefix)) {
      inboxPending.push({
        fileId,
        name: entry.name,
        path: entry.path,
        mimeType: entry.mimeType,
      })
    } else {
      orphans.push({ fileId, path: entry.path })
    }
  }

  return { linked, broken, orphans, inboxPending }
}

function inboxPathPrefixFor(index: DriveIndex): string | null {
  const inbox = index.files[index.inboxFolderId]
  if (!inbox) return null
  return `${inbox.path}/`
}

export async function workspaceExists(path: string): Promise<boolean> {
  try {
    const s = await stat(path)
    return s.isDirectory()
  } catch {
    return false
  }
}
