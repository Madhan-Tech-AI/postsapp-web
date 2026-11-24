import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { getStorageUrl, formatRelativeDate } from '@/lib/utils'
import type { PublicArticle } from '@/modules/public/public-queries'

interface NewsCardProps {
  article: PublicArticle
  locale: string
  compact?: boolean
}

export function NewsCard({ article, locale, compact = false }: NewsCardProps) {
  const imageUrl = getStorageUrl(article.cover_image_path, 'article-featured')
  const articleHref = `/${locale}/article/${article.slug}`
  const relativeDate = formatRelativeDate(article.published_at, locale)

  if (compact) {
    return (
      <article className="group flex space-x-3 items-start py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
        {imageUrl ? (
          <Link href={articleHref} className="relative w-20 h-16 shrink-0 rounded overflow-hidden bg-gray-100 dark:bg-gray-800">
            <Image
              src={imageUrl}
              alt={article.cover_image_alt || article.title}
              fill
              sizes="80px"
              className="object-cover group-hover:scale-105 transition-transform duration-200"
            />
          </Link>
        ) : (
          <Link href={articleHref} className="w-20 h-16 shrink-0 rounded bg-primary-50 dark:bg-primary-950 flex items-center justify-center text-primary-400 font-bold text-xs">
            PA
          </Link>
        )}
        <div className="flex-1 min-w-0">
          {article.category_name && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
              {article.category_name}
            </span>
          )}
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 leading-snug group-hover:text-primary-600 transition-colors">
            <Link href={articleHref}>{article.title}</Link>
          </h4>
          <div className="text-[11px] text-gray-400 mt-1 flex items-center space-x-2">
            <span>{relativeDate}</span>
            <span>•</span>
            <span>{article.reading_time_minutes} min</span>
          </div>
        </div>
      </article>
    )
  }

  return (
    <article className="group flex flex-col bg-white dark:bg-gray-900 rounded-lg overflow-hidden border border-gray-100 dark:border-gray-800 hover:shadow-md transition-shadow">
      {/* Thumbnail */}
      <Link href={articleHref} className="relative aspect-[16/9] w-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={article.cover_image_alt || article.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-tr from-primary-700 to-primary-500 text-white font-black text-2xl">
            PostsApp
          </div>
        )}
      </Link>

      {/* Content */}
      <div className="p-4 flex flex-col flex-1 justify-between">
        <div>
          {article.category_name && (
            <div className="mb-2">
              <span className="inline-block text-[11px] font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
                {article.category_name}
              </span>
            </div>
          )}

          <h3 className="text-base font-bold text-gray-900 dark:text-white line-clamp-2 leading-snug group-hover:text-primary-600 transition-colors">
            <Link href={articleHref}>{article.title}</Link>
          </h3>

          {article.short_description && (
            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
              {article.short_description}
            </p>
          )}
        </div>

        {/* Byline / meta */}
        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span className="font-medium truncate max-w-[140px]">
            {article.author_display_name}
          </span>
          <div className="flex items-center space-x-1 shrink-0 text-[11px]">
            <span>{relativeDate}</span>
            <span>•</span>
            <span>{article.reading_time_minutes} min read</span>
          </div>
        </div>
      </div>
    </article>
  )
}
