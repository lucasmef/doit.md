import type { AuditLog } from '@doit/types'

const ACTION_ICON: Record<AuditLog['action'], string> = {
  pull: 'v',
  diff: '<>',
  push: '^',
  file_created: '+',
  file_updated: '*',
  file_moved: '->',
  file_deleted: 'x',
  folder_created: '+',
  folder_updated: '*',
  folder_moved: '->',
  folder_deleted: 'x',
  item_updated: '*',
  item_archived: 'x',
  items_bulk_updated: '**',
  item_version_restored: '<',
  cli_token_created: '+',
  cli_token_revoked: 'x',
  google_connected: '+',
  google_disconnected: 'x',
  frontmatter_changed: 'o',
  conflict_detected: '!',
  version_created: '>',
}

const ACTION_COLOR: Record<AuditLog['action'], string> = {
  pull: 'text-blue-500',
  diff: 'text-slate-500',
  push: 'text-green-600',
  file_created: 'text-green-600',
  file_updated: 'text-amber-600',
  file_moved: 'text-blue-500',
  file_deleted: 'text-red-500',
  folder_created: 'text-green-600',
  folder_updated: 'text-amber-600',
  folder_moved: 'text-blue-500',
  folder_deleted: 'text-red-500',
  item_updated: 'text-amber-600',
  item_archived: 'text-red-500',
  items_bulk_updated: 'text-amber-600',
  item_version_restored: 'text-blue-500',
  cli_token_created: 'text-green-600',
  cli_token_revoked: 'text-red-500',
  google_connected: 'text-green-600',
  google_disconnected: 'text-red-500',
  frontmatter_changed: 'text-violet-500',
  conflict_detected: 'text-red-600',
  version_created: 'text-slate-400',
}

type Props = { log: AuditLog }

export function AuditLogRow({ log }: Props) {
  const icon = ACTION_ICON[log.action] ?? '-'
  const color = ACTION_COLOR[log.action] ?? 'text-slate-400'

  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-slate-100 last:border-0">
      <span className={`text-sm font-mono shrink-0 mt-0.5 w-5 text-center ${color}`}>{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-700 truncate">{log.summary}</p>
        {log.itemId && <p className="text-xs text-slate-400 mt-0.5 font-mono">{log.itemId}</p>}
      </div>
      <time className="text-[10px] text-slate-400 shrink-0 whitespace-nowrap mt-0.5">
        {new Date(log.createdAt).toLocaleString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
        })}
      </time>
    </div>
  )
}
