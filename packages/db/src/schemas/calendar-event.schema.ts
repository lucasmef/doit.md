import { Schema, model, models } from 'mongoose'

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

export const CalendarEventModel =
  models['CalendarEvent'] ?? model('CalendarEvent', CalendarEventSchema)
