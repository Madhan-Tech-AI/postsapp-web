/**
 * Supabase SSR client for server components, route handlers, and server actions.
 * Uses @supabase/ssr with HTTP-only cookies.
 * Sessions are verified server-side with getUser() — never by decoding the cookie.
 */
import 'server-only'

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/lib/database.types'

export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, {
                ...options,
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
              })
            )
          } catch {
            // Server component — cookies can only be set in middleware or route handlers
          }
        },
      },
    }
  )
}

/**
 * Get the authenticated user from the server.
 * Uses getUser() (server-side verification) — never trusts decoded cookies.
 */
export async function getAuthenticatedUser() {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user
}

/**
 * Get the authenticated user's profile (includes role).
 * Returns null if unauthenticated or profile not found.
 */
export async function getAuthenticatedUserProfile() {
  const user = await getAuthenticatedUser()
  if (!user) return null

  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, role, is_active, preferred_language')
    .eq('id', user.id)
    .single()

  const profile = data as Database['public']['Tables']['profiles']['Row'] | null
  if (!profile || !profile.is_active) return null
  return profile
}
