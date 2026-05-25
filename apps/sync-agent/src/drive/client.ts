export type DriveTokenInfo = {
  accessToken: string
  expiresAt: number | null
  rootFolderId: string
  inboxFolderId: string
}

export class DriveNotConnectedError extends Error {
  constructor(message = 'Drive not connected') {
    super(message)
    this.name = 'DriveNotConnectedError'
  }
}

export async function fetchDriveToken(apiUrl: string, apiKey: string): Promise<DriveTokenInfo> {
  const res = await fetch(`${apiUrl}/api/drive/token`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (res.status === 412) {
    throw new DriveNotConnectedError('Drive não autorizado para esta conta')
  }
  if (!res.ok) {
    throw new Error(`/api/drive/token retornou ${res.status}`)
  }
  return (await res.json()) as DriveTokenInfo
}

export type DriveFile = {
  id: string
  name: string
  mimeType: string
  parents?: string[]
  size?: string
  md5Checksum?: string
  modifiedTime?: string
  trashed?: boolean
}

const FOLDER_MIME = 'application/vnd.google-apps.folder'

export async function listFolderContents(
  accessToken: string,
  folderId: string,
  includeTrashed = false,
): Promise<DriveFile[]> {
  const out: DriveFile[] = []
  let pageToken: string | undefined
  const trashedClause = includeTrashed ? '' : ' and trashed = false'
  const q = `'${folderId}' in parents${trashedClause}`
  const fields =
    'nextPageToken,files(id,name,mimeType,parents,size,md5Checksum,modifiedTime,trashed)'

  do {
    const url = new URL('https://www.googleapis.com/drive/v3/files')
    url.searchParams.set('q', q)
    url.searchParams.set('fields', fields)
    url.searchParams.set('pageSize', '1000')
    url.searchParams.set('spaces', 'drive')
    if (pageToken) url.searchParams.set('pageToken', pageToken)

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    if (!res.ok) {
      throw new Error(`Drive list failed (${res.status}): ${await res.text()}`)
    }
    const data = (await res.json()) as { files?: DriveFile[]; nextPageToken?: string }
    for (const f of data.files ?? []) out.push(f)
    pageToken = data.nextPageToken
  } while (pageToken)

  return out
}

export async function listAllUnder(
  accessToken: string,
  rootFolderId: string,
): Promise<DriveFile[]> {
  const all: DriveFile[] = []
  const queue: string[] = [rootFolderId]
  const visited = new Set<string>()

  while (queue.length) {
    const current = queue.shift()!
    if (visited.has(current)) continue
    visited.add(current)
    const children = await listFolderContents(accessToken, current)
    for (const child of children) {
      all.push(child)
      if (child.mimeType === FOLDER_MIME) queue.push(child.id)
    }
  }

  return all
}

/** Baixa o conteúdo bruto de um arquivo do Drive via `files.get?alt=media`. */
export async function downloadFile(accessToken: string, fileId: string): Promise<Buffer> {
  const url = new URL(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`)
  url.searchParams.set('alt', 'media')

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    throw new Error(`Drive download falhou (${res.status}): ${await res.text()}`)
  }
  return Buffer.from(await res.arrayBuffer())
}

export { FOLDER_MIME }
