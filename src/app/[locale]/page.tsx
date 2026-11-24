import React from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { setRequestLocale } from 'next-intl/server'
import { getHomepageFeed, getPublicCategories } from '@/modules/public/public-queries'
import { getTrendingAndMostRead } from '@/modules/engagement/trending.service'
import { HeroNewsCard } from '@/components/news/hero-news-card'
import { NewsCard } from '@/components/news/news-card'
import type { LanguageCode } from '@/lib/schemas'

interface HomePageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: HomePageProps): Promise<Metadata> {
  const { locale } = await params
  const isTa = locale === 'ta'
  const title = isTa
    ? 'PostsApp — உங்கள் செய்தி, உங்கள் மொழியில் | தமிழ் டிஜிட்டல் செய்தி'
    : 'PostsApp — Your News, Your Language | Digital News Platform'
  const description = isTa
    ? 'தேசிய, சர்வதேச, அரசியல், தொழில்நுட்பம் மற்றும் வணிக செய்திகளை தமிழில் உடனுக்குடன் தெரிந்துகொள்ளுங்கள்.'
    : 'Bilingual digital news publishing platform delivering accurate and impartial journalism in English and Tamil.'

  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}`,
      languages: {
        'en': '/en',
        'ta': '/ta',
        'x-default': '/en',
      },
    },
    openGraph: {
      title,
      description,
      type: 'website',
      url: `/${locale}`,
      siteName: 'PostsApp',
      locale: isTa ? 'ta_IN' : 'en_US',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params
  setRequestLocale(locale)
  const lang = locale as LanguageCode
  const isTa = lang === 'ta'

  const [{ featured, latest, remaining }, categories, { trending }] = await Promise.all([
    getHomepageFeed(lang),
    getPublicCategories(lang),
    getTrendingAndMostRead(lang, 5),
  ])

  return (
    <main id="main-content" className="max-w-7xl mx-auto px-4 py-6 sm:py-8 space-y-12">
      {/* 1. Hero Featured Section */}
      {featured ? (
        <section aria-label="Featured Story">
          <HeroNewsCard article={featured} locale={locale} />
        </section>
      ) : (
        <div className="text-center py-12 border border-dashed border-gray-200 dark:border-gray-800 rounded-lg">
          <p className="text-gray-500">
            {isTa ? 'செய்திகள் விரைவில் பதிவேற்றப்படும்.' : 'No stories published yet. Stay tuned.'}
          </p>
        </div>
      )}

      {/* 2. Latest Stories Grid */}
      {latest.length > 0 && (
        <section aria-label="Latest News" className="space-y-4">
          <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-2">
            <h2 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-primary-600 inline-block" />
              <span>{isTa ? 'சமீபத்திய செய்திகள்' : 'Latest News'}</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {latest.map((article) => (
              <NewsCard key={article.id} article={article} locale={locale} />
            ))}
          </div>
        </section>
      )}

      {/* 3. Trending & Category Highlights */}
      {remaining.length > 0 && (
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-4">
          {/* Main Feed Column */}
          <div className="lg:col-span-8 space-y-6">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-800 pb-2">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white uppercase tracking-tight">
                {isTa ? 'மேலும் செய்திகள்' : 'More Stories'}
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {remaining.slice(0, 4).map((article) => (
                <NewsCard key={article.id} article={article} locale={locale} />
              ))}
            </div>
          </div>

          {/* Sidebar: Trending / Compact list */}
          <aside className="lg:col-span-4 space-y-6">
            {trending.length > 0 && (
              <div className="bg-gray-50 dark:bg-gray-900/60 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
                <h3 className="text-sm font-black uppercase tracking-wider text-gray-900 dark:text-white mb-3 flex items-center space-x-2">
                  <span className="text-primary-600">★</span>
                  <span>{isTa ? 'பிரபலமானவை' : 'Trending'}</span>
                </h3>
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {trending.map((article) => (
                    <NewsCard key={article.id} article={article} locale={locale} compact />
                  ))}
                </div>
              </div>
            )}

            {/* Category Chips Cloud */}
            <div className="bg-gray-50 dark:bg-gray-900/60 p-4 rounded-xl border border-gray-100 dark:border-gray-800">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white mb-3">
                {isTa ? 'வகைகள்' : 'Explore Categories'}
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {categories.map((cat: any) => (
                  <Link
                    key={cat.id}
                    href={`/${locale}/category/${cat.slug}`}
                    className="text-xs bg-white dark:bg-gray-800 hover:bg-primary-50 dark:hover:bg-primary-950 border border-gray-200 dark:border-gray-700 px-2.5 py-1 rounded-full text-gray-700 dark:text-gray-300 hover:text-primary-600 transition-colors"
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </section>
      )}
    </main>
  )
}
