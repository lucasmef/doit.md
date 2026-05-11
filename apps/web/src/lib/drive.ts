import type { drive_v3 } from 'googleapis'
import { GoogleAccountModel } from '@doit/db'
import type { GoogleAccountRow } from './google'

const ROOT_FOLDER_NAME = process.env['DRIVE_ROOT_FOLDER_NAME'] ?? 'doit.md'
const INBOX_FOLDER_NAME = '_inbox'
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
