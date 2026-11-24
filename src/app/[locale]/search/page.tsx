import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'

interface SearchPageProps {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ q?: string }>
}

export async function generateMetadata({ params }: SearchPageProps): Promise<Metadata> {
  const { locale } = await params
  return {
    title: locale === 'ta' ? 'தேடல் — PostsApp' : 'Search News — PostsApp',
  }
}

export default async function SearchPage({ params, searchParams }: SearchPageProps) {
  const { locale } = await params
  const { q } = await searchParams
  const isTa = locale === 'ta'

  return (
    <main id="main-content" className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      <header className="border-b border-gray-200 dark:border-gray-800 pb-4">
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
          {isTa ? 'செய்திகளைத் தேடுங்கள்' : 'Search Articles'}
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          {isTa
            ? 'முழு உரை தேடல் மற்றும் தலைப்பு தேடல்'
            : 'Fast full-text article search across published news'}
        </p>
      </header>

      {/* Search Input Form */}
      <form method="GET" action={`/${locale}/search`} className="flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q || ''}
          placeholder={isTa ? 'சொற்களை உள்ளிடவும்...' : 'Enter keywords to search...'}
          className="flex-1 px-4 py-2.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          required
        />
        <button
          type="submit"
          className="px-6 py-2.5 rounded-lg bg-primary-600 hover:bg-primary-700 text-white font-semibold text-sm transition-colors"
        >
          {isTa ? 'தேடு' : 'Search'}
        </button>
      </form>

      {q ? (
        <div className="py-8 text-center text-gray-500 text-sm">
          <p>
            {isTa
              ? `"${q}" க்கான தேடல் முடிவுகள்...`
              : `Searching articles matching "${q}"...`}
          </p>
          <p className="text-xs text-gray-400 mt-2">
            {isTa
              ? '(முழு PostgreSQL FTS மற்றும் pg_trgm தேடல் Phase 9-ல் செயல்படுத்தப்படும்)'
              : '(PostgreSQL Full-Text Search with pg_trgm fallback is activated in Phase 9)'}
          </p>
        </div>
      ) : (
        <div className="py-12 text-center text-gray-400 text-xs">
          <p>{isTa ? 'செய்திகளைத் தேட மேலே உள்ள பெட்டியைப் பயன்படுத்தவும்' : 'Enter keywords above to begin searching'}</p>
        </div>
      )}
    </main>
  )
}
