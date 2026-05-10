import { mkdir, writeFile, readFile } from 'fs/promises'
import { join } from 'path'

export { slugify } from '@doit/core'

export const SPECIAL_DIRS = {
  inbox: 'Inbox',
  upcoming: 'Proximos',
  archive: 'Arquivo',
} as const

export const SYSTEM_DIRS = ['_system', '_changes'] as const

export async function ensureWorkspace(root: string): Promise<void> {
  const dirs = [
    SPECIAL_DIRS.inbox,
    SPECIAL_DIRS.upcoming,
    SPECIAL_DIRS.archive,
    ...SYSTEM_DIRS,
  ]

  for (const dir of dirs) {
    await mkdir(join(root, dir), { recursive: true })
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
