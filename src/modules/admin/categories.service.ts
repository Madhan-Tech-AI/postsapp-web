import 'server-only'

import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import type { LanguageCode } from '@/lib/schemas'

export interface CategoryGroup {
  groupKey: string
  sortOrder: number
  en: {
    id: string
    name: string
    slug: string
  }
  ta: {
    id: string
    name: string
    slug: string
  }
}

/**
 * Fetch all paired categories grouped by group_key
 */
export async function getCategoryGroups(): Promise<CategoryGroup[]> {
  const adminClient = createSupabaseAdminClient()
  const { data } = await adminClient
    .from('categories')
    .select('id, group_key, language, name, slug, sort_order')
    .order('sort_order', { ascending: true })

  const map = new Map<string, CategoryGroup>()

  data?.forEach((row: any) => {
    if (!map.has(row.group_key)) {
      map.set(row.group_key, {
        groupKey: row.group_key,
        sortOrder: row.sort_order,
        en: { id: '', name: '', slug: '' },
        ta: { id: '', name: '', slug: '' },
      })
    }

    const group = map.get(row.group_key)!
    if (row.language === 'en') {
      group.en = { id: row.id, name: row.name, slug: row.slug }
    } else if (row.language === 'ta') {
      group.ta = { id: row.id, name: row.name, slug: row.slug }
    }
  })

  return Array.from(map.values()).sort((a, b) => a.sortOrder - b.sortOrder)
}

/**
 * Create or update a paired category group (SuperAdmin only)
 */
export async function upsertCategoryGroup({
  groupKey,
  sortOrder,
  nameEn,
  slugEn,
  nameTa,
  slugTa,
  actorId,
}: {
  groupKey: string
  sortOrder: number
  nameEn: string
  slugEn: string
  nameTa: string
  slugTa: string
  actorId: string
}): Promise<{ success: boolean; error?: string }> {
  const adminClient = createSupabaseAdminClient()

  // 1. Upsert English
  const { error: enError } = await adminClient
    .from('categories')
    .upsert(
      {
        group_key: groupKey,
        language: 'en' as LanguageCode,
        name: nameEn,
        slug: slugEn,
        sort_order: sortOrder,
      },
      { onConflict: 'language,slug' }
    )

  if (enError) {
    return { success: false, error: enError.message }
  }

  // 2. Upsert Tamil
  const { error: taError } = await adminClient
    .from('categories')
    .upsert(
      {
        group_key: groupKey,
        language: 'ta' as LanguageCode,
        name: nameTa,
        slug: slugTa,
        sort_order: sortOrder,
      },
      { onConflict: 'language,slug' }
    )

  if (taError) {
    return { success: false, error: taError.message }
  }

  // 3. Write Audit Log
  await adminClient.from('audit_logs').insert({
    action: 'category_update',
    actor_id: actorId,
    target_type: 'categories',
    target_id: groupKey,
    metadata: { groupKey, nameEn, nameTa, sortOrder },
  })

  return { success: true }
}
