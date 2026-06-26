import nodemailer from 'nodemailer'
import { logger } from '../utils/logger'

interface EmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

export class EmailService {
  private transporter: nodemailer.Transporter
  
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    })
  }

  async sendEmail(options: EmailOptions) {
    try {
      const result = await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || 'noreply@securefinder.com',
        ...options
      })
      logger.info(`Email sent to ${options.to}`)
      return result
    } catch (error) {
      logger.error('Email sending failed:', error)
      throw error
    }
  }

  async sendVerificationOTP(email: string, code: string) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #f4f6f9;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 560px;
            margin: 40px auto;
            background: #ffffff;
            border-radius: 16px;
            padding: 48px 40px;
            box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
          }
          .header {
            text-align: center;
            margin-bottom: 32px;
          }
          .logo {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            text-decoration: none;
          }
          .logo-icon {
            width: 40px;
            height: 40px;
            background: #1C448E;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 20px;
            font-weight: bold;
          }
          .logo-text {
            font-size: 22px;
            font-weight: 700;
            color: #1C448E;
          }
          .logo-text span {
            color: #938BA1;
          }
          h1 {
            color: #1C448E;
            font-size: 24px;
            font-weight: 600;
            margin: 24px 0 12px;
          }
          .subtitle {
            color: #6b7280;
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 32px;
          }
          .code-container {
            background: #f8f9fc;
            border-radius: 12px;
            padding: 24px;
            text-align: center;
            margin: 24px 0;
          }
          .code {
            font-size: 36px;
            font-weight: 700;
            letter-spacing: 8px;
            color: #1C448E;
            font-family: 'Courier New', monospace;
          }
          .divider {
            border: none;
            border-top: 1px solid #e5e7eb;
            margin: 24px 0;
          }
          .footer {
            color: #9ca3af;
            font-size: 13px;
            text-align: center;
            line-height: 1.6;
          }
          .footer a {
            color: #1C448E;
            text-decoration: none;
          }
          .badge {
            display: inline-block;
            background: #e5e7eb;
            color: #6b7280;
            font-size: 12px;
            padding: 4px 12px;
            border-radius: 20px;
            margin-top: 8px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <a href="#" class="logo">
              <div class="logo-icon">🔒</div>
              <div class="logo-text">Secure<span>Finder</span></div>
            </a>
          </div>

          <h1>Verify Your Email Address</h1>
          
          <p class="subtitle">
            Thanks for signing up! Please use the verification code below to confirm your email address.
            This code expires in <strong>15 minutes</strong>.
          </p>

          <div class="code-container">
            <div class="code">${code}</div>
            <div class="badge">6-digit verification code</div>
          </div>

          <hr class="divider">

          <p style="color: #6b7280; font-size: 14px; text-align: center; margin: 16px 0;">
            Didn't request this? You can safely ignore this email.
          </p>

          <div class="footer">
            <p>
              Secure Finder &bull; Lost & Found Platform<br>
              <a href="#">securefinder.com</a>
            </p>
            <p style="margin-top: 8px; font-size: 12px; color: #d1d5db;">
              © ${new Date().getFullYear()} Secure Finder. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `

    return this.sendEmail({
      to: email,
      subject: 'Verify Your Email - Secure Finder',
      html
    })
  }

  async sendPasswordResetOTP(email: string, code: string) {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #f4f6f9;
            margin: 0;
            padding: 0;
          }
          .container {
            max-width: 560px;
            margin: 40px auto;
            background: #ffffff;
            border-radius: 16px;
            padding: 48px 40px;
            box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
          }
          .header { text-align: center; margin-bottom: 32px; }
          .logo-text { font-size: 22px; font-weight: 700; color: #1C448E; }
          .logo-text span { color: #938BA1; }
          h1 { color: #1C448E; font-size: 24px; font-weight: 600; margin: 24px 0 12px; }
          .subtitle { color: #6b7280; font-size: 16px; line-height: 1.6; margin-bottom: 32px; }
          .code-container {
            background: #f8f9fc;
            border-radius: 12px;
            padding: 24px;
            text-align: center;
            margin: 24px 0;
          }
          .code {
            font-size: 36px;
            font-weight: 700;
            letter-spacing: 8px;
            color: #1C448E;
            font-family: 'Courier New', monospace;
          }
          .divider { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
          .footer { color: #9ca3af; font-size: 13px; text-align: center; line-height: 1.6; }
          .footer a { color: #1C448E; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo-text">Secure<span>Finder</span></div>
          </div>
          <h1>Reset Your Password</h1>
          <p class="subtitle">
            We received a request to reset your password. Use the code below to proceed.
            This code expires in <strong>15 minutes</strong>.
          </p>
          <div class="code-container">
            <div class="code">${code}</div>
          </div>
          <hr class="divider">
          <p style="color: #6b7280; font-size: 14px; text-align: center;">
            If you didn't request this, please ignore this email.
          </p>
          <div class="footer">
            <p>Secure Finder &bull; Lost & Found Platform</p>
          </div>
        </div>
      </body>
      </html>
    `

    return this.sendEmail({
      to: email,
      subject: 'Reset Your Password - Secure Finder',
      html
    })
  }
}

export const emailService = new EmailService()