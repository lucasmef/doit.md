import { NextRequest, NextResponse } from 'next/server'
import { Readable } from 'node:stream'
import { auth } from '@/lib/auth'
import { ensureDB } from '@/lib/db'
import { DriveLinkModel, GoogleAccountModel, ItemModel } from '@doit/db'
import { newDriveLinkId } from '@doit/core'
import { getDriveClient, hasDriveScope, type GoogleAccountRow } from '@/lib/google'
import { ensureFolderPath } from '@/lib/drive'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_BYTES = 100 * 1024 * 1024
const DRIVE_API_DISABLED_MESSAGE =
  'A API do Google Drive esta desativada no projeto OAuth. Ative a Google Drive API no Google Cloud Console e tente novamente.'

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

function getErrorStatus(err: unknown): number | undefined {
  const candidate = err as { status?: unknown; code?: unknown; response?: { status?: unknown } }
  const status = candidate.status ?? candidate.code ?? candidate.response?.status
  return typeof status === 'number' ? status : undefined
}

function isDriveApiDisabled(err: unknown): boolean {
  const message = getErrorMessage(err).toLowerCase()
  const responseData = (err as { response?: { data?: Record<string, unknown> } })?.response?.data
  const providerStatus = String(responseData?.['status'] ?? '').toLowerCase()
  return (
    providerStatus === 'service_disabled' ||
    message.includes('drive api has not been used') ||
    (message.includes('drive.googleapis.com') && message.includes('disabled'))
  )
}

function isInsufficientDrivePermission(err: unknown): boolean {
  const message = getErrorMessage(err).toLowerCase()
  return (
    getErrorStatus(err) === 401 ||
    message.includes('insufficient authentication scopes') ||
    message.includes('insufficient permission')
  )
}

export async function POST(req: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await ensureDB()

  let form: FormData
  try {
    form = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid multipart payload' }, { status: 400 })
  }

  const file = form.get('file')
  const itemId = form.get('itemId')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Missing file' }, { status: 400 })
  }
  if (typeof itemId !== 'string' || !itemId) {
    return NextResponse.json({ error: 'Missing itemId' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'File exceeds 100MB limit' }, { status: 413 })
  }

  const item = await ItemModel.findOne({ _id: itemId, userId }).lean()
  if (!item) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 })
  }

  const account = (await GoogleAccountModel.findOne({ userId }).lean()) as GoogleAccountRow | null
  if (!account) {
    return NextResponse.json(
      { error: 'Google account not connected', needsReauth: true },
      { status: 412 },
    )
  }
  if (!hasDriveScope(account)) {
    return NextResponse.json(
      { error: 'Drive scope not granted', needsReauth: true },
      { status: 412 },
    )
  }

  try {
    const drive = await getDriveClient(account)
    const parentFolderId = await ensureFolderPath(
      drive,
      account,
      (item.folderId as string | null | undefined) ?? null,
    )

    const created = await drive.files.create({
      requestBody: {
        name: file.name,
        parents: [parentFolderId],
      },
      media: {
        mimeType: file.type || 'application/octet-stream',
        body: Readable.fromWeb(file.stream() as never),
      },
      fields: 'id,name,mimeType,size,webViewLink',
    })

    const fileId = created.data.id
    const webViewLink =
      created.data.webViewLink ?? `https://drive.google.com/file/d/${fileId}/view`
    if (!fileId) {
      return NextResponse.json({ error: 'Drive upload returned no id' }, { status: 502 })
    }

    const now = new Date().toISOString()
    await DriveLinkModel.create({
      _id: newDriveLinkId(),
      userId,
      itemId,
      fileId,
      fileName: created.data.name ?? file.name,
      mimeType: created.data.mimeType ?? file.type ?? null,
      size: Number(created.data.size ?? file.size),
      webViewLink,
      createdAt: now,
    })

    return NextResponse.json({
      fileId,
      name: created.data.name ?? file.name,
      mimeType: created.data.mimeType ?? file.type ?? null,
      size: Number(created.data.size ?? file.size),
      webViewLink,
    })
  } catch (err) {
    const message = getErrorMessage(err)
    if (message === 'GOOGLE_REAUTH_REQUIRED') {
      return NextResponse.json(
        { error: 'Google reauth required', needsReauth: true },
        { status: 412 },
      )
    }
    if (isInsufficientDrivePermission(err)) {
      return NextResponse.json(
        { error: 'Permissao do Google Drive expirada ou ausente', needsReauth: true },
        { status: 412 },
      )
    }
    if (isDriveApiDisabled(err)) {
      console.warn('[POST /api/drive/upload] Google Drive API disabled for OAuth project')
      return NextResponse.json(
        { error: DRIVE_API_DISABLED_MESSAGE, code: 'DRIVE_API_DISABLED' },
        { status: 503 },
      )
    }
    console.error('[POST /api/drive/upload]', err)
    return NextResponse.json({ error: 'Drive upload failed' }, { status: 500 })
  }
}
