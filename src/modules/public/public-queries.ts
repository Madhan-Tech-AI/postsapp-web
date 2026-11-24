/**
 * Public Query Layer
 *
 * Implements Architecture Principle 8:
 * The article publishing engine is the foundation: homepage, categories,
 * search, trending, and sharing all read through the `published_articles` view.
 * No duplicated "is this public?" logic exists across the codebase.
 */
import 'server-only'

import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import type { LanguageCode } from '@/lib/schemas'

export interface PublicArticle {
  id: string
  translation_group_id: string
  language: LanguageCode
  title: string
  subtitle: string | null
  short_description: string | null
  slug: string
  content_json: any
  cover_image_path: string | null
  cover_image_alt: string | null
  author_id: string
  author_display_name: string
  author_avatar_url: string | null
  author_bio: string | null
  author_slug: string | null
  status: 'published'
  published_at: string
  first_published_at: string
  reading_time_minutes: number
  seo_title: string | null
  seo_description: string | null
  canonical_url: string | null
  view_count: number
  like_count: number
  category_name?: string
  category_slug?: string
}

export interface SiteSettingsData {
  site_name: string
  site_tagline: string
  breaking_news: {
    enabled: boolean
    text_en: string
    text_ta: string
  }
  canonical_base_url: string
}

/**
 * Fetch global site settings
 */
export async function getPublicSiteSettings(): Promise<SiteSettingsData> {
  const adminClient = createSupabaseAdminClient()
  const { data } = await adminClient.from('site_settings').select('key, value')

  const settingsMap = new Map<string, any>()
  data?.forEach((row: any) => settingsMap.set(row.key, row.value))

  return {
    site_name: settingsMap.get('site_name') || 'PostsApp',
    site_tagline: settingsMap.get('site_tagline') || 'Your News, Your Language',
    breaking_news: settingsMap.get('breaking_news') || {
      enabled: false,
      text_en: '',
      text_ta: '',
    },
    canonical_base_url: settingsMap.get('canonical_base_url') || 'https://postsapp.in',
  }
}

/**
 * Fetch all published categories for a given language
 */
export async function getPublicCategories(language: LanguageCode) {
  const adminClient = createSupabaseAdminClient()
  const { data } = await adminClient
    .from('categories')
    .select('id, group_key, name, slug, sort_order')
    .eq('language', language)
    .order('sort_order', { ascending: true })

  return data || []
}

/**
 * Fetch Homepage data:
 * - Featured article
 * - Latest articles feed
 * - Top categories with recent articles
 */
export async function getHomepageFeed(language: LanguageCode) {
  const adminClient = createSupabaseAdminClient()

  // 1. Fetch latest published articles for this language from published_articles view
  const { data: latestRows } = await adminClient
    .from('published_articles')
    .select('*')
    .eq('language', language)
    .order('published_at', { ascending: false })
    .limit(15)

  const articles: PublicArticle[] = (latestRows || []) as any

  // Attach primary category names
  if (articles.length > 0) {
    const articleIds = articles.map((a) => a.id)
    const { data: catJoins } = await adminClient
      .from('article_categories')
      .select('article_id, categories (name, slug)')
      .in('article_id', articleIds)
      .eq('is_primary', true)

    const catMap = new Map<string, { name: string; slug: string }>()
    catJoins?.forEach((cj: any) => {
      if (cj.categories) catMap.set(cj.article_id, cj.categories)
    })

    articles.forEach((a) => {
      const cat = catMap.get(a.id)
      if (cat) {
        a.category_name = cat.name
        a.category_slug = cat.slug
      }
    })
  }

  const featured = articles[0] || null
  const latest = articles.slice(1, 7)
  const remaining = articles.slice(7)

  return {
    featured,
    latest,
    remaining,
  }
}

/**
 * Fetch article detail by slug and language.
 * Only published articles are returned (published_articles view).
 * Draft or archived articles return null, triggering a true 404.
 * Also checks translation counterpart in the other language for hreflang linking.
 */
