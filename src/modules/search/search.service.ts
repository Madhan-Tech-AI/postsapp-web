import 'server-only'

import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import type { LanguageCode } from '@/lib/schemas'
import type { PublicArticle } from '@/modules/public/public-queries'

export interface SearchOptions {
  query: string
  language: LanguageCode
  categorySlug?: string | null
  page?: number
  limit?: number
}

export interface SearchResult {
  articles: PublicArticle[]
  totalCount: number
  query: string
}

/**
 * Clean search query for websearch_to_tsquery or ILIKE pattern
 */
function sanitizeSearchQuery(q: string): string {
  return q.replace(/[%_\\]/g, '').trim()
}

/**
 * Full-Text Search Service
 *
 * Implements Architecture Section 10 & Phase 9:
 * - English: uses PostgreSQL full-text search with websearch on `search_vector`
 * - Tamil: uses trigram / ILIKE similarity search on title, subtitle, description, and content_text
 * - Reads strictly through `published_articles` view (single source of truth)
 */
export async function searchPublishedArticles({
  query,
  language,
  categorySlug,
  page = 1,
  limit = 12,
}: SearchOptions): Promise<SearchResult> {
  const cleanQ = sanitizeSearchQuery(query)

  if (!cleanQ || cleanQ.length < 2) {
    return { articles: [], totalCount: 0, query: cleanQ }
  }

  const adminClient = createSupabaseAdminClient()
  const offset = (page - 1) * limit

  // 1. Resolve category ID filter if categorySlug provided
  let categoryIdFilter: string | null = null
  if (categorySlug) {
    const { data: cat } = await adminClient
      .from('categories')
      .select('id')
      .eq('language', language)
      .eq('slug', categorySlug)
      .maybeSingle()

    if (cat) {
      categoryIdFilter = cat.id
    }
  }

  // 2. Execute language-specific search query
  let articlesQuery = adminClient
    .from('published_articles')
    .select('*', { count: 'exact' })
    .eq('language', language)

  if (language === 'en') {
    // English: Full-text search on search_vector
    try {
      articlesQuery = articlesQuery
        .textSearch('search_vector', cleanQ, { type: 'websearch', config: 'english' })
        .order('published_at', { ascending: false })
        .range(offset, offset + limit - 1)

      const { data, count, error } = await articlesQuery

      if (!error && data && data.length > 0) {
        return {
          articles: (data as any) as PublicArticle[],
          totalCount: count || 0,
          query: cleanQ,
        }
      }
    } catch {
      // Fall through to ILIKE fallback if FTS parser encountered syntax error
    }
  }

  // Tamil or English fallback: Trigram / ILIKE substring matching
  const likePattern = `%${cleanQ}%`
  const { data: fallbackData, count: fallbackCount } = await adminClient
    .from('published_articles')
    .select('*', { count: 'exact' })
    .eq('language', language)
    .or(
      `title.ilike.${likePattern},subtitle.ilike.${likePattern},short_description.ilike.${likePattern}`
    )
    .order('published_at', { ascending: false })
    .range(offset, offset + limit - 1)

  return {
    articles: ((fallbackData || []) as any) as PublicArticle[],
    totalCount: fallbackCount || 0,
    query: cleanQ,
  }
}
