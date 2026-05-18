import { AuditLogModel } from '@doit/db'
import { newAuditId } from '@doit/core'

type ManualAuditInput = {
  userId: string
  action: string
  summary: string
  itemId?: string
  fieldChanges?: unknown
}

export async function createManualAuditLog(input: ManualAuditInput) {
  await AuditLogModel.create({
    _id: newAuditId(),
    userId: input.userId,
    source: 'manual',
    action: input.action,
    itemId: input.itemId,
    fieldChanges: input.fieldChanges,
    summary: input.summary,
    createdAt: new Date().toISOString(),
  })
}
