'use server'

import { revalidatePath } from 'next/cache'
import { getAuthenticatedUserProfile } from '@/lib/supabase/server'
import { deleteMediaItem } from './media.service'

export async function deleteMediaAction(mediaId: string): Promise<{ success: boolean; error?: string }> {
  const profile = await getAuthenticatedUserProfile()
  if (!profile || !['author', 'editor', 'super_admin'].includes(profile.role)) {
    return { success: false, error: 'Unauthorized' }
  }

  const result = await deleteMediaItem(mediaId, profile.id, profile.role)
  if (result.success) {
    revalidatePath('/admin/media')
  }
  return result
}
