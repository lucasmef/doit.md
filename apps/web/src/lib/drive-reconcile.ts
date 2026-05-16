import type { drive_v3 } from 'googleapis'
import { DriveLinkModel, FolderModel, GoogleAccountModel, ItemModel } from '@doit/db'
import { newDriveLinkId } from '@doit/core'
import { getDriveClient, hasDriveScope, type GoogleAccountRow } from './google'
import {
  ensureFolderPath,
  getDriveFileMeta,
  moveDriveItem,
  renameDriveItem,
} from './drive'

/**
 * Reconciliação do espelho de pastas do Drive: mantém a organização dos anexos
 * coerente com a árvore de `folders` do doit.md. Toda função aqui é
 * best-effort — nunca lança, só loga — pra não bloquear updates de item/folder.
 */

type DriveContext = { drive: drive_v3.Drive; account: GoogleAccountRow }

type DriveLinkRow = { itemId: string; fileId: string }
type ItemRow = { folderId?: string | null }
type FolderRow = { id?: string; _id?: string; name: string; parentId?: string | null; driveFolderId?: string | null }

const FILE_ID_REGEX = /drive\.google\.com\/file\/d\/([A-Za-z0-9_-]+)/g

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

function extractDriveFileIds(markdown: string): string[] {
  const ids = new Set<string>()
  for (const match of markdown.matchAll(FILE_ID_REGEX)) {
    if (match[1]) ids.add(match[1])
  }
  return [...ids]
}

async function getDriveContext(userId: string): Promise<DriveContext | null> {
  const account = (await GoogleAccountModel.findOne({ userId }).lean()) as GoogleAccountRow | null
  if (!account || !hasDriveScope(account)) return null
  const drive = await getDriveClient(account)
  return { drive, account }
}

/**
 * Move os anexos de um item para a pasta do Drive que espelha o folder atual
 * do item. Re-deriva o destino do estado atual — idempotente.
 */
export async function reconcileItemAttachments(userId: string, itemId: string): Promise<void> {
  try {
    const links = (await DriveLinkModel.find({ userId, itemId }).lean()) as DriveLinkRow[]
    if (links.length === 0) return

    const item = (await ItemModel.findOne({ _id: itemId, userId }).lean()) as ItemRow | null
    if (!item) return

    const ctx = await getDriveContext(userId)
    if (!ctx) return

    const targetFolderId = await ensureFolderPath(ctx.drive, ctx.account, item.folderId ?? null)
    for (const link of links) {
      if (!link.fileId) continue
      try {
        await moveDriveItem(ctx.drive, link.fileId, targetFolderId)
      } catch (err) {
        console.warn(`[drive-reconcile] falha ao mover ${link.fileId}: ${errMsg(err)}`)
      }
    }
  } catch (err) {
    console.warn(`[drive-reconcile] reconcileItemAttachments(${itemId}) falhou: ${errMsg(err)}`)
  }
}

/**
 * Garante que a pasta-espelho de um folder do doit.md tem o nome e o pai certos
 * no Drive. Só age se o folder já tem `driveFolderId` (espelho criado).
 */
export async function reconcileFolderMirror(userId: string, folderId: string): Promise<void> {
  try {
    const folder = (await FolderModel.findOne({ _id: folderId, userId }).lean()) as FolderRow | null
    if (!folder?.driveFolderId) return

    const ctx = await getDriveContext(userId)
    if (!ctx) return

    const meta = await getDriveFileMeta(ctx.drive, folder.driveFolderId)
    if (meta.name !== folder.name) {
      await renameDriveItem(ctx.drive, folder.driveFolderId, folder.name)
    }
    const desiredParent = await ensureFolderPath(ctx.drive, ctx.account, folder.parentId ?? null)
    await moveDriveItem(ctx.drive, folder.driveFolderId, desiredParent, meta.parents)
  } catch (err) {
    console.warn(`[drive-reconcile] reconcileFolderMirror(${folderId}) falhou: ${errMsg(err)}`)
  }
}

/**
 * Registra `drive_links` para `fileId`s referenciados num markdown que ainda
 * não têm vínculo (origem típica: arquivos da `_inbox/` que a IA referenciou
 * numa nota nova). Não move nada — quem move é `reconcileItemAttachments`.
 */
export async function registerInboxLinks(
  userId: string,
  itemId: string,
  contentMd: string,
): Promise<void> {
  try {
    const fileIds = extractDriveFileIds(contentMd)
    if (fileIds.length === 0) return

    const ctx = await getDriveContext(userId)
    if (!ctx) return

    for (const fileId of fileIds) {
      const existing = await DriveLinkModel.findOne({ userId, fileId }).lean()
      if (existing) continue
      try {
        const meta = await getDriveFileMeta(ctx.drive, fileId)
        await DriveLinkModel.create({
          _id: newDriveLinkId(),
          userId,
          itemId,
          fileId,
          fileName: meta.name,
          mimeType: meta.mimeType,
          size: meta.size,
          webViewLink: meta.webViewLink ?? `https://drive.google.com/file/d/${fileId}/view`,
          createdAt: new Date().toISOString(),
        })
      } catch (err) {
        // fileId inacessível pelo escopo drive.file, na lixeira, ou inexistente.
        console.warn(`[drive-reconcile] fileId ${fileId} ignorado: ${errMsg(err)}`)
      }
    }
  } catch (err) {
    console.warn(`[drive-reconcile] registerInboxLinks(${itemId}) falhou: ${errMsg(err)}`)
  }
}

/**
 * Varredura completa (drift sweep): reposiciona todos os anexos do usuário e
 * todas as pastas-espelho. Usado pelo comando `doit-sync drive sync`.
 */
export async function reconcileAllForUser(
  userId: string,
): Promise<{ items: number; folders: number }> {
  const ctx = await getDriveContext(userId)
  if (!ctx) return { items: 0, folders: 0 }

  const links = (await DriveLinkModel.find({ userId }).lean()) as DriveLinkRow[]
  const itemIds = [...new Set(links.map((link) => link.itemId).filter(Boolean))]
  for (const itemId of itemIds) {
    await reconcileItemAttachments(userId, itemId)
  }

  const folders = (await FolderModel.find({ userId }).lean()) as FolderRow[]
  let folderCount = 0
  for (const folder of folders) {
    if (!folder.driveFolderId) continue
    const id = String(folder.id ?? folder._id ?? '')
    if (!id) continue
    await reconcileFolderMirror(userId, id)
    folderCount++
  }

  return { items: itemIds.length, folders: folderCount }
}
