import 'server-only'

import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export interface SiteSettingsMap {
  site_name: string
  site_tagline: string
  breaking_news: {
    enabled: boolean
    text_en: string
    text_ta: string
  }
  canonical_base_url: string
  default_language: 'en' | 'ta'
  social_links: {
    twitter?: string
    facebook?: string
    youtube?: string
  }
}

/**
 * Fetch all configurable site settings
 */
export async function getAllSiteSettings(): Promise<SiteSettingsMap> {
  const adminClient = createSupabaseAdminClient()
  const { data } = await adminClient.from('site_settings').select('key, value')

  const map = new Map<string, any>()
  data?.forEach((row: any) => map.set(row.key, row.value))

  return {
    site_name: map.get('site_name') || 'PostsApp',
    site_tagline: map.get('site_tagline') || 'Your News, Your Language',
    breaking_news: map.get('breaking_news') || {
      enabled: false,
      text_en: '',
      text_ta: '',
    },
    canonical_base_url: map.get('canonical_base_url') || 'https://postsapp.in',
    default_language: map.get('default_language') || 'en',
    social_links: map.get('social_links') || {
      twitter: '',
      facebook: '',
      youtube: '',
    },
  }
}

/**
 * Update site settings (SuperAdmin only).
 * Writes an audit_logs row for compliance.
 */
export async function updateSiteSettings(
  settings: Partial<SiteSettingsMap>,
  actorId: string
): Promise<{ success: boolean; error?: string }> {
  const adminClient = createSupabaseAdminClient()

  for (const [key, value] of Object.entries(settings)) {
    const { error } = await adminClient
      .from('site_settings')
      .update({ value, updated_by: actorId })
      .eq('key', key)

    if (error) {
      return { success: false, error: `Failed to update ${key}: ${error.message}` }
    }
  }

  // Record audit log
  await adminClient.from('audit_logs').insert({
    action: 'site_setting_change',
    actor_id: actorId,
    target_type: 'site_settings',
    target_id: 'global',
    metadata: { updatedKeys: Object.keys(settings) },
  })

  return { success: true }
}
