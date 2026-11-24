/**
 * Zod validation schemas for all external inputs.
 * Used in route handlers, server actions, and TipTap JSON validation.
 */

import { z } from 'zod'

// ============================================================
// Language and role schemas
// ============================================================

export const languageCodeSchema = z.enum(['en', 'ta'])
export const userRoleSchema = z.enum(['reader', 'author', 'editor', 'super_admin'])
export const articleStatusSchema = z.enum(['draft', 'published', 'archived'])

export type LanguageCode = z.infer<typeof languageCodeSchema>
export type UserRole = z.infer<typeof userRoleSchema>
export type ArticleStatus = z.infer<typeof articleStatusSchema>

// ============================================================
// Auth schemas
// ============================================================

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(72),
})

export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string()
    .min(10, 'Password must be at least 10 characters')
    .max(72)
    .regex(/[A-Za-z]/, 'Password must contain at least one letter')
    .regex(/[0-9]/, 'Password must contain at least one digit'),
  displayName: z.string().trim().min(2).max(100),
  preferredLanguage: languageCodeSchema.default('en'),
})

export const resetPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
})

export const updatePasswordSchema = z.object({
  password: z.string()
    .min(10)
    .max(72)
    .regex(/[A-Za-z]/)
    .regex(/[0-9]/),
})

// ============================================================
// Profile schemas
// ============================================================

export const updateProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(100).optional(),
  preferredLanguage: languageCodeSchema.optional(),
  avatarUrl: z.string().url().max(500).optional().nullable(),
}).strict() // Reject unknown fields

// ============================================================
// Article schemas
// ============================================================

// YouTube video ID: exactly 11 chars, alphanumeric + _ -
export const youtubeVideoIdSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{11}$/, 'Invalid YouTube video ID')

// URL allowlist for links (no javascript:, data:, etc.)
export const safeUrlSchema = z
  .string()
  .url()
  .refine(
    (url) => {
      try {
        const parsed = new URL(url)
        return ['http:', 'https:', 'mailto:'].includes(parsed.protocol)
      } catch {
        return false
      }
    },
    'Only http, https, and mailto URLs are allowed'
  )

// Storage path: must be a relative path (no traversal)
export const storagePathSchema = z
  .string()
  .max(500)
  .regex(/^[a-zA-Z0-9/_.-]+$/, 'Invalid storage path')
  .refine((p) => !p.includes('..'), 'Path traversal not allowed')

// ============================================================
// TipTap JSON schema (allowlist-based)
// ============================================================

// Allowed node types in TipTap content
const ALLOWED_NODES = [
  'doc', 'paragraph', 'heading', 'blockquote', 'bulletList', 'orderedList',
  'listItem', 'horizontalRule', 'hardBreak', 'text',
  'image', 'imageGallery', 'youtubeEmbed',  // Custom extensions
] as const

// Allowed mark types
const ALLOWED_MARKS = [
  'bold', 'italic', 'underline', 'strike', 'link', 'textAlign',
] as const

// Allowed heading levels
const ALLOWED_HEADING_LEVELS = [1, 2, 3, 4] as const

// Mark schema
const tiptapMarkSchema: z.ZodType<any> = z.object({
  type: z.enum(ALLOWED_MARKS),
  attrs: z
    .object({
      href: safeUrlSchema.optional(),
      target: z.enum(['_blank', '_self']).optional(),
      rel: z.string().max(100).optional(),
      textAlign: z.enum(['left', 'center', 'right', 'justify']).optional(),
    })
    .optional(),
})

