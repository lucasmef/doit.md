import { Schema, model, models } from 'mongoose'

const ItemSchema = new Schema(
  {
    _id: { type: String, required: true },
    userId: { type: String, required: true, index: true },
    title: { type: String, required: true },
    contentMd: { type: String },
    complexity: {
      type: String,
      enum: ['capture', 'task', 'note', 'project', 'document'],
      default: 'capture',
    },
    status: {
      type: String,
      enum: ['inbox', 'todo', 'doing', 'waiting', 'done', 'archived'],
      default: 'inbox',
    },
    priority: { type: Number, enum: [1, 2, 3, 4] },
    dueDate: { type: String },
    startDate: { type: String },
    scheduledDate: { type: String },
    projectId: { type: String, ref: 'Project' },
    areaId: { type: String, ref: 'Area' },
    parentId: { type: String, ref: 'Item' },
    tags: { type: [String], default: [] },
    backlinks: { type: [String], default: [] },
    localPath: { type: String },
    syncHash: { type: String },
    googleEventId: { type: String },
    calendarEventId: { type: String },
    deletedAt: { type: String },
  },
  {
    _id: false,
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  },
)

ItemSchema.index({ userId: 1, status: 1 })
ItemSchema.index({ userId: 1, dueDate: 1 })
ItemSchema.index({ userId: 1, projectId: 1 })

export const ItemModel = models['Item'] ?? model('Item', ItemSchema)
