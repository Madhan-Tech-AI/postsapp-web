import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getAuthenticatedUserProfile } from '@/lib/supabase/server'
import {
  getEditorialArticleById,
  getCategoriesByLanguage,
  getTagsByLanguage,
} from '@/modules/articles/articles.service'
import { EditorClient } from './editor-client'

export const metadata: Metadata = {
  title: 'Edit Article | PostsApp Editorial',
  robots: { index: false, follow: false },
}

interface EditArticlePageProps {
  params: Promise<{ id: string }>
}

export default async function EditArticlePage({ params }: EditArticlePageProps) {
  const profile = await getAuthenticatedUserProfile()
  if (!profile || !['author', 'editor', 'super_admin'].includes(profile.role)) {
    redirect('/admin/login')
  }

  const { id } = await params
  const article = await getEditorialArticleById(id, profile.id, profile.role)

  if (!article) {
    notFound()
  }

  const categories = await getCategoriesByLanguage(article.language)
  const tags = await getTagsByLanguage(article.language)

  return (
    <div className="p-4 sm:p-6 max-w-[1600px] mx-auto">
      <EditorClient
        initialArticle={article}
        userRole={profile.role}
        currentUserId={profile.id}
        categories={categories}
        tags={tags}
      />
    </div>
  )
}
