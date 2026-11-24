/**
 * Auth Domain Service
 *
 * Implements business logic for reader and staff authentication:
 * - Reader sign-up (hardcoded 'reader' role)
 * - Reader sign-in (verifies active status & confirmed email)
 * - Password reset & update
 * - Account profile management
 * - Account deletion (cascades to profile and likes; audit log preserved)
 * - SuperAdmin user & role management (invite staff, change role, toggle active)
 */
import 'server-only'

import { createSupabaseServerClient, getAuthenticatedUser } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  updatePasswordSchema,
  resetPasswordSchema,
  type UserRole,
  type LanguageCode,
} from '@/lib/schemas'

export interface AuthActionResult<T = unknown> {
  success: boolean
  message?: string
  data?: T
  error?: string
}

/**
 * Register a new reader.
 * Note: Role is ALWAYS 'reader'. Public sign-ups can NEVER get editorial privileges.
 * Returns generic success message to prevent user enumeration.
 */
export async function registerReader(input: {
  email: string
  password: string
  displayName: string
  preferredLanguage?: LanguageCode
}): Promise<AuthActionResult> {
  const parsed = registerSchema.safeParse(input)
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || 'Invalid registration details',
    }
  }

  const { email, password, displayName, preferredLanguage } = parsed.data
  const supabase = await createSupabaseServerClient()

  // Sign up with Supabase Auth
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
        preferred_language: preferredLanguage,
      },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://postsapp.in'}/api/auth/callback`,
    },
  })

  if (error) {
    // Generic error to prevent email enumeration where possible
    if (error.message.toLowerCase().includes('already registered')) {
      // Don't leak; pretend email confirmation was sent
      return {
        success: true,
        message: 'If an account exists with this email, a verification link has been sent.',
      }
    }
    return { success: false, error: error.message }
  }

  return {
    success: true,
    message: 'Registration successful! Please check your email to verify your account.',
    data: { userId: data.user?.id },
  }
}

/**
 * Log in with email and password.
 * Checks that the user is confirmed and profile is active.
 */
export async function loginWithPassword(input: {
  email: string
  password: string
}): Promise<AuthActionResult<{ role: UserRole; displayName: string }>> {
  const parsed = loginSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: 'Invalid email or password format' }
  }

  const { email, password } = parsed.data
  const supabase = await createSupabaseServerClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { success: false, error: 'Invalid email or password' }
  }

  if (!data.user) {
    return { success: false, error: 'Authentication failed' }
  }

  // Verify email confirmed
  if (!data.user.email_confirmed_at) {
    await supabase.auth.signOut()
    return {
      success: false,
      error: 'Please verify your email address before logging in.',
    }
  }

  // Check profile active status
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active, display_name')
    .eq('id', data.user.id)
    .single()

  const typedProfile = profile as { role: UserRole; is_active: boolean; display_name: string } | null

  if (!typedProfile || !typedProfile.is_active) {
    await supabase.auth.signOut()
    return {
      success: false,
      error: 'This account has been deactivated. Please contact support.',
    }
  }

  return {
    success: true,
    data: {
      role: typedProfile.role,
      displayName: typedProfile.display_name,
    },
  }
}

/**
 * Log out the current user and invalidate cookies.
 */
export async function logoutUser(): Promise<AuthActionResult> {
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()
  return { success: true }
}

/**
 * Request password reset email.
 * Always returns a generic success message to prevent user enumeration.
 */
export async function requestPasswordReset(email: string): Promise<AuthActionResult> {
  const parsed = resetPasswordSchema.safeParse({ email })
  if (!parsed.success) {
    return { success: false, error: 'Invalid email address' }
  }

  const supabase = await createSupabaseServerClient()
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://postsapp.in'}/auth/reset-password`,
  })

  // Always return success to prevent email discovery
  return {
    success: true,
    message: 'If an account exists with this email, password reset instructions have been sent.',
  }
}

/**
 * Update password for the currently authenticated user.
 */
