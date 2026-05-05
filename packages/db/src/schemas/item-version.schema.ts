import { Schema, model, models, type Model } from 'mongoose'

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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ItemVersionModel: Model<any> =
  (models['ItemVersion'] as Model<any>) ?? model('ItemVersion', ItemVersionSchema)
