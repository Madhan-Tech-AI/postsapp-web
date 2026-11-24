/**
 * Article Domain Service
 *
 * Implements core article management and bilingual translation logic:
 * - Draft creation & autosave persistence
 * - Bilingual translation group linking (EN ↔ TA)
 * - Slug uniqueness validation per language
 * - Primary + optional category relationship handling
 * - Tag relationship handling
 * - Ownership & role checks (Authors restricted to own; Editors/SuperAdmin manage all)
 * - Soft-delete (archive) vs hard-delete based on actor role
 */
import 'server-only'

import { createSupabaseServerClient, getAuthenticatedUser } from '@/lib/supabase/server'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import {
  articleDraftSchema,
  type UserRole,
  type LanguageCode,
  type ArticleStatus,
} from '@/lib/schemas'
import { DELETE_SOFT_FOR_AUTHORS } from '@/lib/constants'
import { calculateReadingTime, extractTextFromTiptap } from '@/lib/utils'
import type { Database } from '@/lib/database.types'

export interface ArticleFilterOptions {
  authorId?: string
  role: UserRole
  currentUserId: string
  language?: LanguageCode
  status?: ArticleStatus
  categoryId?: string
  search?: string
  page?: number
  limit?: number
}

export interface ArticleListItem {
  id: string
  translation_group_id: string
  language: LanguageCode
  title: string
  subtitle: string | null
  short_description: string | null
  slug: string
  cover_image_path: string | null
  author_id: string
  author_name: string
  status: ArticleStatus
  published_at: string | null
  updated_at: string
  reading_time_minutes: number
  view_count: number
  like_count: number
  primary_category_name?: string
  translations: { language: LanguageCode; article_id: string; status: ArticleStatus }[]
}

/**
 * Query articles with role-aware scoping, filtering, and pagination.
 * Authors can only view their own articles.
 * Editors & SuperAdmins can view all articles.
 */
export async function getEditorialArticles(
  options: ArticleFilterOptions
): Promise<{ articles: ArticleListItem[]; totalCount: number }> {
  const adminClient = createSupabaseAdminClient()
  const page = options.page || 1
  const limit = options.limit || 20
  const offset = (page - 1) * limit

  let query = adminClient
    .from('articles')
    .select(
      `
      id,
      translation_group_id,
      language,
      title,
      subtitle,
      short_description,
      slug,
      cover_image_path,
      author_id,
      status,
      published_at,
      updated_at,
      reading_time_minutes,
      view_count,
      like_count,
      profiles:author_id (display_name),
      article_categories (is_primary, categories (name))
    `,
      { count: 'exact' }
    )

  // Enforce Author visibility restriction
  if (options.role === 'author') {
    query = query.eq('author_id', options.currentUserId)
  } else if (options.authorId) {
    query = query.eq('author_id', options.authorId)
  }

  // Filter by language
  if (options.language) {
    query = query.eq('language', options.language)
  }

  // Filter by status
  if (options.status) {
    query = query.eq('status', options.status)
  }

  // Search by title or slug
  if (options.search) {
    query = query.ilike('title', `%${options.search}%`)
  }

  query = query.order('updated_at', { ascending: false }).range(offset, offset + limit - 1)

  const { data, count, error } = await query

  if (error || !data) {
    return { articles: [], totalCount: 0 }
  }

  // Fetch translation group counterparts for translation status indicators
  const translationGroupIds = Array.from(new Set(data.map((d: any) => d.translation_group_id)))

  const { data: translationRows } = await adminClient
    .from('articles')
    .select('id, translation_group_id, language, status')
    .in('translation_group_id', translationGroupIds)

  const translationMap = new Map<string, { language: LanguageCode; article_id: string; status: ArticleStatus }[]>()
  translationRows?.forEach((t: any) => {
    const list = translationMap.get(t.translation_group_id) || []
    list.push({ language: t.language, article_id: t.id, status: t.status })
    translationMap.set(t.translation_group_id, list)
  })

  const articles: ArticleListItem[] = data.map((item: any) => {
    const primaryCat = item.article_categories?.find((ac: any) => ac.is_primary)
    return {
      id: item.id,
      translation_group_id: item.translation_group_id,
      language: item.language,
      title: item.title,
      subtitle: item.subtitle,
      short_description: item.short_description,
      slug: item.slug,
      cover_image_path: item.cover_image_path,
      author_id: item.author_id,
      author_name: item.profiles?.display_name || 'Unknown',
      status: item.status,
      published_at: item.published_at,
      updated_at: item.updated_at,
      reading_time_minutes: item.reading_time_minutes,
      view_count: Number(item.view_count || 0),
      like_count: Number(item.like_count || 0),
      primary_category_name: primaryCat?.categories?.name,
      translations: translationMap.get(item.translation_group_id) || [],
    }
  })

  return { articles, totalCount: count || 0 }
}

