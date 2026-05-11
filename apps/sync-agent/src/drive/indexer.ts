import { fetchDriveToken, listAllUnder, FOLDER_MIME, type DriveFile } from './client.js'

export type DriveIndexEntry = {
  path: string
  name: string
  mimeType: string
  size: number | null
  md5: string | null
  modifiedTime: string | null
  trashed: boolean
  parents: string[]
  isFolder: boolean
}

export type DriveIndex = {
  version: 1
  rootFolderId: string
  inboxFolderId: string
  updatedAt: string
  files: Record<string, DriveIndexEntry>
}

function buildPaths(
  files: DriveFile[],
  rootFolderId: string,
): Map<string, string> {
  const byId = new Map<string, DriveFile>()
  for (const f of files) byId.set(f.id, f)

  const pathCache = new Map<string, string>()
  pathCache.set(rootFolderId, 'drive')

  const resolve = (id: string, seen: Set<string>): string => {
    const cached = pathCache.get(id)
    if (cached) return cached
    if (seen.has(id)) return 'drive'
    seen.add(id)
    const file = byId.get(id)
    if (!file) return 'drive'
    const parent = file.parents?.[0]
    const parentPath = parent ? resolve(parent, seen) : 'drive'
    const full = `${parentPath}/${file.name}`
    pathCache.set(id, full)
    return full
  }

  for (const f of files) resolve(f.id, new Set())
  return pathCache
}

export async function buildDriveIndex(
  apiUrl: string,
  apiKey: string,
): Promise<DriveIndex> {
  const token = await fetchDriveToken(apiUrl, apiKey)
  const files = await listAllUnder(token.accessToken, token.rootFolderId)
  const paths = buildPaths(files, token.rootFolderId)

  const entries: Record<string, DriveIndexEntry> = {}
  for (const f of files) {
    entries[f.id] = {
      path: paths.get(f.id) ?? `drive/${f.name}`,
      name: f.name,
      mimeType: f.mimeType,
      size: f.size ? Number(f.size) : null,
      md5: f.md5Checksum ?? null,
      modifiedTime: f.modifiedTime ?? null,
      trashed: Boolean(f.trashed),
      parents: f.parents ?? [],
      isFolder: f.mimeType === FOLDER_MIME,
    }
  }

  return {
    version: 1,
    rootFolderId: token.rootFolderId,
    inboxFolderId: token.inboxFolderId,
    updatedAt: new Date().toISOString(),
    files: entries,
  }
}
