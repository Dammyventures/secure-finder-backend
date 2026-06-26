import mongoose, { Schema, Document } from 'mongoose'

export interface IClaim extends Document {
  item: mongoose.Types.ObjectId
  claimant: mongoose.Types.ObjectId
  status: 'pending' | 'approved' | 'rejected' | 'completed'
  proofOfOwnership: {
    type: string
    url: string
    description: string
  }[]
  additionalInfo: string
  adminNotes?: string
  reviewedBy?: mongoose.Types.ObjectId
  reviewedAt?: Date
  completedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const ClaimSchema = new Schema<IClaim>({
  item: {
    type: Schema.Types.ObjectId,
    ref: 'Item',
    required: true
  },
  claimant: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'completed'],
    default: 'pending'
  },
  proofOfOwnership: [{
    type: {
      type: String,
      enum: ['receipt', 'photo', 'video', 'document'],
      required: true
    },
    url: {
      type: String,
      required: true
    },
    description: String
  }],
  additionalInfo: {
    type: String
  },
  adminNotes: String,
  reviewedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: Date,
  completedAt: Date
}, {
  timestamps: true
})

// Ensure one active claim per item
ClaimSchema.index({ item: 1, status: 1 })

export const Claim = mongoose.model<IClaim>('Claim', ClaimSchema)