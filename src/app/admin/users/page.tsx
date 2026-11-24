import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getAuthenticatedUserProfile } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { UsersClient } from './users-client'
import type { Database } from '@/lib/database.types'

export const metadata: Metadata = {
  title: 'Users & Roles | PostsApp Admin',
  robots: { index: false, follow: false },
}

export default async function AdminUsersPage() {
  const profile = await getAuthenticatedUserProfile()

  // Guard: Only SuperAdmins can manage users and roles
  if (!profile || profile.role !== 'super_admin') {
    redirect('/admin')
  }

  const adminClient = createSupabaseAdminClient()

  // Fetch all profiles ordered by creation date
  const { data } = await adminClient
    .from('profiles')
    .select('id, display_name, avatar_url, role, is_active, preferred_language, created_at, updated_at')
    .order('created_at', { ascending: false })

  const profiles = (data ?? []) as Database['public']['Tables']['profiles']['Row'][]

  // Fetch auth users to get emails for display
  const { data: authData } = await adminClient.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  })

  const emailMap = new Map<string, string>()
  authData?.users?.forEach((u) => {
    if (u.email) emailMap.set(u.id, u.email)
  })

  const enrichedUsers = profiles.map((p) => ({
    ...p,
    email: emailMap.get(p.id) || 'N/A',
  }))

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <UsersClient initialUsers={enrichedUsers} currentUserId={profile.id} />
    </div>
  )
}