export async function updateCurrentUserPassword(newPassword: string): Promise<AuthActionResult> {
  const parsed = updatePasswordSchema.safeParse({ password: newPassword })
  if (!parsed.success) {
    return {
      success: false,
      error: 'Password must be at least 10 characters and contain letters and numbers',
    }
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, message: 'Password updated successfully' }
}

/**
 * Update authenticated user's profile details.
 */
export async function updateCurrentUserProfile(input: {
  displayName?: string
  preferredLanguage?: LanguageCode
  avatarUrl?: string | null
}): Promise<AuthActionResult> {
  const user = await getAuthenticatedUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const parsed = updateProfileSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || 'Invalid profile data' }
  }

  const supabase = await createSupabaseServerClient()
  const { error } = await (supabase.from('profiles') as any)
    .update({
      ...(parsed.data.displayName && { display_name: parsed.data.displayName }),
      ...(parsed.data.preferredLanguage && { preferred_language: parsed.data.preferredLanguage }),
      ...(parsed.data.avatarUrl !== undefined && { avatar_url: parsed.data.avatarUrl }),
    })
    .eq('id', user.id)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, message: 'Profile updated successfully' }
}

/**
 * Account Deletion:
 * Completely removes the reader's auth account and personal data.
 * Due to ON DELETE CASCADE on profiles and article_likes, all reader data is purged.
 * Audit logs actor_id becomes NULL, maintaining audit integrity.
 */
export async function deleteCurrentAccount(): Promise<AuthActionResult> {
  const user = await getAuthenticatedUser()
  if (!user) return { success: false, error: 'Unauthorized' }

  const adminClient = createSupabaseAdminClient()

  // Prevent last SuperAdmin from deleting themselves
  const { data: profile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const typedProfile = profile as { role: UserRole } | null
  if (typedProfile?.role === 'super_admin') {
    const { count } = await adminClient
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'super_admin')
      .eq('is_active', true)

    if ((count ?? 0) <= 1) {
      return {
        success: false,
        error: 'Cannot delete the sole SuperAdmin account. Assign another SuperAdmin first.',
      }
    }
  }

  // Write audit log entry before deletion
  await adminClient.from('audit_logs').insert({
    actor_id: user.id,
    action: 'user_delete',
    target_type: 'user',
    target_id: user.id,
    metadata: { reason: 'User requested self-deletion' },
  })

  // Delete from auth.users (cascades to profile, likes, author_profile)
  const { error } = await adminClient.auth.admin.deleteUser(user.id)
  if (error) {
    return { success: false, error: 'Failed to delete account. Please try again.' }
  }

  // Sign out locally
  const supabase = await createSupabaseServerClient()
  await supabase.auth.signOut()

  return { success: true, message: 'Your account has been permanently deleted.' }
}

// ============================================================
// SuperAdmin User & Role Management
// ============================================================

/**
 * Invite a new staff user (Author or Editor) via email link.
 * Plaintext passwords are NEVER generated, stored, or emailed.
 */
export async function inviteStaffMember(input: {
  email: string
  displayName: string
  role: 'author' | 'editor' | 'super_admin'
}): Promise<AuthActionResult> {
  const actor = await getAuthenticatedUser()
  if (!actor) return { success: false, error: 'Unauthorized' }

  const adminClient = createSupabaseAdminClient()

  // Check actor role
  const { data: actorProfile } = await adminClient
    .from('profiles')
    .select('role, is_active')
    .eq('id', actor.id)
    .single()

  const typedActor = actorProfile as { role: UserRole; is_active: boolean } | null
  if (!typedActor?.is_active || typedActor.role !== 'super_admin') {
    return { success: false, error: 'Only SuperAdmins can invite staff members' }
  }

  const email = input.email.trim().toLowerCase()
  const displayName = input.displayName.trim()

  // Invite user via Supabase Auth Admin API (sends invite / set-password email)
  const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
    email,
    {
      data: { display_name: displayName },
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://postsapp.in'}/admin/reset-password`,
    }
  )

  if (inviteError || !inviteData.user) {
    return { success: false, error: inviteError?.message || 'Failed to send invite' }
  }

  const newUserId = inviteData.user.id

  // Update profile role and display name
  await adminClient
    .from('profiles')
    .update({
      role: input.role,
      display_name: displayName,
    })
    .eq('id', newUserId)

  // Write audit log
  await adminClient.from('audit_logs').insert({
    actor_id: actor.id,
    action: 'user_invite',
    target_type: 'user',
    target_id: newUserId,
    metadata: {
      email,
      role: input.role,
      display_name: displayName,
    },
  })

  return {
    success: true,
    message: `Invitation sent to ${email} with role ${input.role}.`,
  }
}

