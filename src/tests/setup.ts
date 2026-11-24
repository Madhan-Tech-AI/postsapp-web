/**
 * Unit tests — setup file
 */
import '@testing-library/jest-dom'
import { vi, beforeAll, afterAll } from 'vitest'

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
