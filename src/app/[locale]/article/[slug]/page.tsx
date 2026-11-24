import React from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { getPublishedArticleBySlug } from '@/modules/public/public-queries'
import { getAuthenticatedUser } from '@/lib/supabase/server'
import { getArticleLikeStatus } from '@/modules/engagement/engagement.service'
import { LikeButton } from '@/modules/engagement/components/like-button'
import { ArticleRenderer } from '@/modules/articles/components/article-renderer'
import { NewsCard } from '@/components/news/news-card'
import { ShareButtons } from '@/components/news/share-buttons'
import { NewsArticleJsonLd } from '@/components/seo/news-article-jsonld'
import { formatDate, getStorageUrl } from '@/lib/utils'
import type { LanguageCode } from '@/lib/schemas'

interface ArticlePageProps {
  params: Promise<{
    locale: string
    slug: string
  }>
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { locale, slug } = await params
  const { article, translationSlug } = await getPublishedArticleBySlug(
    locale as LanguageCode,
    slug
  )

  if (!article) {
    return {
      title: 'Article Not Found — PostsApp',
    }
  }

  const otherLocale = locale === 'en' ? 'ta' : 'en'
  const canonicalUrl =
    article.canonical_url || `https://postsapp.in/${locale}/article/${article.slug}`
  const imageUrl = getStorageUrl(article.cover_image_path, 'article-featured')

  // Build hreflang alternates linking to counterpart translation if available
  const alternateLanguages: Record<string, string> = {
    [locale]: `/${locale}/article/${article.slug}`,
  }
  if (translationSlug) {
    alternateLanguages[otherLocale] = `/${otherLocale}/article/${translationSlug}`
  }

