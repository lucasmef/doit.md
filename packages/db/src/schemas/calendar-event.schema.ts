import { Schema, model, models, type Model } from 'mongoose'

const CalendarEventSchema = new Schema(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    description: { type: String },
    start: { type: String, required: true },
    end: { type: String, required: true },
    allDay: { type: Boolean, default: false },
    source: { type: String, enum: ['local', 'google'], default: 'local' },
    googleCalendarId: { type: String },
    googleEventId: { type: String },
    linkedItemIds: { type: [String], default: [] },
  },
  {
    _id: false,
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  },
)

CalendarEventSchema.index({ userId: 1, start: 1 })

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const CalendarEventModel: Model<any> =
  (models['CalendarEvent'] as Model<any>) ?? model('CalendarEvent', CalendarEventSchema)
