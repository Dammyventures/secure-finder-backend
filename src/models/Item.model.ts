import mongoose, { Schema, Document } from 'mongoose'

export interface IItem extends Document {
  title: string
  description: string
  category: string
  itemType: 'lost' | 'found'
  status: 'open' | 'claimed' | 'matched' | 'resolved' | 'closed'
  location: {
    type: string
    coordinates: [number, number]
    address: string
    city: string
    country: string
  }
  dateLostFound: Date
  images: {
    url: string
    publicId: string
    isVerified: boolean
    uploadedAt: Date
  }[]
  identifyingFeatures: string[]
  reward?: number
  reportedBy: mongoose.Types.ObjectId
  claimedBy?: mongoose.Types.ObjectId
  matchedItem?: mongoose.Types.ObjectId
  secureCode: string
  isAnonymous: boolean
  metadata: Record<string, any>
  verificationScore: number
  views: number
  createdAt: Date
  updatedAt: Date
}

const ItemSchema = new Schema<IItem>({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    minlength: [3, 'Title must be at least 3 characters'],
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    minlength: [10, 'Description must be at least 10 characters']
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: ['electronics', 'jewelry', 'clothing', 'documents', 'keys', 'bags', 'phones', 'laptops', 'other']
  },
  itemType: {
    type: String,
    enum: ['lost', 'found'],
    required: true
  },
  status: {
    type: String,
    enum: ['open', 'claimed', 'matched', 'resolved', 'closed'],
    default: 'open'
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: true
    },
    address: {
      type: String,
      required: true
    },
    city: {
      type: String,
      required: true
    },
    country: {
      type: String,
      required: true
    }
  },
  dateLostFound: {
    type: Date,
    required: true
  },
  images: [{
    url: {
      type: String,
      required: true
    },
    publicId: {
      type: String,
      required: true
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  identifyingFeatures: [{
    type: String
  }],
  reward: {
    type: Number,
    min: 0
  },
  reportedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  claimedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  matchedItem: {
    type: Schema.Types.ObjectId,
    ref: 'Item'
  },
  secureCode: {
    type: String,
    required: true,
    unique: true
  },
  isAnonymous: {
    type: Boolean,
    default: false
  },
  metadata: {
    type: Map,
    of: Schema.Types.Mixed,
    default: {}
  },
  verificationScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  views: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
})

// Create geospatial index
ItemSchema.index({ location: '2dsphere' })
ItemSchema.index({ status: 1, createdAt: -1 })
ItemSchema.index({ reportedBy: 1, createdAt: -1 })

export const Item = mongoose.model<IItem>('Item', ItemSchema)