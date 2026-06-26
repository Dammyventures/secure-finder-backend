import mongoose, { Schema, Document } from 'mongoose'

export interface INotification extends Document {
  user: mongoose.Types.ObjectId
  type: 'item_matched' | 'claim_updated' | 'message' | 'system' | 'alert'
  title: string
  message: string
  read: boolean
  data?: Record<string, any>
  createdAt: Date
}

const NotificationSchema = new Schema<INotification>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['item_matched', 'claim_updated', 'message', 'system', 'alert'],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  read: {
    type: Boolean,
    default: false
  },
  data: {
    type: Map,
    of: Schema.Types.Mixed
  }
}, {
  timestamps: {
    createdAt: true,
    updatedAt: false
  }
})

NotificationSchema.index({ user: 1, read: 1, createdAt: -1 })

export const Notification = mongoose.model<INotification>('Notification', NotificationSchema)