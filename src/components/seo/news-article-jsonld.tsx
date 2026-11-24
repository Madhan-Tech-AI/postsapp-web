import React from 'react'
import type { PublicArticle } from '@/modules/public/public-queries'
import { getStorageUrl } from '@/lib/utils'

interface NewsArticleJsonLdProps {
  article: PublicArticle
  baseUrl?: string
}

/**
 * Generates Schema.org NewsArticle JSON-LD structured data
 * Following Google News guidelines and Architecture Section 10
 */
export function NewsArticleJsonLd({
  article,
  baseUrl = 'https://postsapp.in',
}: NewsArticleJsonLdProps) {
  const canonicalUrl =
    article.canonical_url || `${baseUrl}/${article.language}/article/${article.slug}`
  const imageUrl = getStorageUrl(article.cover_image_path, 'article-featured')

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': canonicalUrl,
    },
    headline: article.seo_title || article.title,
    description: article.seo_description || article.short_description || article.title,
    image: imageUrl ? [imageUrl] : [],
    datePublished: article.published_at,
    dateModified: article.published_at,
    author: {
      '@type': 'Person',
      name: article.author_display_name,
      url: article.author_slug ? `${baseUrl}/${article.language}/author/${article.author_slug}` : undefined,
    },
    publisher: {
      '@type': 'Organization',
      name: 'PostsApp',
      url: baseUrl,
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/icon.png`,
      },
    },
    inLanguage: article.language === 'ta' ? 'ta' : 'en',
    articleSection: article.category_name,
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
