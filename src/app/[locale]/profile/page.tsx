import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getAuthenticatedUser } from '@/lib/supabase/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { ProfileForm } from '@/modules/auth/components/profile-form'
import type { Database } from '@/lib/database.types'

interface ProfilePageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Account Profile',
    robots: { index: false, follow: false },
  }
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { locale } = await params
  const user = await getAuthenticatedUser()

  if (!user) {
    redirect(`/${locale}/auth/login?next=/${locale}/profile`)
  }

  const supabase = await createSupabaseServerClient()
  const { data } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, role, preferred_language, created_at')
    .eq('id', user.id)
    .single()

  const profile = data as Database['public']['Tables']['profiles']['Row'] | null

  if (!profile) {
    redirect(`/${locale}/auth/login`)
  }

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-950">
      <ProfileForm
        initialProfile={profile}
        userEmail={user.email ?? ''}
        locale={locale}
      />
    </div>
  )
}
