import { Schema, model, models, type Model } from 'mongoose'

const AreaSchema = new Schema(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    description: { type: String },
    color: { type: String },
    order: { type: Number, default: 0 },
  },
  {
    _id: false,
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  },
)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const AreaModel: Model<any> = (models['Area'] as Model<any>) ?? model('Area', AreaSchema)
