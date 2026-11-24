import 'server-only'

import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import type { UserRole, LanguageCode } from '@/lib/schemas'

export interface AnalyticsSummary {
  totalViews: number
  totalLikes: number
  totalArticles: number
  publishedArticles: number
  draftArticles: number
  activeAuthors: number
  timeSeries7d: { date: string; views: number }[]
  topArticles: {
    id: string
    title: string
    slug: string
    language: LanguageCode
    categoryName?: string
    authorName: string
    viewCount: number
    likeCount: number
    publishedAt: string
  }[]
  authorPerformance: {
    authorId: string
    authorName: string
    articlesCount: number
    totalViews: number
    totalLikes: number
  }[]
}

/**
 * Fetch Analytics data scoped by role:
 * - Author: sees only their own articles and statistics
 * - Editor & SuperAdmin: sees publication-wide metrics
 */
export async function getAdminAnalytics({
  role,
  currentUserId,
}: {
  role: UserRole
  currentUserId: string
}): Promise<AnalyticsSummary> {
  const adminClient = createSupabaseAdminClient()
  const isAuthorOnly = role === 'author'

  // 1. Articles query
  let articlesQuery = adminClient
    .from('articles')
    .select('id, title, slug, language, status, author_id, view_count, like_count, published_at, profiles:author_id(display_name)')

  if (isAuthorOnly) {
    articlesQuery = articlesQuery.eq('author_id', currentUserId)
  }

  const { data: articlesData } = await articlesQuery

  const allArticles = articlesData || []
  const published = allArticles.filter((a) => a.status === 'published')
  const drafts = allArticles.filter((a) => a.status === 'draft')

  const totalViews = published.reduce((acc, a) => acc + (a.view_count || 0), 0)
  const totalLikes = published.reduce((acc, a) => acc + (a.like_count || 0), 0)

  // 2. Author count
  const authorIds = new Set(allArticles.map((a) => a.author_id))
  const activeAuthors = isAuthorOnly ? 1 : authorIds.size

  // 3. Time-Series views for the last 7 days from article_views
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  let viewsQuery = adminClient
    .from('article_views')
    .select('article_id, recorded_at')
    .gte('recorded_at', sevenDaysAgo.toISOString())

  if (isAuthorOnly && allArticles.length > 0) {
    const ownArticleIds = allArticles.map((a) => a.id)
    viewsQuery = viewsQuery.in('article_id', ownArticleIds)
  }

  const { data: viewsData } = await viewsQuery

  // Group views by day (YYYY-MM-DD)
  const dateMap = new Map<string, number>()
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
    const key = d.toISOString().slice(0, 10)
    dateMap.set(key, 0)
  }

  viewsData?.forEach((v) => {
    const day = v.recorded_at.slice(0, 10)
    if (dateMap.has(day)) {
      dateMap.set(day, (dateMap.get(day) || 0) + 1)
    }
  })

  const timeSeries7d = Array.from(dateMap.entries()).map(([date, views]) => ({
    date,
    views,
  }))

  // 4. Top Articles
  const sortedArticles = [...published].sort((a, b) => (b.view_count || 0) - (a.view_count || 0))
  const topArticles = sortedArticles.slice(0, 10).map((a: any) => ({
    id: a.id,
    title: a.title,
    slug: a.slug,
    language: a.language,
    authorName: a.profiles?.display_name || 'Staff',
    viewCount: a.view_count || 0,
    likeCount: a.like_count || 0,
    publishedAt: a.published_at || '',
  }))

  // 5. Author Performance summary (Editor/SuperAdmin only)
  const authorMap = new Map<
    string,
    { authorId: string; authorName: string; articlesCount: number; totalViews: number; totalLikes: number }
  >()

  published.forEach((a: any) => {
    const aId = a.author_id
    const aName = a.profiles?.display_name || 'Unknown'
    const current = authorMap.get(aId) || {
      authorId: aId,
      authorName: aName,
      articlesCount: 0,
      totalViews: 0,
      totalLikes: 0,
    }
    current.articlesCount += 1
    current.totalViews += a.view_count || 0
    current.totalLikes += a.like_count || 0
    authorMap.set(aId, current)
  })

  const authorPerformance = Array.from(authorMap.values()).sort(
    (a, b) => b.totalViews - a.totalViews
  )

  return {
    totalViews,
    totalLikes,
    totalArticles: allArticles.length,
    publishedArticles: published.length,
    draftArticles: drafts.length,
    activeAuthors,
    timeSeries7d,
    topArticles,
    authorPerformance,
  }
}
