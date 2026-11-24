import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { getStorageUrl, formatDate } from '@/lib/utils'
import type { PublicArticle } from '@/modules/public/public-queries'

interface HeroNewsCardProps {
  article: PublicArticle
  locale: string
}

export function HeroNewsCard({ article, locale }: HeroNewsCardProps) {
  const imageUrl = getStorageUrl(article.cover_image_path, 'article-featured')
  const articleHref = `/${locale}/article/${article.slug}`
  const publishedDate = formatDate(article.published_at, locale)

  return (
    <article className="group relative bg-gray-900 rounded-xl overflow-hidden shadow-lg">
      <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[380px] lg:min-h-[440px]">
        {/* Cover Image */}
        <div className="lg:col-span-7 relative h-64 lg:h-full w-full bg-gray-800 overflow-hidden">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={article.cover_image_alt || article.title}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 60vw"
              className="object-cover group-hover:scale-102 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-800 to-primary-950 text-white font-black text-4xl">
              PostsApp
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950/80 via-transparent lg:hidden" />
        </div>

        {/* Story details */}
        <div className="lg:col-span-5 p-6 lg:p-8 flex flex-col justify-between bg-gradient-to-b from-gray-900 to-gray-950 text-white">
          <div>
            {article.category_name && (
              <span className="inline-block bg-primary-600 text-white font-bold text-xs uppercase tracking-widest px-2.5 py-1 rounded mb-3">
                {article.category_name}
              </span>
            )}

            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black leading-tight tracking-tight group-hover:text-primary-300 transition-colors">
              <Link href={articleHref}>{article.title}</Link>
            </h1>

            {article.subtitle && (
              <p className="mt-2 text-sm text-gray-300 font-medium line-clamp-2">
                {article.subtitle}
              </p>
            )}

            {article.short_description && (
              <p className="mt-3 text-xs sm:text-sm text-gray-400 line-clamp-3 leading-relaxed">
                {article.short_description}
              </p>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-800 flex items-center justify-between text-xs text-gray-400">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-white">
                {article.author_display_name}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span>{publishedDate}</span>
              <span>•</span>
              <span>{article.reading_time_minutes} min read</span>
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}
