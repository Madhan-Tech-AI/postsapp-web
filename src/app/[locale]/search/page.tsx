import React, { Suspense } from 'react'
import type { Metadata } from 'next'
import { searchPublishedArticles } from '@/modules/search/search.service'
import { getPublicCategories } from '@/modules/public/public-queries'
import { SearchClient } from './search-client'
import type { LanguageCode } from '@/lib/schemas'

interface SearchPageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ q?: string; cat?: string }>
}

export async function generateMetadata({ params, searchParams }: SearchPageProps): Promise<Metadata> {
  const { locale } = await params
  const { q } = await searchParams
  const isTa = locale === 'ta'

  const title = q
    ? isTa
      ? `"${q}" — தேடல் முடிவுகள் | PostsApp`
      : `"${q}" — Search Results | PostsApp`
    : isTa
    ? 'செய்திகளைத் தேடுங்கள் — PostsApp'
    : 'Search Articles — PostsApp'

  return {
    title,
    robots: { index: false, follow: true },
  }
}

export default async function SearchPage({ params, searchParams }: SearchPageProps) {
  const { locale } = await params
  const { q, cat } = await searchParams
  const lang = locale as LanguageCode

  const query = q?.trim() || ''
  const category = cat?.trim() || ''

  const [searchResult, categories] = await Promise.all([
    query.length >= 2
      ? searchPublishedArticles({
          query,
          language: lang,
          categorySlug: category || null,
          limit: 18,
        })
      : Promise.resolve({ articles: [], totalCount: 0, query }),
    getPublicCategories(lang),
  ])

  return (
    <main id="main-content" className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <header className="border-b border-gray-200 dark:border-gray-800 pb-4">
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
          {locale === 'ta' ? 'செய்தித் தேடல்' : 'Search Articles'}
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          {locale === 'ta'
            ? 'முழு உரை தேடல் மற்றும் தலைப்புகள்'
            : 'Fast full-text search across published news stories'}
        </p>
      </header>

      <Suspense fallback={<div className="h-64 animate-pulse bg-gray-100 dark:bg-gray-900 rounded-lg" />}>
        <SearchClient
          locale={locale}
          initialQuery={query}
          initialCategory={category}
          initialArticles={searchResult.articles}
          categories={categories as any}
        />
      </Suspense>
    </main>
  )
}
