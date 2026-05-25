export type ManifestEntry = {
  itemId: string
  localPath: string
  syncHash: string
  updatedAt: string
  contentHash?: string
  frontmatter?: Record<string, unknown>
  contentMd?: string
}

export type FolderManifestEntry = {
  folderId: string
  localPath: string
  name: string
  parentId?: string
  updatedAt: string
}

export type Manifest = {
  version: 1
  generatedAt: string
  entries: ManifestEntry[]
  folders?: FolderManifestEntry[]
}

export function createManifest(entries: ManifestEntry[]): Manifest {
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    entries,
  }
}
