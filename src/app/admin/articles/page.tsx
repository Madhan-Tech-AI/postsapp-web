import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getAuthenticatedUserProfile } from '@/lib/supabase/server'
import { getEditorialArticles, getCategoriesByLanguage } from '@/modules/articles/articles.service'
import { ArticlesListClient } from './article-list-client'
import type { LanguageCode, ArticleStatus } from '@/lib/schemas'

export const metadata: Metadata = {
  title: 'Articles | PostsApp Editorial',
  robots: { index: false, follow: false },
}

interface AdminArticlesPageProps {
  searchParams: Promise<{
    language?: LanguageCode
    status?: ArticleStatus
    search?: string
    page?: string
  }>
}

export default async function AdminArticlesPage({ searchParams }: AdminArticlesPageProps) {
  const profile = await getAuthenticatedUserProfile()
  if (!profile || !['author', 'editor', 'super_admin'].includes(profile.role)) {
    redirect('/admin/login')
  }

  const resolvedParams = await searchParams
  const page = parseInt(resolvedParams.page || '1', 10)
  const language = resolvedParams.language
  const status = resolvedParams.status
  const search = resolvedParams.search

  // Fetch articles scoped to role (Authors see own; Editor/SuperAdmin see all)
  const { articles, totalCount } = await getEditorialArticles({
    role: profile.role,
    currentUserId: profile.id,
    language,
    status,
    search,
    page,
    limit: 20,
  })

  // Fetch categories for filter dropdown
  const categoriesEn = await getCategoriesByLanguage('en')
  const categoriesTa = await getCategoriesByLanguage('ta')

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <ArticlesListClient
        initialArticles={articles}
        totalCount={totalCount}
        currentPage={page}
        userRole={profile.role}
        categories={[...categoriesEn, ...categoriesTa]}
      />
    </div>
  )
}
