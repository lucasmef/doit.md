import type { drive_v3 } from 'googleapis'
import { FolderModel, GoogleAccountModel } from '@doit/db'
import type { GoogleAccountRow } from './google'

type FolderRow = {
  id: string
  userId: string
  name: string
  parentId?: string | null
  driveFolderId?: string | null
}

const ROOT_FOLDER_NAME = process.env['DRIVE_ROOT_FOLDER_NAME'] ?? 'doit.md'
const INBOX_FOLDER_NAME = '_inbox'
const TRASH_FOLDER_NAME = '_trash'
const FOLDER_MIME = 'application/vnd.google-apps.folder'

async function findFolderByName(
  drive: drive_v3.Drive,
  name: string,
  parentId?: string,
): Promise<string | null> {
  const escaped = name.replace(/'/g, "\\'")
  const parentClause = parentId ? ` and '${parentId}' in parents` : ` and 'root' in parents`
  const q = `name = '${escaped}' and mimeType = '${FOLDER_MIME}' and trashed = false${parentClause}`
  const res = await drive.files.list({
    q,
    fields: 'files(id,name)',
    pageSize: 1,
    spaces: 'drive',
  })
  return res.data.files?.[0]?.id ?? null
}

async function createFolder(
  drive: drive_v3.Drive,
  name: string,
  parentId?: string,
): Promise<string> {
  const res = await drive.files.create({
    requestBody: {
      name,
      mimeType: FOLDER_MIME,
      parents: parentId ? [parentId] : undefined,
    },
    fields: 'id',
  })
  const id = res.data.id
  if (!id) throw new Error('Drive create folder returned no id')
  return id
}

export async function getOrCreateRootFolder(
  drive: drive_v3.Drive,
  account: GoogleAccountRow,
): Promise<string> {
  if (account.driveRootFolderId) return account.driveRootFolderId
  const existing = await findFolderByName(drive, ROOT_FOLDER_NAME)
  const id = existing ?? (await createFolder(drive, ROOT_FOLDER_NAME))
  await GoogleAccountModel.findOneAndUpdate(
    { userId: account.userId },
    { $set: { driveRootFolderId: id, updatedAt: new Date().toISOString() } },
  )
  account.driveRootFolderId = id
  return id
}

export async function getOrCreateInboxFolder(
  drive: drive_v3.Drive,
  account: GoogleAccountRow,
): Promise<string> {
  if (account.driveInboxFolderId) return account.driveInboxFolderId
  const rootId = await getOrCreateRootFolder(drive, account)
  const existing = await findFolderByName(drive, INBOX_FOLDER_NAME, rootId)
  const id = existing ?? (await createFolder(drive, INBOX_FOLDER_NAME, rootId))
  await GoogleAccountModel.findOneAndUpdate(
    { userId: account.userId },
    { $set: { driveInboxFolderId: id, updatedAt: new Date().toISOString() } },
  )
  account.driveInboxFolderId = id
  return id
}

/** Pasta `_trash/` sob a raiz — destino de anexos excluídos pelo app. */
export async function getOrCreateTrashFolder(
  drive: drive_v3.Drive,
  account: GoogleAccountRow,
): Promise<string> {
  if (account.driveTrashFolderId) return account.driveTrashFolderId
  const rootId = await getOrCreateRootFolder(drive, account)
  const existing = await findFolderByName(drive, TRASH_FOLDER_NAME, rootId)
  const id = existing ?? (await createFolder(drive, TRASH_FOLDER_NAME, rootId))
  await GoogleAccountModel.findOneAndUpdate(
    { userId: account.userId },
    { $set: { driveTrashFolderId: id, updatedAt: new Date().toISOString() } },
  )
  account.driveTrashFolderId = id
  return id
}

/**
 * Garante que existe a pasta-espelho de um folder do doit.md no Drive,
 * sob `parentDriveId`, e memoiza o `driveFolderId` na linha de `folders`.
 */
async function ensureMirrorFolder(
  drive: drive_v3.Drive,
  userId: string,
  folder: FolderRow,
  parentDriveId: string,
): Promise<string> {
  if (folder.driveFolderId) return folder.driveFolderId
  const existing = await findFolderByName(drive, folder.name, parentDriveId)
  const id = existing ?? (await createFolder(drive, folder.name, parentDriveId))
  await FolderModel.findOneAndUpdate(
    { _id: folder.id, userId },
    { $set: { driveFolderId: id, updatedAt: new Date().toISOString() } },
  )
  folder.driveFolderId = id
  return id
}

/**
 * Resolve a pasta do Drive que espelha `folderId` na árvore de `folders` do
 * doit.md, criando sob demanda toda a cadeia de pastas-espelho ancestrais
 * (mkdir -p). `folderId` ausente → raiz `doit.md/`.
 */
export async function ensureFolderPath(
  drive: drive_v3.Drive,
  account: GoogleAccountRow,
  folderId: string | null | undefined,
): Promise<string> {
  const rootId = await getOrCreateRootFolder(drive, account)
  if (!folderId) return rootId

  // Sobe da folder do item até a raiz da árvore, montando a cadeia ordenada.
  const chain: FolderRow[] = []
  const seen = new Set<string>()
  let current: string | null | undefined = folderId
  while (current && !seen.has(current)) {
    seen.add(current)
    const folder = (await FolderModel.findOne({
      _id: current,
      userId: account.userId,
    }).lean()) as FolderRow | null
    if (!folder) break
    chain.unshift(folder)
    current = folder.parentId ?? null
  }
  if (chain.length === 0) return rootId

  let parentDriveId = rootId
  for (const folder of chain) {
    parentDriveId = await ensureMirrorFolder(drive, account.userId, folder, parentDriveId)
  }
  return parentDriveId
}

export type DriveFileMeta = {
  name: string
  mimeType: string | null
  size: number | null
  webViewLink: string | null
  parents: string[]
}

/** Lê os metadados de um arquivo/pasta do Drive. */
export async function getDriveFileMeta(
  drive: drive_v3.Drive,
  fileId: string,
): Promise<DriveFileMeta> {
  const res = await drive.files.get({
    fileId,
    fields: 'id,name,mimeType,size,webViewLink,parents',
  })
  return {
    name: res.data.name ?? fileId,
    mimeType: res.data.mimeType ?? null,
    size: res.data.size ? Number(res.data.size) : null,
    webViewLink: res.data.webViewLink ?? null,
    parents: res.data.parents ?? [],
  }
}

/**
 * Move um arquivo/pasta do Drive para `newParentId`. Idempotente: se já estiver
 * no destino, não faz nada. Retorna `true` se houve movimento.
 */
export async function moveDriveItem(
  drive: drive_v3.Drive,
  fileId: string,
  newParentId: string,
  knownParents?: string[],
): Promise<boolean> {
  const currentParents =
    knownParents ?? (await drive.files.get({ fileId, fields: 'parents' })).data.parents ?? []
  if (currentParents.length === 1 && currentParents[0] === newParentId) return false
  await drive.files.update({
    fileId,
    addParents: newParentId,
    removeParents: currentParents.join(','),
    fields: 'id',
  })
  return true
}

/** Renomeia um arquivo/pasta do Drive. */
export async function renameDriveItem(
  drive: drive_v3.Drive,
  fileId: string,
  name: string,
): Promise<void> {
  await drive.files.update({ fileId, requestBody: { name }, fields: 'id' })
}
