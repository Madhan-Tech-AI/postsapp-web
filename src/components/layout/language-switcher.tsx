'use client'

import React from 'react'
import { usePathname, useRouter } from 'next/navigation'

interface LanguageSwitcherProps {
  currentLocale: string
  translationSlug?: string | null
  className?: string
}

export function LanguageSwitcher({
  currentLocale,
  translationSlug,
  className = '',
}: LanguageSwitcherProps) {
  const pathname = usePathname()
  const router = useRouter()

  function switchLanguage(targetLocale: 'en' | 'ta') {
    if (targetLocale === currentLocale) return

    // If on an article page and we have a translation counterpart slug
    if (translationSlug && pathname.includes('/article/')) {
      router.push(`/${targetLocale}/article/${translationSlug}`)
      return
    }

    // Otherwise swap the leading locale segment
    const segments = pathname.split('/')
    if (segments[1] === 'en' || segments[1] === 'ta') {
      segments[1] = targetLocale
      router.push(segments.join('/') || `/${targetLocale}`)
    } else {
      router.push(`/${targetLocale}`)
    }
  }

  return (
    <div
      className={`inline-flex items-center rounded-lg bg-gray-100 dark:bg-gray-800 p-0.5 text-xs font-medium ${className}`}
      role="group"
      aria-label="Language selection"
    >
      <button
        type="button"
        onClick={() => switchLanguage('en')}
        className={`px-2.5 py-1 rounded-md transition-colors ${
          currentLocale === 'en'
            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm font-semibold'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
        }`}
        aria-pressed={currentLocale === 'en'}
      >
        English
      </button>
      <button
        type="button"
        onClick={() => switchLanguage('ta')}
        className={`px-2.5 py-1 rounded-md transition-colors ${
          currentLocale === 'ta'
            ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm font-semibold'
            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
        }`}
        aria-pressed={currentLocale === 'ta'}
      >
        தமிழ்
      </button>
    </div>
  )
}
