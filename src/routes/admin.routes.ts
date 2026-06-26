import { Router } from 'express'
import { authenticate, requireAdmin } from '../middleware/auth.middleware'
import { User } from '../models/User.model'
import { Item } from '../models/Item.model'
import { Claim } from '../models/Claim.model'
import { AppError } from '../middleware/error.middleware'
import { Constants } from '../utils/constants'

const router = Router()
router.use(authenticate, requireAdmin)

// FIXED: _req instead of req
router.get('/stats', async (_req, res) => {
  const [totalUsers, activeUsers, totalItems, openItems, totalClaims, pendingClaims] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ isActive: true }),
    Item.countDocuments(),
    Item.countDocuments({ status: Constants.ITEM_STATUS.OPEN }),
    Claim.countDocuments(),
    Claim.countDocuments({ status: Constants.CLAIM_STATUS.PENDING })
  ])
  res.json({
    success: true,
    data: {
      users: { total: totalUsers, active: activeUsers },
      items: { total: totalItems, open: openItems },
      claims: { total: totalClaims, pending: pendingClaims }
    }
  })
})

router.get('/users', async (req, res) => {
  const { page = 1, limit = 20, search } = req.query
  const query: any = {}
  if (search) {
    query.$or = [
      { fullName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ]
  }
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string)
  const [users, total] = await Promise.all([
    User.find(query).select('-password -refreshTokens -twoFactorSecret -backupCodes').skip(skip).limit(parseInt(limit as string)).sort({ createdAt: -1 }),
    User.countDocuments(query)
  ])
  res.json({
    success: true,
    data: {
      users,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string))
      }
    }
  })
})

router.get('/users/:userId', async (req, res) => {
  const user = await User.findById(req.params.userId).select('-password -refreshTokens -twoFactorSecret -backupCodes')
  if (!user) throw new AppError(Constants.ERROR_MESSAGES.USER_NOT_FOUND, 404)
  res.json({ success: true, data: user })
})

router.patch('/users/:userId', async (req, res) => {
  const { userId } = req.params
  const updates = req.body
  const user = await User.findById(userId)
  if (!user) throw new AppError(Constants.ERROR_MESSAGES.USER_NOT_FOUND, 404)
  const allowed = ['fullName', 'email', 'phone', 'bio', 'isActive', 'isAdmin', 'identityVerified', 'preferences', 'privacy']
  allowed.forEach(field => {
    if (updates[field] !== undefined) (user as any)[field] = updates[field]
  })
  await user.save()
  res.json({ success: true, message: 'User updated', data: user })
})

router.get('/items', async (req, res) => {
  const { status, itemType, page = 1, limit = 20 } = req.query
  const query: any = {}
  if (status) query.status = status
  if (itemType) query.itemType = itemType
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string)
  const [items, total] = await Promise.all([
    Item.find(query).populate('reportedBy', 'fullName email').populate('claimedBy', 'fullName email').skip(skip).limit(parseInt(limit as string)).sort({ createdAt: -1 }),
    Item.countDocuments(query)
  ])
  res.json({
    success: true,
    data: {
      items,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string))
      }
    }
  })
})

router.get('/claims', async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query
  const query: any = {}
  if (status) query.status = status
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string)
  const [claims, total] = await Promise.all([
    Claim.find(query)
      .populate('item', 'title category location status')
      .populate('claimant', 'fullName email phone')
      .populate('reviewedBy', 'fullName email')
      .skip(skip)
      .limit(parseInt(limit as string))
      .sort({ createdAt: -1 }),
    Claim.countDocuments(query)
  ])
  res.json({
    success: true,
    data: {
      claims,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        pages: Math.ceil(total / parseInt(limit as string))
      }
    }
  })
})

// FIXED: _req instead of req
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage()
    }
  })
})

export default router