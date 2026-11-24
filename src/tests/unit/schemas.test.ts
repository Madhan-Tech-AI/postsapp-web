/**
 * Unit tests — Zod schemas and utility functions
 */

import { describe, it, expect } from 'vitest'
import {
  loginSchema,
  registerSchema,
  tiptapDocumentSchema,
  safeUrlSchema,
  youtubeVideoIdSchema,
  storagePathSchema,
  articleDraftSchema,
} from '@/lib/schemas'
import {
  slugify,
  calculateReadingTime,
  isRelativePath,
  sanitizeRedirectUrl,
  extractTextFromTiptap,
} from '@/lib/utils'

describe('loginSchema', () => {
  it('accepts valid credentials', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: 'pass123' })
    expect(result.success).toBe(true)
  })

  it('rejects invalid email', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: 'pass123' })
    expect(result.success).toBe(false)
  })

  it('normalizes email to lowercase', () => {
    const result = loginSchema.safeParse({ email: 'User@EXAMPLE.COM', password: 'pass123' })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.email).toBe('user@example.com')
  })
})

describe('registerSchema', () => {
  const valid = {
    email: 'user@test.com',
    password: 'ValidPass1',
    displayName: 'Test User',
    preferredLanguage: 'en',
  }

  it('accepts valid registration data', () => {
    expect(registerSchema.safeParse(valid).success).toBe(true)
  })

  it('rejects short password', () => {
    expect(registerSchema.safeParse({ ...valid, password: 'Short1' }).success).toBe(false)
  })

  it('rejects password without digits', () => {
    expect(registerSchema.safeParse({ ...valid, password: 'OnlyLetters!' }).success).toBe(false)
  })

  it('rejects password without letters', () => {
    expect(registerSchema.safeParse({ ...valid, password: '12345678901' }).success).toBe(false)
  })
})

describe('safeUrlSchema — XSS protection (AC security)', () => {
  it('accepts https URLs', () => {
    expect(safeUrlSchema.safeParse('https://example.com').success).toBe(true)
  })

  it('accepts http URLs', () => {
    expect(safeUrlSchema.safeParse('http://example.com').success).toBe(true)
  })

  it('accepts mailto URLs', () => {
    expect(safeUrlSchema.safeParse('mailto:user@example.com').success).toBe(true)
  })

  it('rejects javascript: URLs (XSS)', () => {
    expect(safeUrlSchema.safeParse('javascript:alert(1)').success).toBe(false)
  })

  it('rejects data: URLs (XSS)', () => {
    expect(safeUrlSchema.safeParse('data:text/html,<script>alert(1)</script>').success).toBe(false)
  })

  it('rejects vbscript: URLs', () => {
    expect(safeUrlSchema.safeParse('vbscript:msgbox(1)').success).toBe(false)
  })
})

describe('youtubeVideoIdSchema', () => {
  it('accepts valid 11-char video IDs', () => {
    expect(youtubeVideoIdSchema.safeParse('dQw4w9WgXcQ').success).toBe(true)
    expect(youtubeVideoIdSchema.safeParse('ABCdef12345').success).toBe(true)
    expect(youtubeVideoIdSchema.safeParse('a-B_c123456').success).toBe(true)
  })

  it('rejects short IDs', () => {
    expect(youtubeVideoIdSchema.safeParse('short').success).toBe(false)
  })

  it('rejects IDs with special characters', () => {
    expect(youtubeVideoIdSchema.safeParse('invalid<script').success).toBe(false)
    expect(youtubeVideoIdSchema.safeParse('javascript:12').success).toBe(false)
  })

  it('rejects full YouTube URLs', () => {
    expect(youtubeVideoIdSchema.safeParse('https://youtube.com/watch?v=dQw4w9WgXcQ').success).toBe(false)
  })
})

describe('storagePathSchema — path traversal protection', () => {
  it('accepts valid storage paths', () => {
    expect(storagePathSchema.safeParse('article-featured/uuid/cover.jpg').success).toBe(true)
  })

  it('rejects path traversal attempts', () => {
    expect(storagePathSchema.safeParse('../../../etc/passwd').success).toBe(false)
    expect(storagePathSchema.safeParse('valid/../../../etc/passwd').success).toBe(false)
  })

  it('rejects paths with special characters', () => {
    expect(storagePathSchema.safeParse('path; rm -rf /').success).toBe(false)
    expect(storagePathSchema.safeParse('<script>').success).toBe(false)
  })
})