/**
 * Change a user's role (SuperAdmin only).
 * Protects the last remaining SuperAdmin from demotion.
 */
export async function changeUserRole(
  targetUserId: string,
  newRole: UserRole
): Promise<AuthActionResult> {
  const actor = await getAuthenticatedUser()
  if (!actor) return { success: false, error: 'Unauthorized' }

  const adminClient = createSupabaseAdminClient()

  // Check actor role
  const { data: actorProfile } = await adminClient
    .from('profiles')
    .select('role, is_active')
    .eq('id', actor.id)
    .single()

  const typedActor = actorProfile as { role: UserRole; is_active: boolean } | null
  if (!typedActor?.is_active || typedActor.role !== 'super_admin') {
    return { success: false, error: 'Only SuperAdmins can change roles' }
  }

  // Get target user current profile
  const { data: targetProfile } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', targetUserId)
    .single()

  const typedTarget = targetProfile as { role: UserRole } | null
  if (!typedTarget) {
    return { success: false, error: 'User not found' }
  }

  // Last SuperAdmin demotion check
  if (typedTarget.role === 'super_admin' && newRole !== 'super_admin') {
    const { count } = await adminClient
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('role', 'super_admin')
      .eq('is_active', true)

    if ((count ?? 0) <= 1) {
      return {
        success: false,
        error: 'Cannot demote the last remaining active SuperAdmin',
      }
    }
  }

  // Update role
  const { error: updateError } = await adminClient
    .from('profiles')
    .update({ role: newRole })
    .eq('id', targetUserId)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  // Write audit log
  await adminClient.from('audit_logs').insert({
    actor_id: actor.id,
    action: 'role_change',
    target_type: 'user',
    target_id: targetUserId,
    metadata: {
      old_role: typedTarget.role,
      new_role: newRole,
    },
  })

  return { success: true, message: `Role updated to ${newRole}` }
}

/**
 * Toggle a user's active status (SuperAdmin only).
 * Prevents deactivating the last active SuperAdmin.
 */
export async function toggleUserActive(
  targetUserId: string,
  isActive: boolean
): Promise<AuthActionResult> {
  const actor = await getAuthenticatedUser()
  if (!actor) return { success: false, error: 'Unauthorized' }

  const adminClient = createSupabaseAdminClient()

  // Check actor role
  const { data: actorProfile } = await adminClient
    .from('profiles')
    .select('role, is_active')
    .eq('id', actor.id)
    .single()

  const typedActor = actorProfile as { role: UserRole; is_active: boolean } | null
  if (!typedActor?.is_active || typedActor.role !== 'super_admin') {
    return { success: false, error: 'Only SuperAdmins can manage active status' }
  }

  // Last SuperAdmin deactivation guard
  if (!isActive) {
    const { data: targetProfile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', targetUserId)
      .single()

    const typedTarget = targetProfile as { role: UserRole } | null
    if (typedTarget?.role === 'super_admin') {
      const { count } = await adminClient
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'super_admin')
        .eq('is_active', true)

      if ((count ?? 0) <= 1) {
        return {
          success: false,
          error: 'Cannot deactivate the last remaining active SuperAdmin',
        }
      }
    }
  }

  const { error: updateError } = await adminClient
    .from('profiles')
    .update({ is_active: isActive })
    .eq('id', targetUserId)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  // Write audit log
  await adminClient.from('audit_logs').insert({
    actor_id: actor.id,
    action: isActive ? 'user_activate' : 'user_deactivate',
    target_type: 'user',
    target_id: targetUserId,
    metadata: { is_active: isActive },
  })

  return {
    success: true,
    message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
  }
}
