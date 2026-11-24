import React from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAuthenticatedUserProfile } from '@/lib/supabase/server'
import { logoutAction } from '@/modules/auth/actions'

interface AdminLayoutProps {
  children: React.ReactNode
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const profile = await getAuthenticatedUserProfile()

  // Guard: editorial workspace requires stored staff role
  if (!profile || !['author', 'editor', 'super_admin'].includes(profile.role)) {
    redirect('/admin/login')
  }

  const isSuperAdmin = profile.role === 'super_admin'
  const isEditor = profile.role === 'editor' || isSuperAdmin

  const navLinks = [
    { label: 'Analytics', href: '/admin/analytics', icon: '📊', show: true },
    { label: 'Articles', href: '/admin/articles', icon: '📰', show: true },
    { label: 'Media Library', href: '/admin/media', icon: '🖼️', show: true },
    { label: 'Categories', href: '/admin/categories', icon: '🏷️', show: isSuperAdmin },
    { label: 'Users & Roles', href: '/admin/users', icon: '👥', show: isSuperAdmin },
    { label: 'Site Settings', href: '/admin/settings', icon: '⚙️', show: isSuperAdmin },
    { label: 'Audit Logs', href: '/admin/audit-logs', icon: '🛡️', show: isEditor },
  ]

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col shrink-0">
        <div className="p-5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <Link href="/admin/analytics" className="flex items-center space-x-2">
            <span className="font-black text-xl text-primary-600">PostsApp</span>
            <span className="text-[10px] font-bold bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-300 px-1.5 py-0.5 rounded uppercase">
              CMS
            </span>
          </Link>
        </div>

        {/* User Info Card */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center space-x-3 bg-gray-50/50 dark:bg-gray-900/50">
          <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 font-bold flex items-center justify-center text-sm">
            {profile.display_name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold truncate">{profile.display_name}</p>
            <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-gray-500 bg-gray-200 dark:bg-gray-800 px-1.5 py-0.2 rounded">
              {profile.role.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="p-3 space-y-1 flex-1 overflow-y-auto">
          {navLinks
            .filter((item) => item.show)
            .map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
        </nav>

        {/* Bottom Utility Bar */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-2">
          <Link
            href="/en"
            target="_blank"
            className="flex items-center justify-center space-x-1.5 w-full py-2 px-3 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <span>Public Site</span>
            <span>↗</span>
          </Link>

          <form action={logoutAction}>
            <button
              type="submit"
              className="w-full py-2 px-3 text-xs font-semibold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors text-center"
            >
              Log Out
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto min-h-screen">
        {children}
      </main>
    </div>
  )
}
