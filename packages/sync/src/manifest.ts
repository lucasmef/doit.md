export type ManifestEntry = {
  itemId: string
  localPath: string
  syncHash: string
  updatedAt: string
}

export type Manifest = {
  version: 1
  generatedAt: string
  entries: ManifestEntry[]
}

export function createManifest(entries: ManifestEntry[]): Manifest {
  return {
    version: 1,
    generatedAt: new Date().toISOString(),
    entries,
  }
}
