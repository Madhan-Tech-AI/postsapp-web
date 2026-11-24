import 'server-only'

import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export interface ArticleLikeStatus {
  liked: boolean
  likeCount: number
}

/**
 * Get like status for an article, including whether the given user has liked it.
 */
export async function getArticleLikeStatus(
  articleId: string,
  userId?: string | null
): Promise<ArticleLikeStatus> {
  const adminClient = createSupabaseAdminClient()

  // 1. Fetch current like count from articles
  const { data: article } = await adminClient
    .from('articles')
    .select('like_count')
    .eq('id', articleId)
    .maybeSingle()

  const likeCount = article?.like_count ?? 0

  if (!userId) {
    return { liked: false, likeCount }
  }

  // 2. Check if this registered user has liked the article
  const { data: likeRecord } = await adminClient
    .from('article_likes')
    .select('id')
    .eq('article_id', articleId)
    .eq('user_id', userId)
    .maybeSingle()

  return {
    liked: !!likeRecord,
    likeCount,
  }
}

/**
 * Toggle like for a registered reader.
 * Enforces:
 * - Registered reader check (via active profile)
 * - 1 like per reader per article (atomic toggle)
 * - Cached counter maintained by database trigger
 */
export async function toggleArticleLike(
  articleId: string,
  userId: string
): Promise<{ success: boolean; liked: boolean; likeCount: number; error?: string }> {
  const adminClient = createSupabaseAdminClient()

  // 1. Verify user exists and is active
  const { data: profile } = await adminClient
    .from('profiles')
    .select('id, is_active')
    .eq('id', userId)
    .maybeSingle()

  if (!profile || !profile.is_active) {
    return { success: false, liked: false, likeCount: 0, error: 'User is inactive or not found' }
  }

  // 2. Check if like already exists
  const { data: existingLike } = await adminClient
    .from('article_likes')
    .select('id')
    .eq('article_id', articleId)
    .eq('user_id', userId)
    .maybeSingle()

  if (existingLike) {
    // Unlike: delete row
    const { error: deleteError } = await adminClient
      .from('article_likes')
      .delete()
      .eq('id', existingLike.id)

    if (deleteError) {
      return { success: false, liked: true, likeCount: 0, error: deleteError.message }
    }

    // Read updated like count
    const { data: article } = await adminClient
      .from('articles')
      .select('like_count')
      .eq('id', articleId)
      .maybeSingle()

    return {
      success: true,
      liked: false,
      likeCount: article?.like_count ?? 0,
    }
  } else {
    // Like: insert row
    const { error: insertError } = await adminClient
      .from('article_likes')
      .insert({
        article_id: articleId,
        user_id: userId,
      })

    if (insertError) {
      // Check for unique constraint violation race
      if (insertError.code === '23505') {
        const { data: article } = await adminClient
          .from('articles')
          .select('like_count')
          .eq('id', articleId)
          .maybeSingle()
        return { success: true, liked: true, likeCount: article?.like_count ?? 0 }
      }
      return { success: false, liked: false, likeCount: 0, error: insertError.message }
    }

    // Read updated like count
    const { data: article } = await adminClient
      .from('articles')
      .select('like_count')
      .eq('id', articleId)
      .maybeSingle()

    return {
      success: true,
      liked: true,
      likeCount: article?.like_count ?? 0,
    }
  }
}
