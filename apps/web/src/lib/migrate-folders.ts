import { FolderModel, ItemModel, ProjectModel } from '@doit/db'

type Row = Record<string, unknown>

const MIGRATED_FOLDER_PREFIX = 'fld_p_'

function folderIdFromProject(projectId: string): string {
  return `${MIGRATED_FOLDER_PREFIX}${projectId}`
}

export async function migrateProjectsToFoldersForUser(userId: string): Promise<{ folders: number; items: number }> {
  const projects = (await ProjectModel.find({ userId }).lean()) as Row[]
  if (projects.length === 0) return { folders: 0, items: 0 }

  const existingFolders = (await FolderModel.find({ userId }).lean()) as Row[]
  const existingIds = new Set(existingFolders.map((f) => String(f['_id'])))

  const now = new Date().toISOString()
  let foldersCreated = 0
  for (const project of projects) {
    const projectId = String(project['_id'])
    const folderId = folderIdFromProject(projectId)
    if (existingIds.has(folderId)) continue

    await FolderModel.create({
      _id: folderId,
      userId,
      name: String(project['name'] ?? 'Pasta sem nome'),
      order: typeof project['order'] === 'number' ? project['order'] : 0,
      createdAt: now,
      updatedAt: now,
    })
    foldersCreated += 1
  }

  let itemsMigrated = 0
  for (const project of projects) {
    const projectId = String(project['_id'])
    const folderId = folderIdFromProject(projectId)

    const itemsToMigrate = (await ItemModel.find({ userId, projectId, folderId: null }).lean()) as Row[]
    if (itemsToMigrate.length === 0) continue

    await ItemModel.updateMany(
      { userId, projectId, folderId: null },
      { folderId, updatedAt: now },
    )
    itemsMigrated += itemsToMigrate.length
  }

  return { folders: foldersCreated, items: itemsMigrated }
}
