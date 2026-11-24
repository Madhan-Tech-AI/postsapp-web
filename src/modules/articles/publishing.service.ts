/**
 * Publishing Engine Service
 *
 * Implements Section 8:
 * - Pre-publish validation checklist (title, short description, slug, cover image, category, TipTap AST)
 * - Single atomic database transaction (Postgres stored procedure)
 * - Cache invalidation: revalidates article page, category page, homepage, sitemaps
 */
import 'server-only'

import { revalidatePath } from 'next/cache'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { articlePublishSchema, type UserRole, type LanguageCode } from '@/lib/schemas'

export interface PublishValidationResult {
  canPublish: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Validate an article before publishing against mandatory publication rules
 */
export function validateArticleForPublishing(article: {
  title?: string | null
  shortDescription?: string | null
  slug?: string | null
  coverImagePath?: string | null
  categoryId?: string | null
  contentJson?: any
  language?: LanguageCode
}): PublishValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  if (!article.title || article.title.trim().length === 0) {
    errors.push('Title / headline is required.')
  } else if (article.title.trim().length < 5) {
    warnings.push('Title is very short (recommended: 20+ characters).')
  }

  if (!article.shortDescription || article.shortDescription.trim().length === 0) {
    errors.push('Short description (card summary) is required.')
  }

  if (!article.slug || !/^[a-z0-9-]+$/.test(article.slug)) {
    errors.push('Valid URL slug (lowercase letters, numbers, hyphens) is required.')
  }

  if (!article.coverImagePath || article.coverImagePath.trim().length === 0) {
    errors.push('Featured cover image is required.')
  }

  if (!article.categoryId) {
    errors.push('Primary category must be selected.')
  }

  const content = article.contentJson
  if (!content || !Array.isArray(content.content) || content.content.length === 0) {
    errors.push('Article content cannot be empty.')
  }

  return {
    canPublish: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Publish an article in a single atomic transaction.
 * Step 1-7 handled in Postgres stored procedure `publish_article_transaction`.
 * Step 8: ISR cache invalidation.
 */
export async function publishArticle(
  articleId: string,
  actorId: string,
  note?: string
): Promise<{ success: boolean; error?: string }> {
  const adminClient = createSupabaseAdminClient()

  // 1. Fetch article to run preliminary checks
  const { data: article } = await adminClient
    .from('articles')
    .select('*')
    .eq('id', articleId)
    .single()

  if (!article) return { success: false, error: 'Article not found' }

  const { data: primaryCatRow } = await adminClient
    .from('article_categories')
    .select('category_id')
    .eq('article_id', articleId)
    .eq('is_primary', true)
    .maybeSingle()

  const primaryCat = primaryCatRow?.category_id

  // 2. Validate mandatory fields
  const validation = validateArticleForPublishing({
    title: article.title,
    shortDescription: article.short_description,
    slug: article.slug,
    coverImagePath: article.cover_image_path,
    categoryId: primaryCat,
    contentJson: article.content_json,
    language: article.language,
  })

  if (!validation.canPublish) {
    return {
      success: false,
      error: `Cannot publish: ${validation.errors.join(' ')}`,
    }
  }

  // 3. Execute atomic Postgres function
  const { data: result, error: rpcError } = await (adminClient as any).rpc(
    'publish_article_transaction',
    {
      p_article_id: articleId,
      p_actor_id: actorId,
      p_note: note || 'Published via editorial workspace',
    }
  )

  if (rpcError) {
    return { success: false, error: rpcError.message }
  }

  // 4. Invalidate ISR caches across public routes
  try {
    const lang = article.language
    const slug = article.slug

    // Revalidate article page
    revalidatePath(`/${lang}/${slug}`, 'page')
    // Revalidate localized home
    revalidatePath(`/${lang}`, 'page')
    // Revalidate category listings
    revalidatePath(`/${lang}/category/[slug]`, 'page')
    // Revalidate editorial list
    revalidatePath('/admin/articles', 'page')
  } catch (revalidateErr) {
    // Non-fatal if revalidation log fails
    console.warn('Cache revalidation notice:', revalidateErr)
  }

  return { success: true }
}

/**
 * Unpublish (Archive) an article atomically.
 */
export async function unpublishArticle(
  articleId: string,
  actorId: string,
  note?: string
): Promise<{ success: boolean; error?: string }> {
  const adminClient = createSupabaseAdminClient()

  const { data: article } = await adminClient
    .from('articles')
    .select('language, slug')
    .eq('id', articleId)
    .single()

  if (!article) return { success: false, error: 'Article not found' }

  const { error: rpcError } = await (adminClient as any).rpc(
    'unpublish_article_transaction',
    {
      p_article_id: articleId,
      p_actor_id: actorId,
      p_note: note || 'Unpublished via editorial workspace',
    }
  )

  if (rpcError) {
    return { success: false, error: rpcError.message }
  }

  // Revalidate caches to remove unlisted article from public view
  try {
    revalidatePath(`/${article.language}/${article.slug}`, 'page')
    revalidatePath(`/${article.language}`, 'page')
    revalidatePath('/admin/articles', 'page')
  } catch {
    // Non-fatal
  }

  return { success: true }
}
