import mongoose, { Schema, Document } from 'mongoose'

export interface ISession extends Document {
  user: mongoose.Types.ObjectId
  token: string
  refreshToken: string
  device: {
    type: string
    os: string
    browser: string
  }
  ipAddress: string
  location?: {
    city: string
    country: string
  }
  lastActive: Date
  expiresAt: Date
  isActive: boolean
  createdAt: Date
}

const SessionSchema = new Schema<ISession>({
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  token: {
    type: String,
    required: true
  },
  refreshToken: {
    type: String,
    required: true
  },
  device: {
    type: {
      type: String,
      required: true
    },
    os: {
      type: String,
      required: true
    },
    browser: {
      type: String,
      required: true
    }
  },
  ipAddress: {
    type: String,
    required: true
  },
  location: {
    city: String,
    country: String
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
})

SessionSchema.index({ user: 1, isActive: 1 })
SessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export const Session = mongoose.model<ISession>('Session', SessionSchema)