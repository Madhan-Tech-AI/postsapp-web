'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { checkRateLimit, getClientIp } from '@/lib/rate-limiter'
import {
  registerReader,
  loginWithPassword,
  logoutUser,
  requestPasswordReset,
  updateCurrentUserPassword,
  updateCurrentUserProfile,
  deleteCurrentAccount,
  inviteStaffMember,
  changeUserRole,
  toggleUserActive,
  type AuthActionResult,
} from './auth.service'
import type { UserRole, LanguageCode } from '@/lib/schemas'
import { sanitizeRedirectUrl } from '@/lib/utils'

export async function registerAction(
  prevState: any,
  formData: FormData
): Promise<AuthActionResult> {
  const headerList = await headers()
  const ip = getClientIp(headerList)

  // Rate limit: 10 registrations per hour per IP
  const rateLimit = await checkRateLimit(`auth:register:${ip}`, 10, 3600)
  if (!rateLimit.success) {
    return {
      success: false,
      error: 'Too many registration attempts. Please try again later.',
    }
  }

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const displayName = formData.get('displayName') as string
  const preferredLanguage = (formData.get('preferredLanguage') as LanguageCode) || 'en'

  return await registerReader({
    email,
    password,
    displayName,
    preferredLanguage,
  })
}

export async function loginAction(
  prevState: any,
  formData: FormData
): Promise<AuthActionResult> {
  const headerList = await headers()
  const ip = getClientIp(headerList)
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const password = formData.get('password') as string
  const next = formData.get('next') as string

  // Rate limit: 10 login attempts per hour per IP and per email
  const ipLimit = await checkRateLimit(`auth:login:ip:${ip}`, 15, 3600)
  const emailLimit = await checkRateLimit(`auth:login:email:${email}`, 10, 3600)

  if (!ipLimit.success || !emailLimit.success) {
    return {
      success: false,
      error: 'Too many failed login attempts. Please try again later.',
    }
  }

  const result = await loginWithPassword({ email, password })
  if (!result.success) {
    return result
  }

  // Redirect based on role and next parameter
  const userRole = result.data?.role
  let targetUrl = '/'
  if (['author', 'editor', 'super_admin'].includes(userRole || '')) {
    targetUrl = sanitizeRedirectUrl(next, '/admin')
  } else {
    targetUrl = sanitizeRedirectUrl(next, '/en')
  }

  redirect(targetUrl)
}

export async function logoutAction(): Promise<void> {
  await logoutUser()
  redirect('/en')
}

export async function forgotPasswordAction(
  prevState: any,
  formData: FormData
): Promise<AuthActionResult> {
  const headerList = await headers()
  const ip = getClientIp(headerList)

  const rateLimit = await checkRateLimit(`auth:reset:${ip}`, 5, 3600)
  if (!rateLimit.success) {
    return {
      success: false,
      error: 'Too many password reset requests. Please try again later.',
    }
  }

  const email = formData.get('email') as string
  return await requestPasswordReset(email)
}

export async function updatePasswordAction(
  prevState: any,
  formData: FormData
): Promise<AuthActionResult> {
  const password = formData.get('password') as string
  return await updateCurrentUserPassword(password)
}

export async function updateProfileAction(
  prevState: any,
  formData: FormData
): Promise<AuthActionResult> {
  const displayName = formData.get('displayName') as string
  const preferredLanguage = formData.get('preferredLanguage') as LanguageCode

  const result = await updateCurrentUserProfile({
    displayName,
    preferredLanguage,
  })

  if (result.success) {
    revalidatePath('/[locale]/profile', 'page')
  }

  return result
}

export async function deleteAccountAction(): Promise<AuthActionResult> {
  const result = await deleteCurrentAccount()
  if (result.success) {
    redirect('/en?notice=account_deleted')
  }
  return result
}

export async function inviteStaffAction(
  prevState: any,
  formData: FormData
): Promise<AuthActionResult> {
  const email = formData.get('email') as string
  const displayName = formData.get('displayName') as string
  const role = formData.get('role') as 'author' | 'editor' | 'super_admin'

  const result = await inviteStaffMember({ email, displayName, role })
  if (result.success) {
    revalidatePath('/admin/users')
  }
  return result
}

export async function changeRoleAction(
  targetUserId: string,
  newRole: UserRole
): Promise<AuthActionResult> {
  const result = await changeUserRole(targetUserId, newRole)
  if (result.success) {
    revalidatePath('/admin/users')
  }
  return result
}

export async function toggleActiveAction(
  targetUserId: string,
  isActive: boolean
): Promise<AuthActionResult> {
  const result = await toggleUserActive(targetUserId, isActive)
  if (result.success) {
    revalidatePath('/admin/users')
  }
  return result
}
