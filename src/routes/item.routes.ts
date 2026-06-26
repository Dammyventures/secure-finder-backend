import { Router } from 'express'
import { ItemController } from '../controllers/item.controller'
import { authenticate, requireVerified } from '../middleware/auth.middleware'
import { validate } from '../middleware/validation.middleware'
import { createItemValidation } from '../utils/validators'

const router = Router()

router.get('/', ItemController.getItems)
router.get('/nearby', ItemController.getNearbyItems)
router.get('/:id', ItemController.getItemById)

router.post('/', authenticate, requireVerified, validate(createItemValidation), ItemController.createItem)
router.put('/:id', authenticate, ItemController.updateItem)
router.delete('/:id', authenticate, ItemController.deleteItem)
router.post('/:id/claim', authenticate, requireVerified, ItemController.claimItem)

export default router