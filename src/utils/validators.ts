import { body, validationResult, ValidationChain } from 'express-validator'

// ===================== REGISTRATION VALIDATION =====================
// Removed identity fields – now only basic info
export const registerValidation = [
  body('fullName')
    .trim()
    .notEmpty().withMessage('Full name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2-100 characters'),
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format'),
  body('phone')
    .trim()
    .notEmpty().withMessage('Phone number is required')
    .matches(/^(080|081|090|091|070)\d{8}$/)
    .withMessage('Enter a valid Nigerian phone number (e.g., 08012345678)'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain lowercase letter')
    .matches(/\d/).withMessage('Password must contain a number')
    .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Password must contain special character')
]

// ===================== LOGIN VALIDATION =====================
export const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format'),
  body('password')
    .notEmpty().withMessage('Password is required')
]

// ===================== CHANGE PASSWORD VALIDATION =====================
export const changePasswordValidation = [
  body('currentPassword')
    .notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Password must contain uppercase letter')
    .matches(/[a-z]/).withMessage('Password must contain lowercase letter')
    .matches(/\d/).withMessage('Password must contain a number')
    .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Password must contain special character')
]

// ===================== CREATE ITEM VALIDATION =====================
export const createItemValidation = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required')
    .isLength({ min: 3, max: 200 }).withMessage('Title must be 3-200 characters'),
  body('description')
    .trim()
    .notEmpty().withMessage('Description is required')
    .isLength({ min: 10 }).withMessage('Description must be at least 10 characters'),
  body('category')
    .isIn(['electronics', 'jewelry', 'clothing', 'documents', 'keys', 'bags', 'phones', 'laptops', 'other'])
    .withMessage('Invalid category'),
  body('itemType')
    .isIn(['lost', 'found']).withMessage('Item type must be lost or found'),
  body('location.address')
    .notEmpty().withMessage('Address is required'),
  body('location.city')
    .notEmpty().withMessage('City is required'),
  body('location.country')
    .notEmpty().withMessage('Country is required'),
  body('dateLostFound')
    .isISO8601().withMessage('Invalid date format')
]

// ===================== GENERIC VALIDATE MIDDLEWARE =====================
export const validate = (validations: ValidationChain[]) => {
  return async (req: any, res: any, next: any) => {
    await Promise.all(validations.map(validation => validation.run(req)))

    const errors = validationResult(req)
    if (errors.isEmpty()) {
      return next()
    }

    const formattedErrors = errors.array().map((err: any) => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value
    }))

    res.status(400).json({
      success: false,
      errors: formattedErrors
    })
  }
}