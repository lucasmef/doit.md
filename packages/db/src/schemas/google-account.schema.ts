import { Schema, model, models, type Model } from 'mongoose'

const GoogleAccountSchema = new Schema(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true, index: true, unique: true },
    email: { type: String, required: true },
    accessToken: { type: String, required: true },
    refreshToken: { type: String },
    expiresAt: { type: Number },
    scope: { type: String },
  },
  {
    _id: false,
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  },
)

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const GoogleAccountModel: Model<any> =
  (models['GoogleAccount'] as Model<any>) ?? model('GoogleAccount', GoogleAccountSchema)
