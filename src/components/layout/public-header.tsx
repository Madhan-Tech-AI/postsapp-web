import React from 'react'
import Link from 'next/link'
import { getPublicCategories, getPublicSiteSettings } from '@/modules/public/public-queries'
import { getAuthenticatedUserProfile } from '@/lib/supabase/server'
import { LanguageSwitcher } from './language-switcher'
import { BreakingNewsStrip } from './breaking-news-strip'
import { formatDate } from '@/lib/utils'
import type { LanguageCode } from '@/lib/schemas'

interface PublicHeaderProps {
  locale: LanguageCode
  currentCategorySlug?: string
  translationSlug?: string | null
}

export async function PublicHeader({
  locale,
  currentCategorySlug,
  translationSlug,
}: PublicHeaderProps) {
  const [categories, settings, profile] = await Promise.all([
    getPublicCategories(locale),
    getPublicSiteSettings(),
    getAuthenticatedUserProfile(),
  ])

  const todayStr = formatDate(new Date(), locale)
  const isEditorialStaff =
    profile && ['author', 'editor', 'super_admin'].includes(profile.role)

  return (
    <header className="border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 sticky top-0 z-40">
      {/* Breaking news strip */}
      <BreakingNewsStrip
        enabled={settings.breaking_news.enabled}
        textEn={settings.breaking_news.text_en}
        textTa={settings.breaking_news.text_ta}
        locale={locale}
      />

      {/* Top Utility Bar */}
      <div className="border-b border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400 py-1.5 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <time dateTime={new Date().toISOString()}>{todayStr}</time>
            <span className="hidden sm:inline text-gray-300 dark:text-gray-700">•</span>
            <span className="hidden sm:inline text-gray-600 dark:text-gray-300">
              {locale === 'ta' ? 'உண்மை • துல்லியம் • நடுநிலை' : 'Truth • Accuracy • Impartiality'}
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <LanguageSwitcher
              currentLocale={locale}
              translationSlug={translationSlug}
            />

            {isEditorialStaff && (
              <Link
                href="/admin/articles"
                className="bg-primary-50 dark:bg-primary-950/60 text-primary-700 dark:text-primary-300 hover:bg-primary-100 px-2 py-0.5 rounded text-xs font-semibold flex items-center space-x-1"
              >
                <span>CMS</span>
                <span className="text-[10px] bg-primary-200 dark:bg-primary-800 px-1 rounded uppercase">
                  {profile.role}
                </span>
              </Link>
            )}

            {profile ? (
              <Link
                href={`/${locale}/profile`}
                className="hover:text-primary-600 font-medium flex items-center space-x-1"
              >
                <span>{profile.display_name}</span>
              </Link>
            ) : (
              <Link
                href={`/${locale}/auth/login`}
                className="text-primary-600 hover:text-primary-700 font-semibold"
              >
                {locale === 'ta' ? 'உள்நுழைக' : 'Sign In'}
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Main Branding Bar */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href={`/${locale}`} className="flex items-baseline space-x-2">
          <span className="text-2xl sm:text-3xl font-black tracking-tight text-primary-700 dark:text-primary-400">
            PostsApp
          </span>
          <span className="hidden sm:inline text-xs text-gray-500 font-medium">
            {locale === 'ta' ? 'உங்கள் செய்தி, உங்கள் மொழியில்' : 'Digital News'}
          </span>
        </Link>

        {/* Search trigger */}
        <div className="flex items-center space-x-3">
          <Link
            href={`/${locale}/search`}
            className="flex items-center space-x-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full px-3 py-1.5 transition-colors"
            aria-label="Search"
          >
            <svg
              className="w-4 h-4 text-gray-400"
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
            <span className="hidden sm:inline text-xs">
              {locale === 'ta' ? 'செய்திகளைத் தேடுங்கள்...' : 'Search news...'}
            </span>
          </Link>
        </div>
      </div>

      {/* Category Navigation Bar */}
      <nav
        className="border-t border-gray-100 dark:border-gray-800 overflow-x-auto scrollbar-none"
        aria-label="Categories"
      >
        <div className="max-w-7xl mx-auto px-4 flex items-center space-x-1 sm:space-x-2 py-2 text-xs sm:text-sm whitespace-nowrap">
          <Link
            href={`/${locale}`}
            className={`px-3 py-1 rounded-full font-medium transition-colors ${
              !currentCategorySlug
                ? 'bg-primary-600 text-white font-semibold'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
            }`}
          >
            {locale === 'ta' ? 'முகப்பு' : 'Home'}
          </Link>

          {categories.map((cat: any) => {
            const isActive = currentCategorySlug === cat.slug
            return (
              <Link
                key={cat.id}
                href={`/${locale}/category/${cat.slug}`}
                className={`px-3 py-1 rounded-full font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-600 text-white font-semibold'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {cat.name}
              </Link>
            )
          })}
        </div>
      </nav>
    </header>
  )
}
