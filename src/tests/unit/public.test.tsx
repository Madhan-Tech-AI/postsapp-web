import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NewsArticleJsonLd } from '@/components/seo/news-article-jsonld'
import { ShareButtons } from '@/components/news/share-buttons'
import { BreakingNewsStrip } from '@/components/layout/breaking-news-strip'
import { LanguageSwitcher } from '@/components/layout/language-switcher'
import { NewsCard } from '@/components/news/news-card'
import type { PublicArticle } from '@/modules/public/public-queries'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: () => '/en/article/test-story',
  useRouter: () => ({
    push: vi.fn(),
  }),
}))

// Mock next/image to render standard img
vi.mock('next/image', () => ({
  default: ({ src, alt, fill, ...props }: any) => <img src={src} alt={alt} {...props} />,
}))

const mockArticle: PublicArticle = {
  id: 'a0000000-0000-0000-0000-000000000001',
  translation_group_id: 't0000000-0000-0000-0000-000000000001',
  language: 'en',
  title: 'Global Tech Summit Concludes in Chennai',
  subtitle: 'Leaders discuss future of AI governance',
  short_description: 'Key takeaways and agreements from the summit.',
  slug: 'global-tech-summit-chennai',
  content_json: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Content' }] }] },
  cover_image_path: 'article-featured/user1/test.webp',
  cover_image_alt: 'Tech Summit Stage',
  author_id: 'u0000000-0000-0000-0000-000000000001',
  author_display_name: 'Priya Raman',
  author_avatar_url: null,
  author_bio: 'Senior Technology Correspondent',
  author_slug: 'priya-raman',
  status: 'published',
  published_at: '2026-11-24T06:00:00Z',
  first_published_at: '2026-11-24T06:00:00Z',
  reading_time_minutes: 4,
  seo_title: 'Global Tech Summit Concludes in Chennai — PostsApp',
  seo_description: 'Key takeaways and agreements from the summit.',
  canonical_url: 'https://postsapp.in/en/article/global-tech-summit-chennai',
  view_count: 120,
  like_count: 15,
  category_name: 'Technology',
  category_slug: 'technology',
}

describe('Phase 7: Public News Website Components', () => {
  describe('NewsArticleJsonLd', () => {
    it('generates valid Schema.org NewsArticle JSON-LD structured data', () => {
      const { container } = render(
        <NewsArticleJsonLd article={mockArticle} baseUrl="https://postsapp.in" />
      )
      const script = container.querySelector('script[type="application/ld+json"]')
      expect(script).not.toBeNull()

      const parsed = JSON.parse(script!.textContent || '{}')
      expect(parsed['@context']).toBe('https://schema.org')
      expect(parsed['@type']).toBe('NewsArticle')
      expect(parsed.headline).toBe('Global Tech Summit Concludes in Chennai — PostsApp')
      expect(parsed.mainEntityOfPage['@id']).toBe(
        'https://postsapp.in/en/article/global-tech-summit-chennai'
      )
      expect(parsed.author.name).toBe('Priya Raman')
      expect(parsed.publisher.name).toBe('PostsApp')
      expect(parsed.inLanguage).toBe('en')
      expect(parsed.articleSection).toBe('Technology')
    })
  })

  describe('ShareButtons', () => {
    it('renders canonical share targets with encoded parameters', () => {
      render(
        <ShareButtons
          url="https://postsapp.in/en/article/global-tech-summit-chennai"
          title="Global Tech Summit Concludes in Chennai"
          locale="en"
        />
      )

      const waLink = screen.getByLabelText('Share on WhatsApp') as HTMLAnchorElement
      expect(waLink).toBeInTheDocument()
      expect(waLink.href).toContain('api.whatsapp.com/send')
      expect(waLink.href).toContain(encodeURIComponent('https://postsapp.in/en/article/global-tech-summit-chennai'))

      const xLink = screen.getByLabelText('Share on X') as HTMLAnchorElement
      expect(xLink).toBeInTheDocument()
      expect(xLink.href).toContain('twitter.com/intent/tweet')

      const copyBtn = screen.getByLabelText('Copy article link')
      expect(copyBtn).toBeInTheDocument()
    })
  })

  describe('BreakingNewsStrip', () => {
    it('renders breaking news banner when enabled', () => {
      render(
        <BreakingNewsStrip
          enabled={true}
          textEn="Election results declared in 5 states"
          textTa="5 மாநில தேர்தல் முடிவுகள் அறிவிப்பு"
          locale="en"
        />
      )

      expect(screen.getByText('BREAKING')).toBeInTheDocument()
      expect(screen.getByText('Election results declared in 5 states')).toBeInTheDocument()
    })

    it('renders Tamil text when locale is ta', () => {
      render(
        <BreakingNewsStrip
          enabled={true}
          textEn="Election results declared in 5 states"
          textTa="5 மாநில தேர்தல் முடிவுகள் அறிவிப்பு"
          locale="ta"
        />
      )

      expect(screen.getByText('முக்கிய செய்தி')).toBeInTheDocument()
      expect(screen.getByText('5 மாநில தேர்தல் முடிவுகள் அறிவிப்பு')).toBeInTheDocument()
    })

    it('renders null when disabled', () => {
      const { container } = render(
        <BreakingNewsStrip
          enabled={false}
          textEn="Election results declared"
          textTa="தேர்தல் முடிவுகள்"
          locale="en"
        />
      )
      expect(container.firstChild).toBeNull()
    })
  })

  describe('LanguageSwitcher', () => {
    it('renders language buttons with active state', () => {
      render(<LanguageSwitcher currentLocale="en" />)

      const enBtn = screen.getByText('English')
      const taBtn = screen.getByText('தமிழ்')

      expect(enBtn).toHaveAttribute('aria-pressed', 'true')
      expect(taBtn).toHaveAttribute('aria-pressed', 'false')
    })
  })

  describe('NewsCard', () => {
    it('renders card with headline, category, author, and reading time', () => {
      render(<NewsCard article={mockArticle} locale="en" />)

      expect(screen.getByText('Global Tech Summit Concludes in Chennai')).toBeInTheDocument()
      expect(screen.getByText('Technology')).toBeInTheDocument()
      expect(screen.getByText('Priya Raman')).toBeInTheDocument()
      expect(screen.getByText(/4 min read/)).toBeInTheDocument()
    })

    it('renders compact variant', () => {
      render(<NewsCard article={mockArticle} locale="en" compact />)

      expect(screen.getByText('Global Tech Summit Concludes in Chennai')).toBeInTheDocument()
      expect(screen.getByText('Technology')).toBeInTheDocument()
    })
  })
})
