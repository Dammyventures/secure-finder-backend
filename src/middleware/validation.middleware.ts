import { Request, Response, NextFunction } from 'express'
import { validationResult, ValidationChain, ValidationError } from 'express-validator'
import { AppError } from './error.middleware'
import { Constants } from '../utils/constants'

export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    await Promise.all(validations.map(validation => validation.run(req)))

    const errors = validationResult(req)
    if (errors.isEmpty()) {
      return next()
    }

    const formattedErrors = errors.array().map((err: ValidationError) => ({
      field: (err as any).path || (err as any).param,
      message: err.msg,
      value: (err as any).value
    }))

    throw new AppError(
      Constants.ERROR_MESSAGES.VALIDATION_ERROR,
      400,
      true,
      formattedErrors
    )
  }
}

export const validateParams = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    await Promise.all(validations.map(validation => validation.run(req)))

    const errors = validationResult(req)
    if (errors.isEmpty()) {
      return next()
    }

    const formattedErrors = errors.array().map((err: ValidationError) => ({
      field: (err as any).path || (err as any).param,
      message: err.msg,
      value: (err as any).value
    }))

    throw new AppError(
      'Invalid request parameters',
      400,
      true,
      formattedErrors
    )
  }
}

export const validateQuery = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    await Promise.all(validations.map(validation => validation.run(req)))

    const errors = validationResult(req)
    if (errors.isEmpty()) {
      return next()
    }

    const formattedErrors = errors.array().map((err: ValidationError) => ({
      field: (err as any).path || (err as any).param,
      message: err.msg,
      value: (err as any).value
    }))

    throw new AppError(
      'Invalid query parameters',
      400,
      true,
      formattedErrors
    )
  }
}

export const isValidObjectId = (id: string): boolean => {
  return /^[0-9a-fA-F]{24}$/.test(id)
}

export const isValidEmail = (email: string): boolean => {
  return /^\S+@\S+\.\S+$/.test(email)
}

export const isValidPhone = (phone: string): boolean => {
  return /^\+?[\d\s-]{10,}$/.test(phone)
}

export const isValidPassword = (password: string): boolean => {
  return /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{8,}$/.test(password)
}

export const isValidUrl = (url: string): boolean => {
  return /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/.test(url)
}

export const isValidSecureCode = (code: string): boolean => {
  return /^[A-Z0-9]{6}$/.test(code)
}

export const sanitizeInput = (input: any): any => {
  if (typeof input === 'string') {
    return input.trim().replace(/[<>]/g, '')
  }
  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {}
    for (const [key, value] of Object.entries(input)) {
      sanitized[key] = sanitizeInput(value)
    }
    return sanitized
  }
  return input
}

export const validateEnum = (value: string, enumValues: string[]): boolean => {
  return enumValues.includes(value)
}

export const validateRange = (value: number, min: number, max: number): boolean => {
  return value >= min && value <= max
}

export const validateLength = (value: string, min: number, max: number): boolean => {
  return value.length >= min && value.length <= max
}