export async function getPublishedArticleBySlug(
  language: LanguageCode,
  slug: string
): Promise<{
  article: PublicArticle | null
  translationSlug: string | null
  relatedArticles: PublicArticle[]
}> {
  const adminClient = createSupabaseAdminClient()

  // 1. Fetch article from published_articles view
  const { data: articleRow } = await adminClient
    .from('published_articles')
    .select('*')
    .eq('language', language)
    .eq('slug', slug)
    .maybeSingle()

  if (!articleRow) {
    return { article: null, translationSlug: null, relatedArticles: [] }
  }

  const article: PublicArticle = articleRow as any

  // 2. Fetch primary category
  const { data: primaryCatJoin } = await adminClient
    .from('article_categories')
    .select('category_id, categories(name, slug)')
    .eq('article_id', article.id)
    .eq('is_primary', true)
    .maybeSingle()

  if (primaryCatJoin?.categories) {
    article.category_name = (primaryCatJoin.categories as any).name
    article.category_slug = (primaryCatJoin.categories as any).slug
  }

  // 3. Find translation counterpart in the other language (for hreflang and language switcher)
  const otherLang: LanguageCode = language === 'en' ? 'ta' : 'en'
  const { data: translationCounterpart } = await adminClient
    .from('published_articles')
    .select('slug')
    .eq('translation_group_id', article.translation_group_id)
    .eq('language', otherLang)
    .maybeSingle()

  const translationSlug = translationCounterpart?.slug || null

  // 4. Fetch related articles (same category, published, same language)
  let relatedArticles: PublicArticle[] = []
  if (primaryCatJoin?.category_id) {
    const { data: relatedJoins } = await adminClient
      .from('article_categories')
      .select('article_id')
      .eq('category_id', primaryCatJoin.category_id)
      .neq('article_id', article.id)
      .limit(4)

    if (relatedJoins && relatedJoins.length > 0) {
      const relatedIds = relatedJoins.map((rj) => rj.article_id)
      const { data: relatedRows } = await adminClient
        .from('published_articles')
        .select('*')
        .in('id', relatedIds)
        .eq('language', language)
        .order('published_at', { ascending: false })
        .limit(3)

      relatedArticles = (relatedRows || []) as any
    }
  }

  return { article, translationSlug, relatedArticles }
}

/**
 * Fetch articles for a specific category
 */
export async function getCategoryArticles(
  language: LanguageCode,
  categorySlug: string,
  page = 1,
  limit = 12
) {
  const adminClient = createSupabaseAdminClient()
  const offset = (page - 1) * limit

  // 1. Fetch category
  const { data: category } = await adminClient
    .from('categories')
    .select('id, name, slug, group_key')
    .eq('language', language)
    .eq('slug', categorySlug)
    .maybeSingle()

  if (!category) return null

  // 2. Fetch published articles linked to this category
  const { data: joins, count } = await adminClient
    .from('article_categories')
    .select(
      `
      article_id,
      articles:article_id!inner (
        id,
        language,
        title,
        subtitle,
        short_description,
        slug,
        cover_image_path,
        published_at,
        reading_time_minutes,
        view_count,
        like_count,
        status,
        profiles:author_id (display_name, avatar_url)
      )
    `,
      { count: 'exact' }
    )
    .eq('category_id', category.id)
    .eq('articles.status', 'published')
    .eq('articles.language', language)
    .order('articles(published_at)', { ascending: false })
    .range(offset, offset + limit - 1)

  const articles: PublicArticle[] = (joins || []).map((j: any) => ({
    id: j.articles.id,
    language: j.articles.language,
    title: j.articles.title,
    subtitle: j.articles.subtitle,
    short_description: j.articles.short_description,
    slug: j.articles.slug,
    cover_image_path: j.articles.cover_image_path,
    author_display_name: j.articles.profiles?.display_name || 'Staff',
    author_avatar_url: j.articles.profiles?.avatar_url || null,
    published_at: j.articles.published_at,
    reading_time_minutes: j.articles.reading_time_minutes,
    view_count: j.articles.view_count,
    like_count: j.articles.like_count,
    category_name: category.name,
    category_slug: category.slug,
  })) as any

  return {
    category,
    articles,
    totalCount: count || 0,
  }
}

/**
 * Fetch author bio and their published articles
 */
export async function getPublicAuthorProfile(language: LanguageCode, authorSlug: string) {
  const adminClient = createSupabaseAdminClient()

  const { data: authorProfile } = await adminClient
    .from('author_profiles')
    .select('*, profiles:user_id(display_name, avatar_url)')
    .eq('slug', authorSlug)
    .maybeSingle()

  if (!authorProfile) return null

  const { data: articles } = await adminClient
    .from('published_articles')
    .select('*')
    .eq('author_id', authorProfile.user_id)
    .eq('language', language)
    .order('published_at', { ascending: false })
    .limit(10)

  return {
    author: {
      id: authorProfile.user_id,
      displayName: (authorProfile.profiles as any)?.display_name,
      avatarUrl: (authorProfile.profiles as any)?.avatar_url,
      bio: authorProfile.bio,
      twitterUrl: authorProfile.twitter_url,
      facebookUrl: authorProfile.facebook_url,
      websiteUrl: authorProfile.website_url,
      slug: authorProfile.slug,
    },
    articles: (articles || []) as PublicArticle[],
  }
}
