/**
 * Shared utility functions
 */

import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Merge Tailwind classes safely */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Calculate reading time in minutes */
export function calculateReadingTime(text: string): number {
  const wordsPerMinute = 200
  const words = text.trim().split(/\s+/).length
  return Math.max(1, Math.ceil(words / wordsPerMinute))
}

/** Slugify a string (English) */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

/** Format a date in a locale-aware way */
export function formatDate(date: string | Date, locale: string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat(locale === 'ta' ? 'ta-IN' : 'en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d)
}

/** Format a relative date (e.g. "2 hours ago") */
export function formatRelativeDate(date: string | Date, locale: string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(hours / 24)

  const rtf = new Intl.RelativeTimeFormat(locale === 'ta' ? 'ta' : 'en', { numeric: 'auto' })

  if (diff < 60 * 60 * 1000) return rtf.format(-Math.floor(diff / 60000), 'minute')
  if (hours < 24) return rtf.format(-hours, 'hour')
  if (days < 30) return rtf.format(-days, 'day')

  return formatDate(d, locale)
}

/** Generate an Open Graph image URL from a Supabase storage path */
export function getStorageUrl(path: string | null | undefined, bucket: string): string | null {
  if (!path) return null
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!baseUrl) return null
  return `${baseUrl}/storage/v1/object/public/${bucket}/${path}`
}

/** Extract plain text from TipTap JSON */
export function extractTextFromTiptap(json: unknown): string {
  if (!json || typeof json !== 'object') return ''
  const node = json as { type?: string; text?: string; content?: unknown[] }

  if (node.type === 'text' && typeof node.text === 'string') {
    return node.text
  }

  if (Array.isArray(node.content)) {
    return node.content.map(extractTextFromTiptap).join(' ')
  }

  return ''
}

/** Validate that a URL is a relative path (for open-redirect protection) */
export function isRelativePath(url: string): boolean {
  if (!url) return false
  if (url.startsWith('//')) return false // protocol-relative
  if (url.startsWith('http://') || url.startsWith('https://')) return false
  if (url.startsWith('/')) return true
  return false
}

/** Safe redirect target (prevents open redirect) */
export function sanitizeRedirectUrl(next: string | null | undefined, fallback: string = '/'): string {
  if (!next || !isRelativePath(next)) return fallback
  // Additional guard: must start with / and not //
  if (!next.startsWith('/') || next.startsWith('//')) return fallback
  return next
}
