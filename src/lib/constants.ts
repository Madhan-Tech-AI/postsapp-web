/**
 * Application constants.
 *
 * Centralised so that behaviour can be changed in one place.
 * Open item from PRD §15: delete behaviour.
 */

/** If true, Authors archive their articles (soft delete). Set to false for hard delete. */
export const DELETE_SOFT_FOR_AUTHORS = true as const

/** Storage bucket names */
export const BUCKETS = {
  FEATURED: process.env.STORAGE_BUCKET_FEATURED || 'article-featured',
  CONTENT: process.env.STORAGE_BUCKET_CONTENT || 'article-content',
  AVATARS: process.env.STORAGE_BUCKET_AVATARS || 'author-avatars',
  SITE_ASSETS: process.env.STORAGE_BUCKET_SITE_ASSETS || 'site-assets',
  TEMP: process.env.STORAGE_BUCKET_TEMP || 'editorial-temp',
} as const

/** Upload size limits */
export const UPLOAD_LIMITS = {
  MAX_IMAGE_BYTES: 10 * 1024 * 1024,  // 10 MB
  MAX_AVATAR_BYTES: 2 * 1024 * 1024,  // 2 MB
  ALLOWED_MIME_TYPES: ['image/jpeg', 'image/png', 'image/webp'] as const,
} as const

/** Rate limiting windows */
export const RATE_LIMITS = {
  AUTH_ATTEMPTS_PER_HOUR: 10,
  LIKES_PER_MINUTE: 30,
  VIEWS_PER_WINDOW: 1,                 // 1 view per article per dedup window
  UPLOADS_PER_HOUR: 50,
  SEARCH_PER_MINUTE: 60,
} as const

/** View deduplication window */
export const VIEW_DEDUP_WINDOW_HOURS = 24

/** Supported languages */
export const SUPPORTED_LANGUAGES = ['en', 'ta'] as const
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number]

/** Canonical base URL (server-side) */
export const CANONICAL_BASE_URL = process.env.CANONICAL_BASE_URL || 'https://postsapp.in'

/** Articles per page (default) */
export const DEFAULT_PAGE_SIZE = 20

/** Trending window */
export const TRENDING_WINDOW_HOURS = 24

/** Most-read window */
export const MOST_READ_WINDOW_DAYS = 7
