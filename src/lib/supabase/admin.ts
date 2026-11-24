/**
 * server-only Supabase client — privileged (service-role key)
 *
 * IMPORTANT: This module is marked 'server-only'.
 * Importing it from any client component or NEXT_PUBLIC_ path will
 * fail the build, preventing accidental key exposure.
 *
 * Usage: import { createSupabaseServerClient } from '@/lib/supabase/server'
 */
import 'server-only'

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  throw new Error('Missing env: NEXT_PUBLIC_SUPABASE_URL')
}
if (!supabaseServiceRoleKey) {
  throw new Error(
    'Missing env: SUPABASE_SERVICE_ROLE_KEY — this key must NEVER be in NEXT_PUBLIC_ variables'
  )
}

/**
 * Privileged Supabase client for server-side operations.
 * Bypasses RLS — use only for trusted server actions.
 * Never pass this client's token to the browser.
 */
export function createSupabaseAdminClient() {
  return createClient<Database>(supabaseUrl!, supabaseServiceRoleKey!, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
