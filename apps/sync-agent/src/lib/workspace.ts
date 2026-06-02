import { mkdir, writeFile, readFile } from 'fs/promises'
import { join } from 'path'

export { slugify } from '@doit/core'

export const SPECIAL_DIRS = {
  inbox: 'inbox',
  upcoming: 'proximos',
  archive: 'arquivo',
} as const

export const SYSTEM_ROOT = '.doit-sync' as const
export const SYSTEM_DIRS = [SYSTEM_ROOT, '.git', 'node_modules'] as const

export function systemPath(root: string, ...parts: string[]): string {
  return join(root, SYSTEM_ROOT, ...parts)
}

export function systemStatePath(root: string, ...parts: string[]): string {
  return systemPath(root, 'system', ...parts)
}

export function changesPath(root: string, ...parts: string[]): string {
  return systemPath(root, 'changes', ...parts)
}

export function rawArchivePath(root: string, ...parts: string[]): string {
  return systemPath(root, 'raw-archive', ...parts)
}

export async function ensureWorkspace(root: string): Promise<void> {
  const dirs = [
    join(root, SPECIAL_DIRS.inbox),
    join(root, SPECIAL_DIRS.upcoming),
    join(root, SPECIAL_DIRS.archive),
    systemPath(root, 'system'),
    systemPath(root, 'changes'),
    systemPath(root, 'raw-archive'),
  ]

  for (const dir of dirs) {
    await mkdir(dir, { recursive: true })
  }
}

export async function writeJson(path: string, data: unknown): Promise<void> {
  await writeFile(path, JSON.stringify(data, null, 2), 'utf-8')
}

export async function readJson<T>(path: string): Promise<T | null> {
  try {
    const raw = await readFile(path, 'utf-8')
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}