/**
 * Retrieve a single article with full content and metadata.
 * Authors cannot view drafts/archives of other authors.
 */
export async function getEditorialArticleById(
  id: string,
  currentUserId: string,
  role: UserRole
) {
  const adminClient = createSupabaseAdminClient()

  const { data: article, error } = await adminClient
    .from('articles')
    .select(
      `
      *,
      profiles:author_id (display_name, avatar_url),
      article_categories (category_id, is_primary, categories (id, name, group_key)),
      article_tags (tag_id, tags (id, name, group_key))
    `
    )
    .eq('id', id)
    .single()

  if (error || !article) {
    return null
  }

  // Permission check: Authors see only their own articles
  if (role === 'author' && article.author_id !== currentUserId) {
    return null
  }

  // Fetch translation counterparts
  const { data: translationCounterparts } = await adminClient
    .from('article_translations')
    .select('article_id, language')
    .eq('translation_group_id', article.translation_group_id)

  return {
    ...article,
    translations: translationCounterparts || [],
  }
}

/**
 * Create a new article draft.
 * - Handles bilingual group linkage:
 *   If `translationGroupId` is provided, attaches to that story group.
 *   Otherwise, generates a new `translation_group_id`.
 * - Validates slug uniqueness for that language.
 * - Links primary and optional categories.
 * - Links tags.
 */
export async function createArticleDraft(
  authorId: string,
  input: {
    title: string
    subtitle?: string | null
    shortDescription?: string | null
    slug: string
    language: LanguageCode
    contentJson: any
    coverImagePath?: string | null
    coverImageAlt?: string | null
    categoryId?: string
    additionalCategoryIds?: string[]
    tagIds?: string[]
    seoTitle?: string | null
    seoDescription?: string | null
    translationGroupId?: string
  }
): Promise<{ success: boolean; articleId?: string; error?: string }> {
  const parsed = articleDraftSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || 'Invalid draft data' }
  }

  const adminClient = createSupabaseAdminClient()

  // 1. Slug uniqueness per language check
  const { data: existingSlug } = await adminClient
    .from('articles')
    .select('id')
    .eq('language', parsed.data.language)
    .eq('slug', parsed.data.slug)
    .maybeSingle()

  if (existingSlug) {
    return {
      success: false,
      error: `An article with slug "${parsed.data.slug}" already exists in ${parsed.data.language}. Slugs must be unique per language.`,
    }
  }

  // 2. Translation group linkage
  let translationGroupId = parsed.data.translationGroupId
  if (translationGroupId) {
    // Verify that the translation group doesn't already have an article in this language
    const { data: existingLangInGroup } = await adminClient
      .from('article_translations')
      .select('article_id')
      .eq('translation_group_id', translationGroupId)
      .eq('language', parsed.data.language)
      .maybeSingle()

    if (existingLangInGroup) {
      return {
        success: false,
        error: `This story already has an article in ${parsed.data.language}.`,
      }
    }
  } else {
    // Generate new UUID for story group
    translationGroupId = crypto.randomUUID()
  }

  // 3. Extract plain text for search and calculate reading time
  const contentText = extractTextFromTiptap(parsed.data.contentJson)
  const readingTime = calculateReadingTime(contentText)

  // 4. Insert Article
  const { data: newArticle, error: insertError } = await adminClient
    .from('articles')
    .insert({
      translation_group_id: translationGroupId,
      language: parsed.data.language,
      title: parsed.data.title,
      subtitle: parsed.data.subtitle || null,
      short_description: parsed.data.shortDescription || null,
      slug: parsed.data.slug,
      content_json: parsed.data.contentJson,
      content_text: contentText,
      cover_image_path: parsed.data.coverImagePath || null,
      cover_image_alt: parsed.data.coverImageAlt || null,
      author_id: authorId,
      status: 'draft',
      reading_time_minutes: readingTime,
      seo_title: parsed.data.seoTitle || null,
      seo_description: parsed.data.seoDescription || null,
    })
    .select('id')
    .single()

  if (insertError || !newArticle) {
    return { success: false, error: insertError?.message || 'Failed to create article draft' }
  }

  const articleId = newArticle.id

  // 5. Explicit translation mapping
  await adminClient.from('article_translations').insert({
    translation_group_id: translationGroupId,
    article_id: articleId,
    language: parsed.data.language,
  })

  // 6. Primary and secondary category attachments
  if (parsed.data.categoryId) {
    const categoriesToInsert: { article_id: string; category_id: string; is_primary: boolean }[] = [
      { article_id: articleId, category_id: parsed.data.categoryId, is_primary: true },
    ]

    parsed.data.additionalCategoryIds?.forEach((catId) => {
      if (catId !== parsed.data.categoryId) {
        categoriesToInsert.push({ article_id: articleId, category_id: catId, is_primary: false })
      }
    })

    await adminClient.from('article_categories').insert(categoriesToInsert)
  }

  // 7. Tags
  if (parsed.data.tagIds && parsed.data.tagIds.length > 0) {
    const tagsToInsert = parsed.data.tagIds.map((tagId) => ({
      article_id: articleId,
      tag_id: tagId,
    }))
    await adminClient.from('article_tags').insert(tagsToInsert)
  }

  // 8. Log draft creation
  await adminClient.from('audit_logs').insert({
    actor_id: authorId,
    action: 'article_create',
    target_type: 'article',
    target_id: articleId,
    metadata: {
      title: parsed.data.title,
      language: parsed.data.language,
      translation_group_id: translationGroupId,
    },
  })

  return { success: true, articleId }
}

