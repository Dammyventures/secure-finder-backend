import mongoose, { Schema, Document } from 'mongoose'

export interface IOTP extends Document {
  email: string
  code: string
  type: 'verification' | 'password_reset' | 'two_factor'
  expiresAt: Date
  attempts: number
  verified: boolean
  createdAt: Date
}

const OTPSchema = new Schema<IOTP>({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  code: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['verification', 'password_reset', 'two_factor'],
    default: 'verification'
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
  },
  attempts: {
    type: Number,
    default: 0,
    max: 5
  },
  verified: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
})

// Index for cleanup
OTPSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export const OTP = mongoose.model<IOTP>('OTP', OTPSchema)