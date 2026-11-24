import 'server-only'

import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import type { LanguageCode } from '@/lib/schemas'
import type { PublicArticle } from '@/modules/public/public-queries'

// In-memory cache with 10-minute TTL to prevent recalculating rolling aggregates on every request
interface CachedTrending {
  trending: PublicArticle[]
  mostRead: PublicArticle[]
  timestamp: number
}

const trendingCache = new Map<LanguageCode, CachedTrending>()
const CACHE_TTL_MS = 10 * 60 * 1000 // 10 minutes

/**
 * Trending & Most-Read Algorithms
 *
 * Implements Section 14 Phase 9:
 * - Trending: Rolling 24-hour window computed from article_views and article_likes
 * - Most Read: Rolling 7-day window computed from article_views
 * - Score: (views * 1) + (likes * 5)
 * - Cached query with 10-min TTL
 */
export async function getTrendingAndMostRead(
  language: LanguageCode,
  limit = 5
): Promise<{ trending: PublicArticle[]; mostRead: PublicArticle[] }> {
  const cached = trendingCache.get(language)
  const now = Date.now()

  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return {
      trending: cached.trending.slice(0, limit),
      mostRead: cached.mostRead.slice(0, limit),
    }
  }

  const adminClient = createSupabaseAdminClient()
  const twentyFourHoursAgo = new Date(now - 24 * 60 * 60 * 1000).toISOString()
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString()

  // 1. Fetch 24-hour views
  const { data: views24h } = await adminClient
    .from('article_views')
    .select('article_id')
    .gte('recorded_at', twentyFourHoursAgo)

  // 2. Fetch 24-hour likes
  const { data: likes24h } = await adminClient
    .from('article_likes')
    .select('article_id')
    .gte('created_at', twentyFourHoursAgo)

  // 3. Fetch 7-day views
  const { data: views7d } = await adminClient
    .from('article_views')
    .select('article_id')
    .gte('recorded_at', sevenDaysAgo)

  // Calculate 24h score = (views * 1) + (likes * 5)
  const score24h = new Map<string, number>()
  views24h?.forEach((v) => {
    score24h.set(v.article_id, (score24h.get(v.article_id) || 0) + 1)
  })
  likes24h?.forEach((l) => {
    score24h.set(l.article_id, (score24h.get(l.article_id) || 0) + 5)
  })

  // Calculate 7d view count
  const count7d = new Map<string, number>()
  views7d?.forEach((v) => {
    count7d.set(v.article_id, (count7d.get(v.article_id) || 0) + 1)
  })

  // Sort article IDs
  const trendingIds = Array.from(score24h.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map((e) => e[0])

  const mostReadIds = Array.from(count7d.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map((e) => e[0])

  let trendingArticles: PublicArticle[] = []
  let mostReadArticles: PublicArticle[] = []

  // If we have active trending items, fetch them from published_articles view
  if (trendingIds.length > 0) {
    const { data: tRows } = await adminClient
      .from('published_articles')
      .select('*')
      .in('id', trendingIds)
      .eq('language', language)

    // Preserve the score order
    const tMap = new Map<string, any>()
    tRows?.forEach((r) => tMap.set(r.id, r))
    trendingArticles = trendingIds
      .map((id) => tMap.get(id))
      .filter(Boolean) as PublicArticle[]
  }

  // If we have active most read items, fetch them
  if (mostReadIds.length > 0) {
    const { data: mRows } = await adminClient
      .from('published_articles')
      .select('*')
      .in('id', mostReadIds)
      .eq('language', language)

    const mMap = new Map<string, any>()
    mRows?.forEach((r) => mMap.set(r.id, r))
    mostReadArticles = mostReadIds
      .map((id) => mMap.get(id))
      .filter(Boolean) as PublicArticle[]
  }

  // Fallback if recent event data is sparse (e.g. freshly seeded DB)
  if (trendingArticles.length === 0) {
    const { data: fallbackRows } = await adminClient
      .from('published_articles')
      .select('*')
      .eq('language', language)
      .order('view_count', { ascending: false })
      .limit(10)

    trendingArticles = (fallbackRows || []) as any
    mostReadArticles = (fallbackRows || []) as any
  }

  // Update in-memory cache
  trendingCache.set(language, {
    trending: trendingArticles,
    mostRead: mostReadArticles,
    timestamp: now,
  })

  return {
    trending: trendingArticles.slice(0, limit),
    mostRead: mostReadArticles.slice(0, limit),
  }
}