/**
 * Update an existing article draft or published article metadata.
 * Authors are restricted to their own articles; Editors/SuperAdmins can edit any.
 */
export async function updateArticle(
  articleId: string,
  actorId: string,
  role: UserRole,
  input: {
    title: string
    subtitle?: string | null
    shortDescription?: string | null
    slug: string
    contentJson: any
    coverImagePath?: string | null
    coverImageAlt?: string | null
    categoryId?: string
    additionalCategoryIds?: string[]
    tagIds?: string[]
    seoTitle?: string | null
    seoDescription?: string | null
  }
): Promise<{ success: boolean; error?: string }> {
  const adminClient = createSupabaseAdminClient()

  // 1. Fetch current article to verify ownership and language
  const { data: currentArticle } = await adminClient
    .from('articles')
    .select('id, author_id, language, slug, translation_group_id')
    .eq('id', articleId)
    .single()

  if (!currentArticle) {
    return { success: false, error: 'Article not found' }
  }

  // Ownership check
  if (role === 'author' && currentArticle.author_id !== actorId) {
    return { success: false, error: 'You do not have permission to edit this article' }
  }

  // 2. Validate slug uniqueness if changed
  if (input.slug !== currentArticle.slug) {
    const { data: existingSlug } = await adminClient
      .from('articles')
      .select('id')
      .eq('language', currentArticle.language)
      .eq('slug', input.slug)
      .neq('id', articleId)
      .maybeSingle()

    if (existingSlug) {
      return {
        success: false,
        error: `An article with slug "${input.slug}" already exists in ${currentArticle.language}`,
      }
    }
  }

  const contentText = extractTextFromTiptap(input.contentJson)
  const readingTime = calculateReadingTime(contentText)

  // 3. Update Article fields
  const { error: updateError } = await adminClient
    .from('articles')
    .update({
      title: input.title,
      subtitle: input.subtitle || null,
      short_description: input.shortDescription || null,
      slug: input.slug,
      content_json: input.contentJson,
      content_text: contentText,
      cover_image_path: input.coverImagePath || null,
      cover_image_alt: input.coverImageAlt || null,
      reading_time_minutes: readingTime,
      seo_title: input.seoTitle || null,
      seo_description: input.seoDescription || null,
    })
    .eq('id', articleId)

  if (updateError) {
    return { success: false, error: updateError.message }
  }

  // 4. Update categories if specified
  if (input.categoryId) {
    // Delete existing categories
    await adminClient.from('article_categories').delete().eq('article_id', articleId)

    const categoriesToInsert = [
      { article_id: articleId, category_id: input.categoryId, is_primary: true },
    ]
    input.additionalCategoryIds?.forEach((catId) => {
      if (catId !== input.categoryId) {
        categoriesToInsert.push({ article_id: articleId, category_id: catId, is_primary: false })
      }
    })
    await adminClient.from('article_categories').insert(categoriesToInsert)
  }

  // 5. Update tags if specified
  if (input.tagIds) {
    await adminClient.from('article_tags').delete().eq('article_id', articleId)
    if (input.tagIds.length > 0) {
      const tagsToInsert = input.tagIds.map((tagId) => ({
        article_id: articleId,
        tag_id: tagId,
      }))
      await adminClient.from('article_tags').insert(tagsToInsert)
    }
  }

  // 6. Write audit log
  await adminClient.from('audit_logs').insert({
    actor_id: actorId,
    action: 'article_edit',
    target_type: 'article',
    target_id: articleId,
    metadata: { title: input.title, slug: input.slug },
  })

  return { success: true }
}

