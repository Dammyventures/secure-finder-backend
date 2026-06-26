import { Router } from 'express'
import { ClaimController } from '../controllers/claim.controller'
import { authenticate, requireVerified } from '../middleware/auth.middleware'
import { validate } from '../middleware/validation.middleware'
import { body } from 'express-validator'

const router = Router()

router.use(authenticate)

router.get('/', ClaimController.getClaims)
router.get('/my', ClaimController.getMyClaims)
router.get('/item/:itemId', ClaimController.getItemClaims)

router.post('/:itemId',
  requireVerified,
  validate([
    body('proofOfOwnership').optional().isArray(),
    body('additionalInfo').optional().isString()
  ]),
  ClaimController.createClaim
)

router.get('/:id', ClaimController.getClaimById)

router.patch('/:id/status',
  validate([
    body('status').isIn(['pending', 'approved', 'rejected', 'completed']),
    body('adminNotes').optional().isString()
  ]),
  ClaimController.updateClaimStatus
)

router.post('/:id/cancel', ClaimController.cancelClaim)

export default router