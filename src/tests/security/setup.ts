/**
 * Security test suite setup
 * Runs against a local Supabase instance with real RLS enforcement.
 *
 * Environment requirements:
 *   NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=<local-anon-key>
 *   SUPABASE_SERVICE_ROLE_KEY=<local-service-key>
 *
 * These tests verify that RLS policies block unauthorized access
 * even with direct Supabase REST API calls (bypassing Next.js).
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/database.types'

// Test user credentials (created by beforeAll in each test file)
export const TEST_USERS = {
  superAdmin: {
    email: 'superadmin@test.postsapp.in',
    password: 'SuperAdmin123!',
    role: 'super_admin' as const,
  },
  editor: {
    email: 'editor@test.postsapp.in',
    password: 'Editor1234!',
    role: 'editor' as const,
  },
  authorA: {
    email: 'authora@test.postsapp.in',
    password: 'AuthorA123!',
    role: 'author' as const,
  },
  authorB: {
    email: 'authorb@test.postsapp.in',
    password: 'AuthorB123!',
    role: 'author' as const,
  },
  reader: {
    email: 'reader@test.postsapp.in',
    password: 'Reader123!',
    role: 'reader' as const,
  },
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

/** Privileged client for test setup (bypasses RLS) */
export function getAdminClient(): SupabaseClient<Database> {
  return createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/** Anon client (no session) */
export function getAnonClient(): SupabaseClient<Database> {
  return createClient<Database>(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/** Create an authenticated client for a specific test user */
export async function getAuthenticatedClient(
  email: string,
  password: string
): Promise<SupabaseClient<Database>> {
  const client = createClient<Database>(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`Test auth failed for ${email}: ${error.message}`)
  return client
}

/** Setup: create test users via admin API and assign roles */
export async function setupTestUsers() {
  const admin = getAdminClient()

  for (const [key, user] of Object.entries(TEST_USERS)) {
    // Create auth user
    const { data, error } = await admin.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: { display_name: `Test ${user.role}` },
    })

    if (error && !error.message.includes('already registered')) {
      throw new Error(`Failed to create test user ${user.email}: ${error.message}`)
    }

    const userId = data?.user?.id
    if (!userId) continue

    // Set role (bypass trigger which always sets 'reader')
    if (user.role !== 'reader') {
      await admin
        .from('profiles')
        .update({ role: user.role })
        .eq('id', userId)
    }
  }
}

/** Teardown: clean up test users */
export async function teardownTestUsers() {
  const admin = getAdminClient()
  for (const user of Object.values(TEST_USERS)) {
    const { data } = await admin.auth.admin.listUsers()
    const found = data?.users.find(u => u.email === user.email)
    if (found) {
      await admin.auth.admin.deleteUser(found.id)
    }
  }
}
