'use client'

import React, { useState, useEffect, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { NewsCard } from '@/components/news/news-card'
import type { PublicArticle } from '@/modules/public/public-queries'

interface CategoryItem {
  id: string
  name: string
  slug: string
}

interface SearchClientProps {
  locale: string
  initialQuery: string
  initialCategory: string
  initialArticles: PublicArticle[]
  categories: CategoryItem[]
}

/** Highlight matching words in text */
function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query || query.trim().length === 0) return <span>{text}</span>

  const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'))

  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-amber-200 dark:bg-amber-800 text-gray-900 dark:text-white rounded px-0.5">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </span>
  )
}

export function SearchClient({
  locale,
  initialQuery,
  initialCategory,
  initialArticles,
  categories,
}: SearchClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [query, setQuery] = useState(initialQuery)
  const [selectedCategory, setSelectedCategory] = useState(initialCategory)
  const [articles, setArticles] = useState<PublicArticle[]>(initialArticles)
  const [isPending, startTransition] = useTransition()

  const isTa = locale === 'ta'

  // Debounced input handler syncing with URL
  useEffect(() => {
    const handler = setTimeout(() => {
      const currentQ = searchParams.get('q') || ''
      const currentCat = searchParams.get('cat') || ''

      if (query !== currentQ || selectedCategory !== currentCat) {
        startTransition(() => {
          const params = new URLSearchParams()
          if (query.trim()) params.set('q', query.trim())
          if (selectedCategory) params.set('cat', selectedCategory)

          router.replace(`/${locale}/search?${params.toString()}`)
        })
      }
    }, 350)

    return () => clearTimeout(handler)
  }, [query, selectedCategory, locale, router, searchParams])

  // Sync initial articles when props change via server navigation
  useEffect(() => {
    setArticles(initialArticles)
  }, [initialArticles])

  return (
    <div className="space-y-6">
      {/* Search Input Bar */}
      <div className="relative">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={isTa ? 'செய்திகளைத் தேடுங்கள்...' : 'Search articles by headline or topic...'}
          className="w-full px-4 py-3 pl-11 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          autoFocus
        />
        <svg
          className="absolute left-3.5 top-3.5 w-5 h-5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 1114 0z"
          />
        </svg>

        {isPending && (
          <div className="absolute right-3.5 top-3.5">
            <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Category Filter Chips */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none text-xs">
        <button
          type="button"
          onClick={() => setSelectedCategory('')}
          className={`px-3 py-1.5 rounded-full font-medium transition-colors whitespace-nowrap ${
            !selectedCategory
              ? 'bg-primary-600 text-white font-semibold'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
          }`}
        >
          {isTa ? 'அனைத்து பிரிவுகளும்' : 'All Categories'}
        </button>

        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelectedCategory(cat.slug === selectedCategory ? '' : cat.slug)}
            className={`px-3 py-1.5 rounded-full font-medium transition-colors whitespace-nowrap ${
              selectedCategory === cat.slug
                ? 'bg-primary-600 text-white font-semibold'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Results Header */}
      {query.trim().length >= 2 && (
        <div className="text-xs text-gray-500 flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
          <span>
            {isTa
              ? `"${query}" க்கான முடிவுகள் (${articles.length})`
              : `Results for "${query}" (${articles.length})`}
          </span>
          {isPending && (
            <span className="italic text-primary-600">
              {isTa ? 'தேடுகிறது...' : 'Searching...'}
            </span>
          )}
        </div>
      )}

      {/* Results Grid */}
      {articles.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
          {articles.map((article) => (
            <NewsCard key={article.id} article={article} locale={locale} />
          ))}
        </div>
      ) : query.trim().length >= 2 ? (
        <div className="text-center py-16 border border-dashed border-gray-200 dark:border-gray-800 rounded-xl space-y-3">
          <p className="text-gray-700 dark:text-gray-300 font-semibold text-sm">
            {isTa
              ? `"${query}" க்கு எந்த கட்டுரையும் கிடைக்கவில்லை.`
              : `No articles found matching "${query}".`}
          </p>
          <p className="text-xs text-gray-500">
            {isTa
              ? 'வேறு முக்கிய வார்த்தைகளைப் பயன்படுத்தவும் அல்லது வகை வடிகட்டியை மாற்றவும்.'
              : 'Try different search keywords or remove the category filter.'}
          </p>
        </div>
      ) : (
        <div className="text-center py-12 text-xs text-gray-400">
          <p>
            {isTa
              ? 'தேடலைத் தொடங்க குறைந்தபட்சம் 2 எழுத்துக்களை உள்ளிடவும்.'
              : 'Enter at least 2 characters to search across published news.'}
          </p>
        </div>
      )}
    </div>
  )
}
