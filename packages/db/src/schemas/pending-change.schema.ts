import { Schema, model, models } from 'mongoose'

const PendingChangeSchema = new Schema(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    itemId: { type: String },
    changeType: {
      type: String,
      enum: [
        'created',
        'updated',
        'moved',
        'renamed',
        'frontmatter_changed',
        'content_changed',
        'deleted',
        'conflict',
      ],
      required: true,
    },
    localPathBefore: { type: String },
    localPathAfter: { type: String },
    titleBefore: { type: String },
    titleAfter: { type: String },
    contentMdBefore: { type: String },
    contentMdAfter: { type: String },
    frontmatterChanges: [{ field: String, before: Schema.Types.Mixed, after: Schema.Types.Mixed }],
    riskLevel: { type: String, enum: ['low', 'medium', 'high'], required: true },
    approved: { type: Boolean, default: false },
  },
  {
    _id: false,
    timestamps: { createdAt: 'createdAt', updatedAt: false },
  },
)

export const PendingChangeModel =
  models['PendingChange'] ?? model('PendingChange', PendingChangeSchema)
