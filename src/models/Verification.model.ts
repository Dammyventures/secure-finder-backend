import mongoose, { Schema, Document } from 'mongoose'

export interface IVerification extends Document {
  userId: mongoose.Types.ObjectId
  status: 'pending' | 'processing' | 'verified' | 'rejected' | 'expired'
  score: number
  documents: {
    type: string
    url: string
    uploadedAt: Date
  }[]
  submittedAt: Date
  processedAt?: Date
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
}

const VerificationSchema = new Schema<IVerification>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'verified', 'rejected', 'expired'],
    default: 'pending'
  },
  score: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  documents: [{
    type: {
      type: String,
      enum: ['idFront', 'idBack', 'selfie']
    },
    url: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  submittedAt: {
    type: Date,
    default: Date.now
  },
  processedAt: Date,
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  }
}, {
  timestamps: true
})

VerificationSchema.index({ userId: 1, status: 1 })
VerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export const Verification = mongoose.model<IVerification>('Verification', VerificationSchema)