import { describe, it, expect } from 'vitest'
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  updatePasswordSchema,
  roleChangeSchema,
} from '@/lib/schemas'

describe('Auth Validation & Security Rules', () => {
  describe('Registration & Password Policy (PRD §7.3)', () => {
    it('requires password to be at least 10 characters', () => {
      const result = registerSchema.safeParse({
        email: 'reader@postsapp.in',
        password: 'Pass1', // too short
        displayName: 'Test Reader',
      })
      expect(result.success).toBe(false)
    })

    it('requires password to contain at least one letter and one number', () => {
      const lettersOnly = registerSchema.safeParse({
        email: 'reader@postsapp.in',
        password: 'PasswordWithoutDigits',
        displayName: 'Test Reader',
      })
      expect(lettersOnly.success).toBe(false)

      const digitsOnly = registerSchema.safeParse({
        email: 'reader@postsapp.in',
        password: '123456789012',
        displayName: 'Test Reader',
      })
      expect(digitsOnly.success).toBe(false)

      const valid = registerSchema.safeParse({
        email: 'reader@postsapp.in',
        password: 'SecurePassword123!',
        displayName: 'Test Reader',
      })
      expect(valid.success).toBe(true)
    })

    it('normalizes email to lowercase and trims whitespace', () => {
      const result = registerSchema.safeParse({
        email: '  Reader@PostsApp.IN  ',
        password: 'SecurePassword123!',
        displayName: 'Test Reader',
      })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.email).toBe('reader@postsapp.in')
      }
    })
  })

  describe('Profile Update Restrictions', () => {
    it('rejects attempt to inject role via profile update payload', () => {
      const malicious = updateProfileSchema.safeParse({
        displayName: 'Hacker',
        role: 'super_admin', // Unauthorized injection attempt
      })
      expect(malicious.success).toBe(false)
    })

    it('rejects attempt to inject is_active via profile update payload', () => {
      const malicious = updateProfileSchema.safeParse({
        displayName: 'User',
        is_active: true,
      })
      expect(malicious.success).toBe(false)
    })

    it('allows valid profile updates', () => {
      const valid = updateProfileSchema.safeParse({
        displayName: 'Valid Name',
        preferredLanguage: 'ta',
      })
      expect(valid.success).toBe(true)
    })
  })

  describe('Role Management Validation', () => {
    it('accepts valid role changes', () => {
      const result = roleChangeSchema.safeParse({
        targetUserId: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
        newRole: 'editor',
      })
      expect(result.success).toBe(true)
    })

    it('rejects invalid role values', () => {
      const result = roleChangeSchema.safeParse({
        targetUserId: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
        newRole: 'root_admin',
      })
      expect(result.success).toBe(false)
    })
  })
})
