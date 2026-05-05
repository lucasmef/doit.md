import { Schema, model, models } from 'mongoose'

const ItemVersionSchema = new Schema(
  {
    _id: { type: String, required: true },
    itemId: { type: String, required: true, index: true },
    userId: { type: String, required: true },
    snapshotData: { type: Schema.Types.Mixed, required: true },
    syncHash: { type: String, required: true },
  },
  {
    _id: false,
    timestamps: { createdAt: 'createdAt', updatedAt: false },
  },
)

export const ItemVersionModel = models['ItemVersion'] ?? model('ItemVersion', ItemVersionSchema)
