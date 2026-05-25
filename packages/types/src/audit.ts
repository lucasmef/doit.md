export type AuditAction =
  | 'pull'
  | 'diff'
  | 'push'
  | 'file_created'
  | 'file_updated'
  | 'file_moved'
  | 'file_deleted'
  | 'folder_created'
  | 'folder_updated'
  | 'folder_moved'
  | 'folder_deleted'
  | 'item_updated'
  | 'item_archived'
  | 'items_bulk_updated'
  | 'item_version_restored'
  | 'cli_token_created'
  | 'cli_token_revoked'
  | 'google_connected'
  | 'google_disconnected'
  | 'frontmatter_changed'
  | 'conflict_detected'
  | 'version_created'

export type AuditLog = {
  id: string
  userId: string

  source: 'sync-agent' | 'manual' | 'api'
  action: AuditAction

  itemId?: string

  localPathBefore?: string
  localPathAfter?: string

  fieldChanges?: {
    field: string
    before: unknown
    after: unknown
  }[]

  contentHashBefore?: string
  contentHashAfter?: string

  summary: string

  createdAt: string
}

export type ChangeType =
  | 'created'
  | 'updated'
  | 'moved'
  | 'renamed'
  | 'frontmatter_changed'
  | 'content_changed'
  | 'deleted'
  | 'folder_created'
  | 'folder_moved'
  | 'folder_renamed'
  | 'folder_deleted'
  | 'conflict'

export type RiskLevel = 'low' | 'medium' | 'high'

export type PendingChange = {
  id: string
  userId: string
  itemId?: string
  folderId?: string

  changeType: ChangeType

  localPathBefore?: string
  localPathAfter?: string

  titleBefore?: string
  titleAfter?: string
  folderNameBefore?: string
  folderNameAfter?: string

  contentMdBefore?: string
  contentMdAfter?: string

  frontmatterChanges?: {
    field: string
    before: unknown
    after: unknown
  }[]

  riskLevel: RiskLevel

  approved: boolean

  createdAt: string
}

export type ItemVersion = {
  id: string
  itemId: string
  userId: string

  snapshotData: Record<string, unknown>
  syncHash: string

  createdAt: string
}
