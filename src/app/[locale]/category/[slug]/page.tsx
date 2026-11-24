import React from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getCategoryArticles } from '@/modules/public/public-queries'
import { NewsCard } from '@/components/news/news-card'
import type { LanguageCode } from '@/lib/schemas'

interface CategoryPageProps {
  params: Promise<{
    locale: string
    slug: string
  }>
  searchParams: Promise<{
    page?: string
  }>
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { locale, slug } = await params
  const result = await getCategoryArticles(locale as LanguageCode, slug, 1, 1)

  if (!result || !result.category) {
    return {
      title: 'Category Not Found — PostsApp',
    }
  }

  const catName = result.category.name
  const isTa = locale === 'ta'
  const title = `${catName} — PostsApp`
  const description = isTa
    ? `PostsApp-ல் ${catName} தொடர்பான சமீபத்திய முக்கிய செய்திகள்.`
    : `Latest news and updates in ${catName} on PostsApp.`

  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/category/${slug}`,
    },
    openGraph: {
      title,
      description,
      type: 'website',
    },
  }
}

export default async function CategoryPage({ params, searchParams }: CategoryPageProps) {
  const { locale, slug } = await params
  const { page: pageStr } = await searchParams

  const page = Math.max(1, parseInt(pageStr || '1', 10) || 1)
  const limit = 12

  const result = await getCategoryArticles(
    locale as LanguageCode,
    slug,
    page,
    limit
  )

  if (!result || !result.category) {
    notFound()
  }

  const { category, articles, totalCount } = result
  const totalPages = Math.ceil(totalCount / limit)
  const isTa = locale === 'ta'

  return (
    <main id="main-content" className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Category Header */}
      <header className="border-b border-gray-200 dark:border-gray-800 pb-4">
        <div className="flex items-center space-x-2 text-xs text-gray-500 mb-2">
          <Link href={`/${locale}`} className="hover:text-primary-600">
            {isTa ? 'முகப்பு' : 'Home'}
          </Link>
          <span>/</span>
          <span className="text-gray-900 dark:text-white font-medium">{category.name}</span>
        </div>
        <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
          {category.name}
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          {totalCount} {isTa ? 'கட்டுரைகள்' : 'articles'}
        </p>
      </header>

      {/* Articles Grid */}
      {articles.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((article) => (
            <NewsCard key={article.id} article={article} locale={locale} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border border-dashed border-gray-200 dark:border-gray-800 rounded-lg">
          <p className="text-gray-500">
            {isTa
              ? 'இந்த பிரிவில் இன்னும் செய்திகள் வெளியிடப்படவில்லை.'
              : 'No articles published in this category yet.'}
          </p>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <nav
          className="flex items-center justify-center space-x-2 pt-8 border-t border-gray-100 dark:border-gray-800 text-sm"
          aria-label="Pagination"
        >
          {page > 1 && (
            <Link
              href={`/${locale}/category/${slug}?page=${page - 1}`}
              className="px-3 py-1.5 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-semibold"
            >
              {isTa ? '← முந்தையது' : '← Previous'}
            </Link>
          )}

          <span className="text-xs text-gray-500 px-3">
            {page} / {totalPages}
          </span>

          {page < totalPages && (
            <Link
              href={`/${locale}/category/${slug}?page=${page + 1}`}
              className="px-3 py-1.5 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 text-xs font-semibold"
            >
              {isTa ? 'அடுத்தது →' : 'Next →'}
            </Link>
          )}
        </nav>
      )}
    </main>
  )
}
