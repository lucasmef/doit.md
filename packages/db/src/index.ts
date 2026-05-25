import { SqlModel } from './model'

export { connectDB } from './connection'

export const ItemModel = new SqlModel({
  table: 'items',
  jsonFields: ['tags', 'backlinks'],
})

export const FolderModel = new SqlModel({
  table: 'folders',
  booleanFields: ['viewModeManual'],
})

export const AreaModel = new SqlModel({
  table: 'areas',
})

export const CalendarEventModel = new SqlModel({
  table: 'calendar_events',
  jsonFields: ['linkedItemIds'],
  booleanFields: ['allDay'],
})

export const AuditLogModel = new SqlModel({
  table: 'audit_logs',
  jsonFields: ['fieldChanges'],
})

export const PendingChangeModel = new SqlModel({
  table: 'pending_changes',
  jsonFields: ['frontmatterChanges'],
  booleanFields: ['approved'],
})

export const ItemVersionModel = new SqlModel({
  table: 'item_versions',
  jsonFields: ['snapshotData'],
})

export const GoogleAccountModel = new SqlModel({
  table: 'google_accounts',
})

export const UserModel = new SqlModel({
  table: 'users',
})

export const PushSubscriptionModel = new SqlModel({
  table: 'push_subscriptions',
  booleanFields: ['enabled'],
})

export const NotificationAlertModel = new SqlModel({
  table: 'notification_alerts',
})

export const RateLimitModel = new SqlModel({
  table: 'rate_limits',
})

export const CliTokenModel = new SqlModel({
  table: 'cli_tokens',
})

export const DriveLinkModel = new SqlModel({
  table: 'drive_links',
})
