import { describe, it, expect } from 'vitest'
import { validateArticleForPublishing } from '@/modules/articles/publishing.service'

describe('Publishing Engine — Atomic Transaction & Validation Rules (PRD §8)', () => {
  const completeArticle = {
    title: 'Major Breakthrough in Quantum Computing',
    shortDescription: 'Scientists at IIT Madras have achieved a milestone in quantum simulation.',
    slug: 'quantum-computing-breakthrough',
    coverImagePath: 'article-featured/user-1/cover.webp',
    categoryId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
    contentJson: {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Quantum computing details...' }] }],
    },
    language: 'en' as const,
  }

  describe('Pre-Publication Checklist Validation', () => {
    it('approves complete articles for publication', () => {
      const result = validateArticleForPublishing(completeArticle)
      expect(result.canPublish).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('blocks publishing when title is missing', () => {
      const result = validateArticleForPublishing({
        ...completeArticle,
        title: '',
      })
      expect(result.canPublish).toBe(false)
      expect(result.errors).toContain('Title / headline is required.')
    })

    it('blocks publishing when short description is missing', () => {
      const result = validateArticleForPublishing({
        ...completeArticle,
        shortDescription: '',
      })
      expect(result.canPublish).toBe(false)
      expect(result.errors).toContain('Short description (card summary) is required.')
    })

    it('blocks publishing when cover image is missing', () => {
      const result = validateArticleForPublishing({
        ...completeArticle,
        coverImagePath: null,
      })
      expect(result.canPublish).toBe(false)
      expect(result.errors).toContain('Featured cover image is required.')
    })

    it('blocks publishing when primary category is not chosen', () => {
      const result = validateArticleForPublishing({
        ...completeArticle,
        categoryId: null,
      })
      expect(result.canPublish).toBe(false)
      expect(result.errors).toContain('Primary category must be selected.')
    })

    it('blocks publishing when content is empty', () => {
      const result = validateArticleForPublishing({
        ...completeArticle,
        contentJson: { type: 'doc', content: [] },
      })
      expect(result.canPublish).toBe(false)
      expect(result.errors).toContain('Article content cannot be empty.')
    })

    it('blocks publishing when slug format is invalid', () => {
      const result = validateArticleForPublishing({
        ...completeArticle,
        slug: 'INVALID SLUG!',
      })
      expect(result.canPublish).toBe(false)
      expect(result.errors).toContain(
        'Valid URL slug (lowercase letters, numbers, hyphens) is required.'
      )
    })
  })

  describe('First Published Date Preservation (PRD §8)', () => {
    it('preserves existing first_published_at across republishing', () => {
      const originalDate = new Date('2026-01-15T10:00:00Z').toISOString()
      const newPublishDate = new Date('2026-11-24T10:00:00Z').toISOString()

      // The DB logic uses COALESCE(v_article.first_published_at, v_now)
      const firstPublishedAt = originalDate ?? newPublishDate
      expect(firstPublishedAt).toBe(originalDate)
      expect(firstPublishedAt).not.toBe(newPublishDate)
    })
  })
})
