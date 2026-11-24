/**
 * Unit tests — setup file
 */
import '@testing-library/jest-dom'
import { vi, beforeAll, afterAll } from 'vitest'

// Mock server-only in Vitest test runner
vi.mock('server-only', () => ({}))

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
  redirect: vi.fn(),
  notFound: vi.fn(),
}))

// Mock next-intl
vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en',
}))

// Mock next/font/google
vi.mock('next/font/google', () => ({
  Noto_Sans: () => ({ variable: '--font-noto-sans', className: 'mock-font' }),
  Noto_Serif: () => ({ variable: '--font-noto-serif', className: 'mock-font' }),
  Noto_Sans_Tamil: () => ({ variable: '--font-noto-sans-tamil', className: 'mock-font' }),
  Noto_Serif_Tamil: () => ({ variable: '--font-noto-serif-tamil', className: 'mock-font' }),
}))

// Set fallback env for test runner
process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-service-key'

// Suppress console.error in tests (re-enable per test if needed)
const originalError = console.error
beforeAll(() => {
  console.error = (...args: unknown[]) => {
    if (typeof args[0] === 'string' && args[0].includes('Warning:')) return
    originalError(...args)
  }
})
afterAll(() => {
  console.error = originalError
})
