import { mkdir, writeFile, readFile } from 'fs/promises'
import { join } from 'path'

export const FOLDER_MAP: Record<string, string> = {
  inbox: '00-inbox',
  default: '00-inbox',
}

export async function ensureWorkspace(root: string): Promise<void> {
  const dirs = [
    '00-inbox',
    '10-projetos',
    '20-notas',
    '90-arquivo',
    '_system',
    '_changes',
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
