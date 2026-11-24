'use server'

import { revalidatePath } from 'next/cache'
import { getAuthenticatedUser } from '@/lib/supabase/server'
import { toggleArticleLike } from './engagement.service'

export interface ToggleLikeResult {
  success: boolean
  liked: boolean
  likeCount: number
  error?: string
}

/**
 * Server Action to toggle an article like.
 * Enforces:
 * - Server-verified session (getUser)
 * - Returns UNAUTHENTICATED error if anonymous
 * - Revalidates article page path on success
 */
export async function toggleLikeAction(
  articleId: string,
  returnPath: string
): Promise<ToggleLikeResult> {
  const user = await getAuthenticatedUser()

  if (!user) {
    return {
      success: false,
      liked: false,
      likeCount: 0,
      error: 'UNAUTHENTICATED',
    }
  }

  const result = await toggleArticleLike(articleId, user.id)

  if (result.success && returnPath) {
    revalidatePath(returnPath)
  }

  return result
}
