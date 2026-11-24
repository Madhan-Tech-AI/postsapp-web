import React from 'react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getAuthenticatedUserProfile } from '@/lib/supabase/server'
import { getCategoryGroups } from '@/modules/admin/categories.service'
import { CategoriesClient } from './categories-client'

export const metadata: Metadata = {
  title: 'Category Management | PostsApp Admin',
  robots: { index: false, follow: false },
}

export default async function AdminCategoriesPage() {
  const profile = await getAuthenticatedUserProfile()

  // Guard: Only SuperAdmin can configure categories
  if (!profile || profile.role !== 'super_admin') {
    redirect('/admin')
  }

  const groups = await getCategoryGroups()

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
          Category Directory
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Manage paired bilingual categories across English and Tamil editions
        </p>
      </div>

      <CategoriesClient initialGroups={groups} />
    </div>
  )
}