/**
 * Archive an article (soft delete).
 * Archived articles leave public access and can be republished.
 */
export async function archiveArticle(
  articleId: string,
  actorId: string,
  role: UserRole
): Promise<{ success: boolean; error?: string }> {
  const adminClient = createSupabaseAdminClient()

  const { data: article } = await adminClient
    .from('articles')
    .select('id, author_id, title')
    .eq('id', articleId)
    .single()

  if (!article) return { success: false, error: 'Article not found' }

  // Authors can only archive their own articles
  if (role === 'author' && article.author_id !== actorId) {
    return { success: false, error: 'Permission denied' }
  }

  const { error } = await adminClient
    .from('articles')
    .update({ status: 'archived' })
    .eq('id', articleId)

  if (error) return { success: false, error: error.message }

  // Write audit log
  await adminClient.from('audit_logs').insert({
    actor_id: actorId,
    action: 'article_archive',
    target_type: 'article',
    target_id: articleId,
    metadata: { title: article.title },
  })

  return { success: true }
}

/**
 * Delete an article:
 * Implements Section 15 default:
 * - Authors: archive (soft-delete)
 * - Editors & SuperAdmins: hard DELETE (with audit log row written before deletion)
 */
export async function deleteArticle(
  articleId: string,
  actorId: string,
  role: UserRole
): Promise<{ success: boolean; error?: string }> {
  const adminClient = createSupabaseAdminClient()

  const { data: article } = await adminClient
    .from('articles')
    .select('id, author_id, title')
    .eq('id', articleId)
    .single()

  if (!article) return { success: false, error: 'Article not found' }

  // Ownership check
  if (role === 'author' && article.author_id !== actorId) {
    return { success: false, error: 'Permission denied' }
  }

  if (role === 'author' && DELETE_SOFT_FOR_AUTHORS) {
    // Author path: Archive instead of hard delete
    return await archiveArticle(articleId, actorId, role)
  }

  // Editor/SuperAdmin path: Hard delete with audit entry
  // 1. Write audit log before delete to maintain audit trail
  await adminClient.from('audit_logs').insert({
    actor_id: actorId,
    action: 'article_delete',
    target_type: 'article',
    target_id: articleId,
    metadata: { title: article.title, role },
  })

  // 2. Delete article (cascades to article_translations, article_categories, article_tags, article_likes)
  const { error } = await adminClient.from('articles').delete().eq('id', articleId)

  if (error) return { success: false, error: error.message }

  return { success: true }
}

/**
 * Fetch available categories by language.
 */
export async function getCategoriesByLanguage(language: LanguageCode) {
  const adminClient = createSupabaseAdminClient()
  const { data } = await adminClient
    .from('categories')
    .select('id, group_key, name, slug, sort_order')
    .eq('language', language)
    .order('sort_order', { ascending: true })

  return data || []
}

/**
 * Fetch available tags by language.
 */
export async function getTagsByLanguage(language: LanguageCode) {
  const adminClient = createSupabaseAdminClient()
  const { data } = await adminClient
    .from('tags')
    .select('id, group_key, name, slug')
    .eq('language', language)
    .order('name', { ascending: true })

  return data || []
}