describe('tiptapDocumentSchema — XSS content validation', () => {
  const validDoc = {
    type: 'doc',
    content: [
      { type: 'paragraph', content: [{ type: 'text', text: 'Hello world' }] },
    ],
  }

  it('accepts valid TipTap documents', () => {
    expect(tiptapDocumentSchema.safeParse(validDoc).success).toBe(true)
  })

  it('rejects unknown node types (XSS prevention)', () => {
    const malicious = {
      type: 'doc',
      content: [{ type: 'rawHTML', attrs: { html: '<script>alert(1)</script>' } }],
    }
    expect(tiptapDocumentSchema.safeParse(malicious).success).toBe(false)
  })

  it('rejects javascript: in link href', () => {
    const malicious = {
      type: 'doc',
      content: [{
        type: 'paragraph',
        content: [{
          type: 'text',
          text: 'Click me',
          marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }],
        }],
      }],
    }
    expect(tiptapDocumentSchema.safeParse(malicious).success).toBe(false)
  })

  it('rejects non-YouTube iframes', () => {
    const malicious = {
      type: 'doc',
      content: [{ type: 'iframe', attrs: { src: 'https://evil.com' } }],
    }
    expect(tiptapDocumentSchema.safeParse(malicious).success).toBe(false)
  })

  it('rejects invalid YouTube video IDs in embeds', () => {
    const malicious = {
      type: 'doc',
      content: [{
        type: 'youtubeEmbed',
        attrs: { videoId: 'javascript:alert' },
      }],
    }
    expect(tiptapDocumentSchema.safeParse(malicious).success).toBe(false)
  })
})

describe('slugify', () => {
  it('converts to lowercase', () => {
    expect(slugify('Hello World')).toBe('hello-world')
  })

  it('removes special characters', () => {
    expect(slugify('Hello, World!')).toBe('hello-world')
  })

  it('handles multiple spaces and dashes', () => {
    expect(slugify('hello---world  test')).toBe('hello-world-test')
  })
})

describe('calculateReadingTime', () => {
  it('returns at least 1 minute', () => {
    expect(calculateReadingTime('short')).toBe(1)
  })

  it('calculates ~1 min for 200 words', () => {
    const text = Array(200).fill('word').join(' ')
    expect(calculateReadingTime(text)).toBe(1)
  })

  it('calculates ~5 min for 1000 words', () => {
    const text = Array(1000).fill('word').join(' ')
    expect(calculateReadingTime(text)).toBe(5)
  })
})

describe('isRelativePath — open redirect protection', () => {
  it('accepts valid relative paths', () => {
    expect(isRelativePath('/admin/articles')).toBe(true)
    expect(isRelativePath('/')).toBe(true)
  })

  it('rejects absolute URLs', () => {
    expect(isRelativePath('https://evil.com')).toBe(false)
    expect(isRelativePath('http://evil.com')).toBe(false)
  })

  it('rejects protocol-relative URLs', () => {
    expect(isRelativePath('//evil.com')).toBe(false)
  })
})

describe('sanitizeRedirectUrl — open redirect protection', () => {
  it('passes through valid relative paths', () => {
    expect(sanitizeRedirectUrl('/admin/articles')).toBe('/admin/articles')
  })

  it('falls back for absolute URLs', () => {
    expect(sanitizeRedirectUrl('https://evil.com')).toBe('/')
    expect(sanitizeRedirectUrl('//evil.com')).toBe('/')
  })

  it('falls back for null', () => {
    expect(sanitizeRedirectUrl(null)).toBe('/')
  })

  it('uses custom fallback', () => {
    expect(sanitizeRedirectUrl('https://evil.com', '/home')).toBe('/home')
  })
})

describe('extractTextFromTiptap', () => {
  it('extracts text from a simple document', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Hello world' }],
        },
      ],
    }
    expect(extractTextFromTiptap(doc)).toContain('Hello world')
  })

  it('handles empty document', () => {
    expect(extractTextFromTiptap({ type: 'doc', content: [] })).toBe('')
  })

  it('handles null gracefully', () => {
    expect(extractTextFromTiptap(null)).toBe('')
  })
})
