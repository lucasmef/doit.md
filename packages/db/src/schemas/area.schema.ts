import { Schema, model, models } from 'mongoose'

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

export const AreaModel = models['Area'] ?? model('Area', AreaSchema)