// Node schema (recursive)
const tiptapNodeSchema: z.ZodType<any> = z.lazy(() =>
  z.object({
    type: z.enum(ALLOWED_NODES),
    attrs: z
      .object({
        level: z.number().int().optional(),
        src: storagePathSchema.optional(),
        alt: z.string().max(500).optional(),
        title: z.string().max(200).optional(),
        caption: z.string().max(500).optional(),
        textAlign: z.enum(['left', 'center', 'right', 'justify']).optional(),
        videoId: youtubeVideoIdSchema.optional(),
        images: z.array(z.object({
          src: storagePathSchema,
          alt: z.string().max(500).optional(),
          caption: z.string().max(500).optional(),
        })).max(20).optional(),
      })
      .optional(),
    content: z.array(z.lazy(() => tiptapNodeSchema)).max(500).optional(),
    marks: z.array(tiptapMarkSchema).max(10).optional(),
    text: z.string().max(50000).optional(),
  })
)

// Full TipTap document schema
export const tiptapDocumentSchema = z.object({
  type: z.literal('doc'),
  content: z.array(tiptapNodeSchema).max(1000),
})

// ============================================================
// Article create/update schema
// ============================================================

export const articleDraftSchema = z.object({
  title: z.string().trim().min(1).max(300),
  subtitle: z.string().trim().max(300).optional().nullable(),
  shortDescription: z.string().trim().max(500).optional().nullable(),
  slug: z.string().regex(/^[a-z0-9-]+$/).min(2).max(200),
  language: languageCodeSchema,
  contentJson: tiptapDocumentSchema,
  contentText: z.string().max(200000).optional(),
  coverImagePath: storagePathSchema.optional().nullable(),
  coverImageAlt: z.string().trim().max(300).optional().nullable(),
  categoryId: z.string().uuid().optional(),
  additionalCategoryIds: z.array(z.string().uuid()).max(5).optional(),
  tagIds: z.array(z.string().uuid()).max(20).optional(),
  seoTitle: z.string().trim().max(160).optional().nullable(),
  seoDescription: z.string().trim().max(320).optional().nullable(),
  translationGroupId: z.string().uuid().optional(),
}).strict()

export const articlePublishSchema = articleDraftSchema.extend({
  shortDescription: z.string().trim().min(1).max(500),
  coverImagePath: storagePathSchema,
  categoryId: z.string().uuid(),
})

// ============================================================
// Category and tag schemas
// ============================================================

export const categoryCreateSchema = z.object({
  groupKey: z.string().regex(/^[a-z_]+$/).min(2).max(50),
  language: languageCodeSchema,
  name: z.string().trim().min(1).max(100),
  slug: z.string().regex(/^[a-z0-9-]+$/).min(2).max(100),
  parentId: z.string().uuid().optional().nullable(),
  sortOrder: z.number().int().min(0).max(1000).optional(),
}).strict()

export const tagCreateSchema = z.object({
  groupKey: z.string().regex(/^[a-z_]+$/).min(2).max(50),
  language: languageCodeSchema,
  name: z.string().trim().min(1).max(80),
  slug: z.string().regex(/^[a-z0-9-]+$/).min(2).max(100),
}).strict()

// ============================================================
// Search schema
// ============================================================

export const searchSchema = z.object({
  q: z.string().trim().min(1).max(200),
  language: languageCodeSchema,
  page: z.coerce.number().int().min(1).max(100).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
}).strict()

// ============================================================
// Pagination schema
// ============================================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

// ============================================================
// Role change schema
// ============================================================

export const roleChangeSchema = z.object({
  targetUserId: z.string().uuid(),
  newRole: userRoleSchema,
}).strict()

// ============================================================
// Site settings schema
// ============================================================

export const siteSettingUpdateSchema = z.object({
  key: z.string().regex(/^[a-z_]+$/).min(1).max(50),
  value: z.unknown(),
}).strict()

// ============================================================
// Upload validation (magic bytes handled server-side in route handler)
// ============================================================

export const uploadMetadataSchema = z.object({
  articleId: z.string().uuid().optional(),
  altText: z.string().trim().max(500).optional(),
  caption: z.string().trim().max(500).optional(),
  mediaType: z.enum(['image', 'youtube_embed']),
}).strict()

export const youtubeEmbedSchema = z.object({
  videoId: youtubeVideoIdSchema,
  articleId: z.string().uuid().optional(),
  caption: z.string().trim().max(500).optional(),
}).strict()
