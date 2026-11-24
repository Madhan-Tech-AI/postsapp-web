import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getAuthenticatedUserProfile } from '@/lib/supabase/server'
import { LoginForm } from '@/modules/auth/components/login-form'

export const metadata: Metadata = {
  title: 'Editorial Login | PostsApp',
  robots: { index: false, follow: false },
}

export default async function AdminLoginPage() {
  // If already authenticated with editorial role, redirect to admin dashboard
  const profile = await getAuthenticatedUserProfile()
  if (profile && ['author', 'editor', 'super_admin'].includes(profile.role)) {
    redirect('/admin')
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-900">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-3xl font-extrabold text-white tracking-tight">
            Posts<span className="text-primary-500">App</span>
          </span>
          <span className="ml-2 px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-primary-600/30 text-primary-400 border border-primary-500/30 rounded">
            Editorial CMS
          </span>
        </div>
        <LoginForm isAdmin={true} />
      </div>
    </div>
  )
}
