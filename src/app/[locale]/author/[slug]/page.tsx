import React from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getPublicAuthorProfile } from '@/modules/public/public-queries'
import { NewsCard } from '@/components/news/news-card'
import type { LanguageCode } from '@/lib/schemas'

interface AuthorPageProps {
  params: Promise<{
    locale: string
    slug: string
  }>
}

export async function generateMetadata({ params }: AuthorPageProps): Promise<Metadata> {
  const { locale, slug } = await params
  const result = await getPublicAuthorProfile(locale as LanguageCode, slug)

  if (!result || !result.author) {
    return {
      title: 'Author Not Found — PostsApp',
    }
  }

  const authorName = result.author.displayName || 'Author'
  const isTa = locale === 'ta'
  const title = `${authorName} — PostsApp`
  const description = isTa
    ? `PostsApp ஆசிரியர் ${authorName}-ன் சுயவிவரம் மற்றும் கட்டுரைகள்.`
    : `Articles and biography of ${authorName} on PostsApp.`

  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/author/${slug}`,
    },
    openGraph: {
      title,
      description,
      type: 'profile',
    },
  }
}

export default async function AuthorPage({ params }: AuthorPageProps) {
  const { locale, slug } = await params
  const result = await getPublicAuthorProfile(locale as LanguageCode, slug)

  if (!result || !result.author) {
    notFound()
  }

  const { author, articles } = result
  const isTa = locale === 'ta'

  return (
    <main id="main-content" className="max-w-5xl mx-auto px-4 py-8 space-y-10">
      {/* Author Bio Header Card */}
      <section className="bg-gray-50 dark:bg-gray-900/60 rounded-xl p-6 sm:p-8 border border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
        {author.avatarUrl ? (
          <div className="relative w-24 h-24 rounded-full overflow-hidden bg-gray-200 shrink-0 shadow">
            <Image
              src={author.avatarUrl}
              alt={author.displayName || 'Author'}
              fill
              className="object-cover"
            />
          </div>
        ) : (
          <div className="w-24 h-24 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 font-bold text-3xl flex items-center justify-center shrink-0 shadow">
            {(author.displayName || 'A').charAt(0).toUpperCase()}
          </div>
        )}

        <div className="flex-1 text-center sm:text-left space-y-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
            {isTa ? 'ஆசிரியர்' : 'Staff Writer'}
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
            {author.displayName}
          </h1>

          {author.bio && (
            <p className="text-sm text-gray-600 dark:text-gray-300 max-w-2xl leading-relaxed">
              {author.bio}
            </p>
          )}

          {/* Social links */}
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-2 text-xs">
            {author.twitterUrl && (
              <a
                href={author.twitterUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:underline"
              >
                Twitter / X ↗
              </a>
            )}
            {author.facebookUrl && (
              <a
                href={author.facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:underline"
              >
                Facebook ↗
              </a>
            )}
            {author.websiteUrl && (
              <a
                href={author.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:underline"
              >
                Website ↗
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Author Articles */}
      <section className="space-y-4" aria-label="Author Articles">
        <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight border-b border-gray-200 dark:border-gray-800 pb-2">
          {isTa ? `${author.displayName}-ன் கட்டுரைகள்` : `Articles by ${author.displayName}`}
        </h2>

        {articles.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article) => (
              <NewsCard key={article.id} article={article} locale={locale} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border border-dashed border-gray-200 dark:border-gray-800 rounded-lg">
            <p className="text-gray-500">
              {isTa ? 'கட்டுரைகள் எதுவும் இல்லை.' : 'No articles published yet.'}
            </p>
          </div>
        )}
      </section>
    </main>
  )
}
