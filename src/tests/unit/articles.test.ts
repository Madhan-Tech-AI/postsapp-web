import { describe, it, expect } from 'vitest'
import { articleDraftSchema, articlePublishSchema } from '@/lib/schemas'
import { DELETE_SOFT_FOR_AUTHORS } from '@/lib/constants'

describe('Article CRUD & Bilingual Architecture Rules (PRD §3.1, §6)', () => {
  const validDraftDoc = {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Sample text' }] }],
  }

  describe('Draft Validation', () => {
    it('accepts valid article draft with minimal fields', () => {
      const draft = {
        title: 'New Technology Breakthrough',
        slug: 'new-technology-breakthrough',
        language: 'en' as const,
        contentJson: validDraftDoc,
      }
      const result = articleDraftSchema.safeParse(draft)
      expect(result.success).toBe(true)
    })

    it('rejects invalid slug format', () => {
      const draft = {
        title: 'Invalid Slug',
        slug: 'INVALID SLUG with spaces & $pecial!',
        language: 'en' as const,
        contentJson: validDraftDoc,
      }
      const result = articleDraftSchema.safeParse(draft)
      expect(result.success).toBe(false)
    })

    it('requires language to be en or ta', () => {
      const draft = {
        title: 'French Article',
        slug: 'french-article',
        language: 'fr' as any,
        contentJson: validDraftDoc,
      }
      const result = articleDraftSchema.safeParse(draft)
      expect(result.success).toBe(false)
    })
  })

  describe('Publishing Validation Requirements (PRD §6)', () => {
    it('rejects publishing when coverImagePath or shortDescription is missing', () => {
      const incompletePublish = {
        title: 'Breaking Story',
        slug: 'breaking-story',
        language: 'ta' as const,
        contentJson: validDraftDoc,
        // Missing shortDescription, coverImagePath, categoryId
      }
      const result = articlePublishSchema.safeParse(incompletePublish)
      expect(result.success).toBe(false)
    })

    it('accepts publishing when all mandatory fields are present', () => {
      const completePublish = {
        title: 'Breaking Story In Tamil',
        shortDescription: 'This is a complete short description for preview cards.',
        slug: 'breaking-story-tamil',
        language: 'ta' as const,
        contentJson: validDraftDoc,
        coverImagePath: 'article-featured/test-user/cover.webp',
        categoryId: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
      }
      const result = articlePublishSchema.safeParse(completePublish)
      expect(result.success).toBe(true)
    })
  })

  describe('Bilingual Linking & Delete Policies (PRD §15)', () => {
    it('confirms DELETE_SOFT_FOR_AUTHORS constant default is true (Authors archive)', () => {
      expect(DELETE_SOFT_FOR_AUTHORS).toBe(true)
    })

    it('allows same slug in different languages (unique per language)', () => {
      const enArticle = {
        title: 'State Election Results',
        slug: 'election-results',
        language: 'en' as const,
        contentJson: validDraftDoc,
      }
      const taArticle = {
        title: 'தேர்தல் முடிவுகள்',
        slug: 'election-results', // Identical slug string permitted because language is 'ta'
        language: 'ta' as const,
        contentJson: validDraftDoc,
      }

      expect(articleDraftSchema.safeParse(enArticle).success).toBe(true)
      expect(articleDraftSchema.safeParse(taArticle).success).toBe(true)
    })

    it('supports linking translations via translationGroupId', () => {
      const groupUuid = '7c9e6679-7425-40de-944b-e07fc1f90ae7'
      const translatedDraft = {
        title: 'Tamil Version',
        slug: 'tamil-version',
        language: 'ta' as const,
        contentJson: validDraftDoc,
        translationGroupId: groupUuid,
      }
      const result = articleDraftSchema.safeParse(translatedDraft)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.translationGroupId).toBe(groupUuid)
      }
    })
  })
})
