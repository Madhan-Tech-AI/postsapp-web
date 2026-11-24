'use server'

import { revalidatePath } from 'next/cache'
import { getAuthenticatedUserProfile } from '@/lib/supabase/server'
import { updateSiteSettings } from './settings.service'
import { upsertCategoryGroup } from './categories.service'

export interface AdminActionResult {
  success: boolean
  error?: string
}

/**
 * Server Action: Update Site Settings (SuperAdmin only)
 */
export async function updateSiteSettingsAction(
  prevState: AdminActionResult,
  formData: FormData
): Promise<AdminActionResult> {
  const profile = await getAuthenticatedUserProfile()
  if (!profile || profile.role !== 'super_admin') {
    return { success: false, error: 'Unauthorized: SuperAdmin role required' }
  }

  const siteName = (formData.get('site_name') as string)?.trim()
  const siteTagline = (formData.get('site_tagline') as string)?.trim()
  const breakingEnabled = formData.get('breaking_enabled') === 'true'
  const breakingTextEn = (formData.get('breaking_text_en') as string)?.trim() || ''
  const breakingTextTa = (formData.get('breaking_text_ta') as string)?.trim() || ''
  const canonicalBaseUrl = (formData.get('canonical_base_url') as string)?.trim()
  const defaultLanguage = (formData.get('default_language') as 'en' | 'ta') || 'en'
  const twitter = (formData.get('twitter_url') as string)?.trim() || ''
  const facebook = (formData.get('facebook_url') as string)?.trim() || ''
  const youtube = (formData.get('youtube_url') as string)?.trim() || ''

  const result = await updateSiteSettings(
    {
      site_name: siteName || 'PostsApp',
      site_tagline: siteTagline || 'Your News, Your Language',
      breaking_news: {
        enabled: breakingEnabled,
        text_en: breakingTextEn,
        text_ta: breakingTextTa,
      },
      canonical_base_url: canonicalBaseUrl || 'https://postsapp.in',
      default_language: defaultLanguage,
      social_links: { twitter, facebook, youtube },
    },
    profile.id
  )

  if (result.success) {
    revalidatePath('/admin/settings')
    revalidatePath('/')
  }

  return result
}

/**
 * Server Action: Upsert Category Pair (SuperAdmin only)
 */
export async function upsertCategoryAction(
  prevState: AdminActionResult,
  formData: FormData
): Promise<AdminActionResult> {
  const profile = await getAuthenticatedUserProfile()
  if (!profile || profile.role !== 'super_admin') {
    return { success: false, error: 'Unauthorized: SuperAdmin role required' }
  }

  const groupKey = (formData.get('group_key') as string)?.trim().toLowerCase()
  const sortOrder = parseInt((formData.get('sort_order') as string) || '0', 10)
  const nameEn = (formData.get('name_en') as string)?.trim()
  const slugEn = (formData.get('slug_en') as string)?.trim().toLowerCase()
  const nameTa = (formData.get('name_ta') as string)?.trim()
  const slugTa = (formData.get('slug_ta') as string)?.trim().toLowerCase()

  if (!groupKey || !nameEn || !slugEn || !nameTa || !slugTa) {
    return { success: false, error: 'All category fields are required' }
  }

  const result = await upsertCategoryGroup({
    groupKey,
    sortOrder,
    nameEn,
    slugEn,
    nameTa,
    slugTa,
    actorId: profile.id,
  })

  if (result.success) {
    revalidatePath('/admin/categories')
    revalidatePath('/')
  }

  return result
}
