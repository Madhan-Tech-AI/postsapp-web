import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getAuthenticatedUserProfile } from '@/lib/supabase/server'
import { getMediaLibraryItems } from '@/modules/media/media.service'
import { MediaClient } from './media-client'

export const metadata: Metadata = {
  title: 'Media Library | PostsApp Editorial',
  robots: { index: false, follow: false },
}

interface MediaPageProps {
  searchParams: Promise<{ page?: string }>
}

export default async function AdminMediaPage({ searchParams }: MediaPageProps) {
  const profile = await getAuthenticatedUserProfile()
  if (!profile || !['author', 'editor', 'super_admin'].includes(profile.role)) {
    redirect('/admin/login')
  }

  const resolvedParams = await searchParams
  const page = parseInt(resolvedParams.page || '1', 10)

  const { items, totalCount } = await getMediaLibraryItems({
    role: profile.role,
    currentUserId: profile.id,
    page,
    limit: 30,
  })

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <MediaClient
        initialItems={items}
        totalCount={totalCount}
        currentPage={page}
        userRole={profile.role}
        currentUserId={profile.id}
      />
    </div>
  )
}
