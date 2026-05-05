import type { ChangeType, RiskLevel } from '@clarity/types'

const RISK_MAP: Record<ChangeType, RiskLevel> = {
  created: 'low',
  updated: 'low',
  content_changed: 'low',
  frontmatter_changed: 'medium',
  renamed: 'medium',
  moved: 'medium',
  deleted: 'high',
  conflict: 'high',
}

export function assessRisk(changeType: ChangeType): RiskLevel {
  return RISK_MAP[changeType]
}
