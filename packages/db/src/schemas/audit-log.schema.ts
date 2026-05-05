import { Schema, model, models, type Model } from 'mongoose'

const AuditLogSchema = new Schema(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    source: { type: String, enum: ['sync-agent', 'manual', 'api'], required: true },
    action: {
      type: String,
      enum: [
        'pull', 'diff', 'push',
        'file_created', 'file_updated', 'file_moved', 'file_deleted',
        'frontmatter_changed', 'conflict_detected', 'version_created',
      ],
      required: true,
    },
    itemId: { type: String },
    localPathBefore: { type: String },
    localPathAfter: { type: String },
    fieldChanges: [{ field: String, before: Schema.Types.Mixed, after: Schema.Types.Mixed }],
    contentHashBefore: { type: String },
    contentHashAfter: { type: String },
    summary: { type: String, required: true },
  },
  {
    _id: false,
    timestamps: { createdAt: 'createdAt', updatedAt: false },
  },
)

AuditLogSchema.index({ userId: 1, createdAt: -1 })

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const AuditLogModel: Model<any> =
  (models['AuditLog'] as Model<any>) ?? model('AuditLog', AuditLogSchema)
