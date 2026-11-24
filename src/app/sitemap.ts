import type { MetadataRoute } from 'next'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://postsapp.in'
  const adminClient = createSupabaseAdminClient()

  // 1. Fetch all published articles
  const { data: articles } = await adminClient
    .from('published_articles')
    .select('slug, language, published_at')
    .order('published_at', { ascending: false })

  // 2. Fetch categories
  const { data: categories } = await adminClient
    .from('categories')
    .select('slug, language')

  const sitemapEntries: MetadataRoute.Sitemap = []

  // Static Pages across both languages
  const locales = ['en', 'ta'] as const
  const staticPaths = ['', '/about', '/contact', '/privacy', '/terms']

  staticPaths.forEach((path) => {
    locales.forEach((locale) => {
      sitemapEntries.push({
        url: `${baseUrl}/${locale}${path}`,
        lastModified: new Date(),
        changeFrequency: path === '' ? 'hourly' : 'monthly',
        priority: path === '' ? 1.0 : 0.4,
        alternates: {
          languages: {
            en: `${baseUrl}/en${path}`,
            ta: `${baseUrl}/ta${path}`,
          },
        },
      })
    })
  })

  // Category Pages
  categories?.forEach((cat: any) => {
    sitemapEntries.push({
      url: `${baseUrl}/${cat.language}/category/${cat.slug}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.7,
    })
  })

  // Article Pages
  articles?.forEach((art: any) => {
    sitemapEntries.push({
      url: `${baseUrl}/${art.language}/article/${art.slug}`,
      lastModified: new Date(art.published_at),
      changeFrequency: 'weekly',
      priority: 0.8,
    })
  })

  return sitemapEntries
}
