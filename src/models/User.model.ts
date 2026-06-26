import mongoose, { Schema, Document } from 'mongoose'
import bcrypt from 'bcryptjs'

export interface IUser extends Document {
  fullName: string
  email: string
  phone: string
  password: string
  profileImage?: string
  bio?: string
  identityVerified: boolean
  isEmailVerified: boolean
  isPhoneVerified: boolean
  accountStatus: 'active' | 'suspended' | 'pending_verification' | 'banned'
  verificationScore: number
  identityDocuments?: {
    type: string
    url: string
    verified: boolean
    uploadedAt: Date
  }[]
  twoFactorEnabled: boolean
  twoFactorSecret?: string
  backupCodes?: string[]
  preferences: {
    language: string
    timezone: string
    dateFormat: string
    currency: string
    measurementSystem: 'metric' | 'imperial'
    theme: 'light' | 'dark' | 'auto'
    emailNotifications: boolean
    pushNotifications: boolean
    smsNotifications: boolean
  }
  privacy: {
    profileVisibility: 'public' | 'contacts' | 'private'
    showEmail: boolean
    showPhone: boolean
    showLocation: boolean
    allowMessaging: boolean
  }
  security: {
    loginAlerts: boolean
    suspiciousActivityAlerts: boolean
    quietHours: {
      enabled: boolean
      startTime: string
      endTime: string
    }
  }
  lastLogin?: Date
  isActive: boolean
  isAdmin: boolean
  refreshTokens: string[]
  createdAt: Date
  updatedAt: Date
  comparePassword(candidatePassword: string): Promise<boolean>
}

const UserSchema = new Schema<IUser>({
  fullName: {
    type: String,
    required: [true, 'Full name is required'],
    trim: true,
    minlength: [2, 'Name must be at least 2 characters'],
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false
  },
  profileImage: {
    type: String
  },
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot exceed 500 characters']
  },
  identityVerified: {
    type: Boolean,
    default: false
  },
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  accountStatus: {
    type: String,
    enum: ['active', 'suspended', 'pending_verification', 'banned'],
    default: 'pending_verification'
  },
  verificationScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  identityDocuments: [{
    type: {
      type: String,
      enum: ['id_card', 'passport', 'drivers_license']
    },
    url: String,
    verified: {
      type: Boolean,
      default: false
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: String,
  backupCodes: [String],
  preferences: {
    language: {
      type: String,
      default: 'en'
    },
    timezone: {
      type: String,
      default: 'UTC'
    },
    dateFormat: {
      type: String,
      default: 'MM/DD/YYYY'
    },
    currency: {
      type: String,
      default: 'USD'
    },
    measurementSystem: {
      type: String,
      enum: ['metric', 'imperial'],
      default: 'metric'
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'auto'
    },
    emailNotifications: {
      type: Boolean,
      default: true
    },
    pushNotifications: {
      type: Boolean,
      default: true
    },
    smsNotifications: {
      type: Boolean,
      default: false
    }
  },
  privacy: {
    profileVisibility: {
      type: String,
      enum: ['public', 'contacts', 'private'],
      default: 'contacts'
    },
    showEmail: {
      type: Boolean,
      default: false
    },
    showPhone: {
      type: Boolean,
      default: false
    },
    showLocation: {
      type: Boolean,
      default: false
    },
    allowMessaging: {
      type: Boolean,
      default: true
    }
  },
  security: {
    loginAlerts: {
      type: Boolean,
      default: true
    },
    suspiciousActivityAlerts: {
      type: Boolean,
      default: true
    },
    quietHours: {
      enabled: {
        type: Boolean,
        default: false
      },
      startTime: {
        type: String,
        default: '22:00'
      },
      endTime: {
        type: String,
        default: '08:00'
      }
    }
  },
  lastLogin: Date,
  isActive: {
    type: Boolean,
    default: true
  },
  isAdmin: {
    type: Boolean,
    default: false
  },
  refreshTokens: [{
    type: String,
    select: false
  }]
}, {
  timestamps: true
})

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next()
  
  try {
    const salt = await bcrypt.genSalt(parseInt(process.env.BCRYPT_ROUNDS || '12'))
    this.password = await bcrypt.hash(this.password, salt)
    next()
  } catch (error: any) {
    next(error)
  }
})

// Compare password method
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password)
}

export const User = mongoose.model<IUser>('User', UserSchema)