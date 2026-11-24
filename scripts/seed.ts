#!/usr/bin/env tsx
/**
 * PostsApp — Database seed script
 *
 * Runs the seed SQL (categories + site settings) against the local Supabase.
 * Safe to run multiple times — uses ON CONFLICT DO NOTHING.
 *
 * The seed data is also in migration 007 for production.
 * This script exists for quick local resets during development.
 *
 * Usage: npm run db:seed
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import * as fs from 'fs'
import * as path from 'path'

config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('Missing env vars. Copy .env.example to .env.local')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  console.log('🌱 Seeding database...\n')

  // Seed categories
  const categories = [
    // English
    { group_key: 'national',      language: 'en', name: 'National',      slug: 'national',      sort_order: 1 },
    { group_key: 'international', language: 'en', name: 'International', slug: 'international', sort_order: 2 },
    { group_key: 'politics',      language: 'en', name: 'Politics',      slug: 'politics',      sort_order: 3 },
    { group_key: 'technology',    language: 'en', name: 'Technology',    slug: 'technology',    sort_order: 4 },
    { group_key: 'business',      language: 'en', name: 'Business',      slug: 'business',      sort_order: 5 },
    { group_key: 'education',     language: 'en', name: 'Education',     slug: 'education',     sort_order: 6 },
    { group_key: 'sports',        language: 'en', name: 'Sports',        slug: 'sports',        sort_order: 7 },
    { group_key: 'entertainment', language: 'en', name: 'Entertainment', slug: 'entertainment', sort_order: 8 },
    { group_key: 'science',       language: 'en', name: 'Science',       slug: 'science',       sort_order: 9 },
    { group_key: 'lifestyle',     language: 'en', name: 'Lifestyle',     slug: 'lifestyle',     sort_order: 10 },
    // Tamil
    { group_key: 'national',      language: 'ta', name: 'தேசியம்',         slug: 'theciyam',       sort_order: 1 },
    { group_key: 'international', language: 'ta', name: 'சர்வதேசம்',       slug: 'carvathecam',    sort_order: 2 },
    { group_key: 'politics',      language: 'ta', name: 'அரசியல்',         slug: 'araciiyal',      sort_order: 3 },
    { group_key: 'technology',    language: 'ta', name: 'தொழில்நுட்பம்',   slug: 'thozhilnudpam',  sort_order: 4 },
    { group_key: 'business',      language: 'ta', name: 'வணிகம்',          slug: 'vanikam',        sort_order: 5 },
    { group_key: 'education',     language: 'ta', name: 'கல்வி',           slug: 'kalvi',          sort_order: 6 },
    { group_key: 'sports',        language: 'ta', name: 'விளையாட்டு',      slug: 'vilaiyaattu',    sort_order: 7 },
    { group_key: 'entertainment', language: 'ta', name: 'பொழுதுபோக்கு',   slug: 'pozhudhupokku',  sort_order: 8 },
    { group_key: 'science',       language: 'ta', name: 'அறிவியல்',        slug: 'ariviyal',       sort_order: 9 },
    { group_key: 'lifestyle',     language: 'ta', name: 'வாழ்க்கை முறை',  slug: 'vaazhkkai-murai', sort_order: 10 },
  ]

  const { error: catError } = await supabase
    .from('categories')
    .upsert(categories, { onConflict: 'group_key,language', ignoreDuplicates: true })

  if (catError) {
    console.error('❌ Categories seed failed:', catError.message)
    process.exit(1)
  }
  console.log('✅ Categories seeded (20 rows: 10 EN + 10 TA)')

  // Seed site settings
  const settings = [
    { key: 'site_name',            value: 'PostsApp',                             description: 'Display name of the site' },
    { key: 'site_tagline',         value: 'Your News, Your Language',             description: 'Tagline shown in header/footer' },
    { key: 'default_language',     value: 'en',                                   description: 'Default language for new visitors' },
    { key: 'breaking_news',        value: { enabled: false, text_en: '', text_ta: '' }, description: 'Breaking news strip settings' },
    { key: 'featured_article_ids', value: [],                                     description: 'Array of article UUIDs to feature on homepage' },
    { key: 'social_links',         value: { twitter: '', facebook: '', instagram: '', youtube: '' }, description: 'Social media links' },
    { key: 'logo_path',            value: '',                                     description: 'Path in site-assets bucket' },
    { key: 'canonical_base_url',   value: 'https://postsapp.in',                 description: 'Canonical base URL for SEO' },
    { key: 'contact_email',        value: 'contact@postsapp.in',                 description: 'Public contact email' },
    { key: 'articles_per_page',    value: 20,                                     description: 'Default pagination size' },
    { key: 'trending_window_hours',value: 24,                                     description: 'Rolling window (hours) for trending' },
    { key: 'most_read_window_days',value: 7,                                      description: 'Rolling window (days) for most-read' },
  ]

  for (const setting of settings) {
    const { error } = await supabase
      .from('site_settings')
      .upsert({ key: setting.key, value: setting.value, description: setting.description },
               { onConflict: 'key', ignoreDuplicates: true })
    if (error) {
      console.warn(`⚠️  Setting '${setting.key}' failed:`, error.message)
    }
  }
  console.log('✅ Site settings seeded (12 defaults)')

  console.log('\n🎉 Seed complete! Run npm run db:bootstrap to create a SuperAdmin.\n')
}

main().catch((err) => {
  console.error('❌ Seed error:', err)
  process.exit(1)
})
