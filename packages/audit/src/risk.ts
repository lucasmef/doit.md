import type { ChangeType, RiskLevel } from '@doit/types'

const RISK_MAP: Record<ChangeType, RiskLevel> = {
  created: 'low',
  updated: 'low',
  content_changed: 'low',
  frontmatter_changed: 'medium',
  renamed: 'medium',
  moved: 'medium',
  deleted: 'high',
  folder_created: 'low',
  folder_moved: 'medium',
  folder_renamed: 'medium',
  folder_deleted: 'high',
  conflict: 'high',
}

export function assessRisk(changeType: ChangeType): RiskLevel {
  return RISK_MAP[changeType]
}
