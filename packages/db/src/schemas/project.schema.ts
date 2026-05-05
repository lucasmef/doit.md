import { Schema, model, models, type Model } from 'mongoose'

const ProjectSchema = new Schema(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true },
    description: { type: String },
    status: {
      type: String,
      enum: ['active', 'paused', 'done', 'archived'],
      default: 'active',
    },
    areaId: { type: String, ref: 'Area' },
    color: { type: String },
    order: { type: Number, default: 0 },
  },
  {
    _id: false,
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  },
)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const ProjectModel: Model<any> = (models['Project'] as Model<any>) ?? model('Project', ProjectSchema)
