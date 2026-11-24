import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { LikeButton } from '@/modules/engagement/components/like-button'
import { toggleArticleLike } from '@/modules/engagement/engagement.service'
import { toggleLikeAction } from '@/modules/engagement/actions'

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  usePathname: () => '/en/article/sample-slug',
}))

// Mock server action for client component tests
vi.mock('@/modules/engagement/actions', () => ({
  toggleLikeAction: vi.fn(),
}))

// Mock Supabase admin client for service tests
const mockAdminSelect = vi.fn()
const mockAdminInsert = vi.fn()
const mockAdminDelete = vi.fn()
const mockAdminEq = vi.fn()
const mockAdminMaybeSingle = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => ({
    from: (table: string) => {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: { id: 'u1', is_active: true } }),
            }),
          }),
        }
      }
      if (table === 'article_likes') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: mockAdminMaybeSingle,
              }),
            }),
          }),
          delete: () => ({
            eq: () => Promise.resolve({ error: null }),
          }),
          insert: mockAdminInsert,
        }
      }
      if (table === 'articles') {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: { like_count: 42 } }),
            }),
          }),
        }
      }
      return {}
    },
  }),
}))

describe('Phase 8: Reader Engagement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('LikeButton Component', () => {
    it('renders initial state with like count and unliked heart', () => {
      render(
        <LikeButton
          articleId="art-1"
          initialLiked={false}
          initialCount={10}
          locale="en"
          slug="test-slug"
          isAuthenticated={true}
        />
      )

      expect(screen.getByText('10')).toBeInTheDocument()
      expect(screen.getByText('Likes')).toBeInTheDocument()
      const button = screen.getByRole('button', { name: /Like article/i })
      expect(button).toHaveAttribute('aria-pressed', 'false')
      expect(screen.getByText('🤍')).toBeInTheDocument()
    })

    it('redirects anonymous user to login with return URL and reason=like parameter', () => {
      render(
        <LikeButton
          articleId="art-1"
          initialLiked={false}
          initialCount={10}
          locale="en"
          slug="test-slug"
          isAuthenticated={false}
        />
      )

      const button = screen.getByRole('button', { name: /Like article/i })
      fireEvent.click(button)

      expect(mockPush).toHaveBeenCalledWith(
        '/en/auth/login?next=%2Fen%2Farticle%2Ftest-slug&reason=like'
      )
    })

    it('optimistically updates like count and heart when authenticated user clicks', async () => {
      const { toggleLikeAction } = await import('@/modules/engagement/actions')
      vi.mocked(toggleLikeAction).mockResolvedValueOnce({
        success: true,
        liked: true,
        likeCount: 11,
      })

      render(
        <LikeButton
          articleId="art-1"
          initialLiked={false}
          initialCount={10}
          locale="en"
          slug="test-slug"
          isAuthenticated={true}
        />
      )

      const button = screen.getByRole('button', { name: /Like article/i })
      fireEvent.click(button)

      // Optimistic update
      expect(screen.getByText('11')).toBeInTheDocument()
      expect(screen.getByText('❤️')).toBeInTheDocument()
      expect(button).toHaveAttribute('aria-pressed', 'true')

      await waitFor(() => {
        expect(toggleLikeAction).toHaveBeenCalledWith('art-1', '/en/article/test-slug')
      })
    })

    it('rolls back optimistic state if server action fails', async () => {
      const { toggleLikeAction } = await import('@/modules/engagement/actions')
      vi.mocked(toggleLikeAction).mockResolvedValueOnce({
        success: false,
        liked: false,
        likeCount: 10,
        error: 'Database error',
      })

      render(
        <LikeButton
          articleId="art-1"
          initialLiked={false}
          initialCount={10}
          locale="en"
          slug="test-slug"
          isAuthenticated={true}
        />
      )

      const button = screen.getByRole('button', { name: /Like article/i })
      fireEvent.click(button)

      // Shows rollback and error
      await waitFor(() => {
        expect(screen.getByText('10')).toBeInTheDocument()
        expect(screen.getByText('🤍')).toBeInTheDocument()
        expect(screen.getByRole('alert')).toBeInTheDocument()
      })
    })
  })

  describe('Engagement Service', () => {
    it('toggles unlike when user has already liked the article', async () => {
      // Mock existing like found
      mockAdminMaybeSingle.mockResolvedValueOnce({ data: { id: 'like-1' } })

      const result = await toggleArticleLike('art-1', 'u1')
      expect(result.success).toBe(true)
      expect(result.liked).toBe(false)
      expect(result.likeCount).toBe(42)
    })

    it('toggles like when user has not yet liked the article', async () => {
      // Mock no existing like found
      mockAdminMaybeSingle.mockResolvedValueOnce({ data: null })
      mockAdminInsert.mockResolvedValueOnce({ error: null })

      const result = await toggleArticleLike('art-1', 'u1')
      expect(result.success).toBe(true)
      expect(result.liked).toBe(true)
      expect(result.likeCount).toBe(42)
    })
  })
})
