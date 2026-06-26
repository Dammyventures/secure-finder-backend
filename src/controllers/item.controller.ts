import { Request, Response } from 'express'
import { Item } from '../models/Item.model'
import { Claim } from '../models/Claim.model'
import { Notification } from '../models/Notification.model'
import { JWTService } from '../services/jwt.service'
import { aiService } from '../services/ai.service'
import { AppError } from '../middleware/error.middleware'


export class ItemController {
  static async createItem(req: any, res: Response) {
    const {
      title,
      description,
      category,
      itemType,
      location,
      dateLostFound,
      identifyingFeatures,
      reward,
      isAnonymous,
      metadata
    } = req.body
    
    const secureCode = JWTService.generateSecureCode()
    
    const item = new Item({
      title,
      description,
      category,
      itemType,
      location,
      dateLostFound: new Date(dateLostFound),
      identifyingFeatures: identifyingFeatures || [],
      reward: reward || 0,
      reportedBy: req.user._id,
      secureCode,
      isAnonymous: isAnonymous || false,
      metadata: metadata || {},
      status: 'open'
    })
    
    await item.save()
    
    const matches = await aiService.findMatches(item)
    
    if (matches.length > 0) {
      // Create notifications for matches
    }
    
    res.status(201).json({
      success: true,
      data: item
    })
  }
  
  static async getItems(req: Request, res: Response) {
    const {
      status,
      category,
      itemType,
      search,
      page = 1,
      limit = 20,
      lat,
      lng,
      radius = 10
    } = req.query
    
    const query: any = {}
    
    if (status) query.status = status
    if (category) query.category = category
    if (itemType) query.itemType = itemType
    
    if (search) {
      query.$text = { $search: search as string }
    }
    
    if (lat && lng) {
      query.location = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng as string), parseFloat(lat as string)]
          },
          $maxDistance: parseFloat(radius as string) * 1000
        }
      }
    }
    
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string)
    
    const [items, total] = await Promise.all([
      Item.find(query)
        .populate('reportedBy', 'fullName profileImage identityVerified')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit as string)),
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
  }
  
  static async getItemById(req: Request, res: Response) {
    const { id } = req.params
    
    const item = await Item.findById(id)
      .populate('reportedBy', 'fullName email phone profileImage identityVerified')
      .populate('claimedBy', 'fullName email phone profileImage')
      .populate('matchedItem')
    
    if (!item) {
      throw new AppError('Item not found', 404)
    }
    
    item.views += 1
    await item.save()
    
    res.json({
      success: true,
      data: item
    })
  }
  
  static async updateItem(req: any, res: Response) {
    const { id } = req.params
    const updates = req.body
    
    const item = await Item.findById(id)
    if (!item) {
      throw new AppError('Item not found', 404)
    }
    
    if (item.reportedBy.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      throw new AppError('You do not have permission to update this item', 403)
    }
    
    const allowedFields = [
      'title',
      'description',
      'category',
      'location',
      'dateLostFound',
      'identifyingFeatures',
      'reward',
      'status',
      'metadata'
    ]
    
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        (item as any)[field] = updates[field]
      }
    })
    
    await item.save()
    
    res.json({
      success: true,
      data: item
    })
  }
  
  static async deleteItem(req: any, res: Response) {
    const { id } = req.params
    
    const item = await Item.findById(id)
    if (!item) {
      throw new AppError('Item not found', 404)
    }
    
    if (item.reportedBy.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      throw new AppError('You do not have permission to delete this item', 403)
    }
    
    await item.deleteOne()
    
    res.json({
      success: true,
      message: 'Item deleted successfully'
    })
  }
  
  static async claimItem(req: any, res: Response) {
    const { id } = req.params
    const { proofOfOwnership, additionalInfo } = req.body
    
    const item = await Item.findById(id)
    if (!item) {
      throw new AppError('Item not found', 404)
    }
    
    if (item.status !== 'open') {
      throw new AppError('This item is no longer available', 400)
    }
    
    if (item.itemType === 'lost') {
      throw new AppError('Cannot claim a lost item', 400)
    }
    
    if (item.reportedBy.toString() === req.user._id.toString()) {
      throw new AppError('You cannot claim your own item', 400)
    }
    
    if (!req.user.identityVerified) {
      throw new AppError('Identity verification required', 403)
    }
    
    const claim = new Claim({
      item: item._id,
      claimant: req.user._id,
      proofOfOwnership: proofOfOwnership || [],
      additionalInfo: additionalInfo || '',
      status: 'pending'
    })
    
    await claim.save()
    
    item.status = 'claimed'
    item.claimedBy = req.user._id
    await item.save()
    
    const notification = new Notification({
      user: item.reportedBy,
      type: 'claim_updated',
      title: 'New Claim on Your Item',
      message: `${req.user.fullName} has claimed your item "${item.title}"`,
      data: {
        itemId: item._id,
        claimId: claim._id
      }
    })
    
    await notification.save()
    
    res.json({
      success: true,
      data: claim
    })
  }
  
  static async getNearbyItems(req: Request, res: Response) {
    const { lat, lng, radius = 5 } = req.query
    
    if (!lat || !lng) {
      throw new AppError('Latitude and longitude required', 400)
    }
    
    const items = await Item.find({
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng as string), parseFloat(lat as string)]
          },
          $maxDistance: parseFloat(radius as string) * 1000
        }
      },
      status: 'open'
    })
    .populate('reportedBy', 'fullName profileImage')
    .limit(50)
    
    res.json({
      success: true,
      data: items
    })
  }
}