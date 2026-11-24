'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { getAuthenticatedUserProfile } from '@/lib/supabase/server'
import {
  createArticleDraft,
  updateArticle,
  archiveArticle,
  deleteArticle,
} from './articles.service'
import { publishArticle, unpublishArticle } from './publishing.service'
import type { LanguageCode } from '@/lib/schemas'

export interface ArticleActionResult {
  success: boolean
  articleId?: string
  error?: string
}

export async function createDraftAction(
  prevState: any,
  formData: FormData
): Promise<ArticleActionResult> {
  const profile = await getAuthenticatedUserProfile()
  if (!profile || !['author', 'editor', 'super_admin'].includes(profile.role)) {
    return { success: false, error: 'Unauthorized' }
  }

  const title = (formData.get('title') as string) || ''
  const subtitle = (formData.get('subtitle') as string) || null
  const shortDescription = (formData.get('shortDescription') as string) || null
  const slug = (formData.get('slug') as string) || ''
  const language = (formData.get('language') as LanguageCode) || 'en'
  const coverImagePath = (formData.get('coverImagePath') as string) || null
  const coverImageAlt = (formData.get('coverImageAlt') as string) || null
  const categoryId = (formData.get('categoryId') as string) || undefined
  const translationGroupId = (formData.get('translationGroupId') as string) || undefined
  const contentJsonRaw = formData.get('contentJson') as string

  let contentJson = { type: 'doc', content: [] }
  if (contentJsonRaw) {
    try {
      contentJson = JSON.parse(contentJsonRaw)
    } catch {
      return { success: false, error: 'Invalid content format' }
    }
  }

  const result = await createArticleDraft(profile.id, {
    title,
    subtitle,
    shortDescription,
    slug,
    language,
    contentJson,
    coverImagePath,
    coverImageAlt,
    categoryId,
    translationGroupId,
  })

  if (result.success && result.articleId) {
    revalidatePath('/admin/articles')
    redirect(`/admin/articles/${result.articleId}/edit`)
  }

  return result
}

export async function updateArticleAction(
  articleId: string,
  prevState: any,
  formData: FormData
): Promise<ArticleActionResult> {
  const profile = await getAuthenticatedUserProfile()
  if (!profile || !['author', 'editor', 'super_admin'].includes(profile.role)) {
    return { success: false, error: 'Unauthorized' }
  }

  const title = (formData.get('title') as string) || ''
  const subtitle = (formData.get('subtitle') as string) || null
  const shortDescription = (formData.get('shortDescription') as string) || null
  const slug = (formData.get('slug') as string) || ''
  const coverImagePath = (formData.get('coverImagePath') as string) || null
  const coverImageAlt = (formData.get('coverImageAlt') as string) || null
  const categoryId = (formData.get('categoryId') as string) || undefined
  const contentJsonRaw = formData.get('contentJson') as string

  let contentJson = { type: 'doc', content: [] }
  if (contentJsonRaw) {
    try {
      contentJson = JSON.parse(contentJsonRaw)
    } catch {
      return { success: false, error: 'Invalid content format' }
    }
  }

  const result = await updateArticle(articleId, profile.id, profile.role, {
    title,
    subtitle,
    shortDescription,
    slug,
    contentJson,
    coverImagePath,
    coverImageAlt,
    categoryId,
  })

  if (result.success) {
    revalidatePath('/admin/articles')
  }

  return result
}

export async function archiveArticleAction(articleId: string): Promise<ArticleActionResult> {
  const profile = await getAuthenticatedUserProfile()
  if (!profile || !['author', 'editor', 'super_admin'].includes(profile.role)) {
    return { success: false, error: 'Unauthorized' }
  }

  const result = await archiveArticle(articleId, profile.id, profile.role)
  if (result.success) {
    revalidatePath('/admin/articles')
  }
  return result
}

export async function deleteArticleAction(articleId: string): Promise<ArticleActionResult> {
  const profile = await getAuthenticatedUserProfile()
  if (!profile || !['author', 'editor', 'super_admin'].includes(profile.role)) {
    return { success: false, error: 'Unauthorized' }
  }

  const result = await deleteArticle(articleId, profile.id, profile.role)
  if (result.success) {
    revalidatePath('/admin/articles')
  }
  return result
}

export async function publishArticleAction(
  articleId: string,
  note?: string
): Promise<ArticleActionResult> {
  const profile = await getAuthenticatedUserProfile()
  if (!profile || !['author', 'editor', 'super_admin'].includes(profile.role)) {
    return { success: false, error: 'Unauthorized' }
  }

  const result = await publishArticle(articleId, profile.id, note)
  if (result.success) {
    revalidatePath('/admin/articles')
  }
  return result
}

export async function unpublishArticleAction(
  articleId: string,
  note?: string
): Promise<ArticleActionResult> {
  const profile = await getAuthenticatedUserProfile()
  if (!profile || !['author', 'editor', 'super_admin'].includes(profile.role)) {
    return { success: false, error: 'Unauthorized' }
  }

  const result = await unpublishArticle(articleId, profile.id, note)
  if (result.success) {
    revalidatePath('/admin/articles')
  }
  return result
}
