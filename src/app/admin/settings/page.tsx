import React from 'react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getAuthenticatedUserProfile } from '@/lib/supabase/server'
import { getAllSiteSettings } from '@/modules/admin/settings.service'
import { SettingsClient } from './settings-client'

export const metadata: Metadata = {
  title: 'Site Settings | PostsApp Admin',
  robots: { index: false, follow: false },
}

export default async function AdminSettingsPage() {
  const profile = await getAuthenticatedUserProfile()

  // Guard: Only SuperAdmins can modify global site settings
  if (!profile || profile.role !== 'super_admin') {
    redirect('/admin')
  }

  const settings = await getAllSiteSettings()

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
          Site Settings
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Manage publication branding, breaking news ticker, default language, and domain configuration
        </p>
      </div>

      <SettingsClient initialSettings={settings} />
    </div>
  )
}