  return {
    title: `${article.seo_title || article.title} — PostsApp`,
    description: article.seo_description || article.short_description || undefined,
    alternates: {
      canonical: canonicalUrl,
      languages: alternateLanguages,
    },
    openGraph: {
      title: article.seo_title || article.title,
      description: article.seo_description || article.short_description || undefined,
      type: 'article',
      publishedTime: article.published_at,
      modifiedTime: article.published_at,
      authors: [article.author_display_name],
      url: canonicalUrl,
      images: imageUrl ? [{ url: imageUrl, alt: article.cover_image_alt || article.title }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: article.seo_title || article.title,
      description: article.seo_description || article.short_description || undefined,
      images: imageUrl ? [imageUrl] : [],
    },
  }
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { locale, slug } = await params
  const [
    { article, translationSlug, relatedArticles },
    user,
  ] = await Promise.all([
    getPublishedArticleBySlug(locale as LanguageCode, slug),
    getAuthenticatedUser(),
  ])

  // Hard gate: draft or archived articles return true 404 (Section 5 Principle 8 & Section 8)
  if (!article) {
    notFound()
  }

  const likeStatus = await getArticleLikeStatus(article.id, user?.id)

  const isTa = locale === 'ta'
  const imageUrl = getStorageUrl(article.cover_image_path, 'article-featured')
  const publishedDate = formatDate(article.published_at, locale)
  const canonicalUrl = `https://postsapp.in/${locale}/article/${article.slug}`
  const authorProfileHref = article.author_slug
    ? `/${locale}/author/${article.author_slug}`
    : null

  return (
    <>
      <NewsArticleJsonLd article={article} />

      <main id="main-content" className="max-w-4xl mx-auto px-4 py-8">
        {/* Breadcrumb Navigation */}
        <nav className="text-xs text-gray-500 mb-6 flex items-center space-x-2" aria-label="Breadcrumb">
          <Link href={`/${locale}`} className="hover:text-primary-600">
            {isTa ? 'முகப்பு' : 'Home'}
          </Link>
          <span>/</span>
          {article.category_name && article.category_slug && (
            <>
              <Link
                href={`/${locale}/category/${article.category_slug}`}
                className="hover:text-primary-600"
              >
                {article.category_name}
              </Link>
              <span>/</span>
            </>
          )}
          <span className="truncate max-w-[200px] text-gray-400">{article.title}</span>
        </nav>

        {/* Translation Banner if counterpart exists */}
        {translationSlug && (
          <div className="bg-primary-50 dark:bg-primary-950/40 border border-primary-200 dark:border-primary-800 rounded-lg p-3 mb-6 text-xs flex items-center justify-between">
            <span className="text-primary-800 dark:text-primary-300">
              {isTa
                ? 'This article is also available in English.'
                : 'இந்தக் கட்டுரை தமிழிலும் கிடைக்கிறது.'}
            </span>
            <Link
              href={`/${locale === 'en' ? 'ta' : 'en'}/article/${translationSlug}`}
              className="font-bold text-primary-600 hover:text-primary-700 underline shrink-0 ml-2"
            >
              {isTa ? 'Read in English →' : 'தமிழில் வாசிக்கவும் →'}
            </Link>
          </div>
        )}

        <article>
          {/* Header */}
          <header className="space-y-4 pb-6 border-b border-gray-100 dark:border-gray-800">
            {article.category_name && (
              <span className="inline-block text-xs font-bold uppercase tracking-wider text-primary-600 dark:text-primary-400">
                {article.category_name}
              </span>
            )}

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-gray-900 dark:text-white leading-tight tracking-tight">
              {article.title}
            </h1>

            {article.subtitle && (
              <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 leading-relaxed font-normal">
                {article.subtitle}
              </p>
            )}

            {/* Byline and Published Date */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 text-xs text-gray-500 dark:text-gray-400">
              <div className="flex items-center space-x-3">
                {article.author_avatar_url ? (
                  <div className="relative w-10 h-10 rounded-full overflow-hidden bg-gray-200">
                    <Image
                      src={article.author_avatar_url}
                      alt={article.author_display_name}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900 text-primary-700 dark:text-primary-300 font-bold flex items-center justify-center text-sm">
                    {article.author_display_name.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="font-semibold text-gray-900 dark:text-white text-sm">
                    {authorProfileHref ? (
                      <Link href={authorProfileHref} className="hover:text-primary-600 hover:underline">
                        {article.author_display_name}
                      </Link>
                    ) : (
                      article.author_display_name
                    )}
                  </div>
                  <div className="flex items-center space-x-1.5 mt-0.5">
                    <time dateTime={article.published_at}>{publishedDate}</time>
                    <span>•</span>
                    <span>{article.reading_time_minutes} {isTa ? 'நிமிட வாசிப்பு' : 'min read'}</span>
                  </div>
                </div>
              </div>

              {/* Share links */}
              <ShareButtons
                url={canonicalUrl}
                title={article.title}
                locale={locale}
              />
            </div>
          </header>

          {/* Featured Image */}
          {imageUrl && (
            <figure className="my-8">
              <div className="relative aspect-[16/9] w-full rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 shadow">
                <Image
                  src={imageUrl}
                  alt={article.cover_image_alt || article.title}
                  fill
                  priority
                  sizes="(max-width: 896px) 100vw, 896px"
                  className="object-cover"
                />
              </div>
              {article.cover_image_alt && (
                <figcaption className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center italic">
                  {article.cover_image_alt}
                </figcaption>
              )}
            </figure>
          )}

          {/* Body Content — Controlled TipTap Renderer (No dangerouslySetInnerHTML) */}
          <div className="my-8 leading-relaxed font-sans text-gray-900 dark:text-gray-100">
            <ArticleRenderer content={article.content_json} />
          </div>

          {/* Engagement / Footer Bar (Like & Share) */}
          <div className="my-10 pt-6 border-t border-b border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-4 py-4">
            <LikeButton
              articleId={article.id}
              initialLiked={likeStatus.liked}
              initialCount={likeStatus.likeCount}
              locale={locale}
              slug={article.slug}
              isAuthenticated={!!user}
            />

            <ShareButtons
              url={canonicalUrl}
              title={article.title}
              locale={locale}
            />
          </div>
        </article>

        {/* Related Articles Section */}
        {relatedArticles.length > 0 && (
          <section className="mt-14 space-y-4" aria-label="Related Articles">
            <h3 className="text-lg font-black uppercase tracking-tight text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-800 pb-2">
              {isTa ? 'தொடர்புடைய கட்டுரைகள்' : 'Related Articles'}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {relatedArticles.map((rel) => (
                <NewsCard key={rel.id} article={rel} locale={locale} />
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  )
}
