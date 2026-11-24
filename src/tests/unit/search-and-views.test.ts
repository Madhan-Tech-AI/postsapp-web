import { describe, it, expect, vi, beforeEach } from 'vitest'
import { isBot } from '@/modules/views/bot-detector'
import { generateVisitorHash, recordArticleView } from '@/modules/views/views.service'
import { searchPublishedArticles } from '@/modules/search/search.service'
import { getTrendingAndMostRead } from '@/modules/engagement/trending.service'

const mockRpc = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => ({
    rpc: mockRpc,
    from: mockFrom,
  }),
}))

describe('Phase 9: Search, View Tracking, and Trending Algorithms', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Bot Detector', () => {
    it('detects crawlers and bots correctly', () => {
      expect(isBot('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')).toBe(true)
      expect(isBot('Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)')).toBe(true)
      expect(isBot('curl/7.88.1')).toBe(true)
      expect(isBot('python-requests/2.31.0')).toBe(true)
      expect(isBot('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 HeadlessChrome/119.0.0.0')).toBe(true)
      expect(isBot('')).toBe(true)
      expect(isBot(null)).toBe(true)
    })

    it('identifies genuine browsers as non-bots', () => {
      const chromeDesktop =
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      const safariIPhone =
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1'

      expect(isBot(chromeDesktop)).toBe(false)
      expect(isBot(safariIPhone)).toBe(false)
    })
  })

  describe('Visitor Hash & View Tracking', () => {
    it('generates a 64-character SHA-256 visitor hash that rotates daily', () => {
      const hash1 = generateVisitorHash('192.168.1.1', 'Mozilla/5.0 Chrome', '2026-11-24')
      const hash2 = generateVisitorHash('192.168.1.1', 'Mozilla/5.0 Chrome', '2026-11-24')
      const hashNextDay = generateVisitorHash('192.168.1.1', 'Mozilla/5.0 Chrome', '2026-11-25')

      expect(hash1).toHaveLength(64)
      expect(hash1).toBe(hash2)
      expect(hash1).not.toBe(hashNextDay)
    })

    it('silently ignores bots without writing to database', async () => {
      const result = await recordArticleView({
        articleId: 'a0000000-0000-0000-0000-000000000001',
        ip: '66.249.66.1',
        userAgent: 'Googlebot/2.1',
      })

      expect(result.recorded).toBe(false)
      expect(result.reason).toBe('bot_ignored')
      expect(mockRpc).not.toHaveBeenCalled()
    })

    it('invokes record_article_view RPC for genuine human visitors with dedup key', async () => {
      mockRpc.mockResolvedValueOnce({ error: null })

      const result = await recordArticleView({
        articleId: 'a0000000-0000-0000-0000-000000000001',
        ip: '203.0.113.195',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/124.0',
        sessionId: 'sess_12345',
      })

      expect(result.recorded).toBe(true)
      expect(mockRpc).toHaveBeenCalledWith(
        'record_article_view',
        expect.objectContaining({
          p_article_id: 'a0000000-0000-0000-0000-000000000001',
          p_session_id: 'sess_12345',
          p_dedup_window_key: expect.stringMatching(/^a0000000-0000-0000-0000-000000000001_\d{4}-\d{2}-\d{2}_[a-f0-9]{64}$/),
        })
      )
    })
  })

  describe('Search Service', () => {
    it('returns empty results for empty or single-character queries', async () => {
      const res = await searchPublishedArticles({ query: 'a', language: 'en' })
      expect(res.articles).toEqual([])
      expect(res.totalCount).toBe(0)
    })

    it('executes search query with language filter', async () => {
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            textSearch: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                range: vi.fn().mockResolvedValue({
                  data: [
                    { id: '1', title: 'Tech Summit in Chennai', language: 'en' },
                  ],
                  count: 1,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      })

      const res = await searchPublishedArticles({ query: 'Chennai', language: 'en' })
      expect(res.articles).toHaveLength(1)
      expect(res.articles[0].title).toBe('Tech Summit in Chennai')
      expect(res.totalCount).toBe(1)
    })
  })

  describe('Trending & Most-Read Service', () => {
    it('calculates weighted score (views * 1 + likes * 5) and returns ranked articles', async () => {
      const art1 = '11111111-1111-1111-1111-111111111111'
      const art2 = '22222222-2222-2222-2222-222222222222'

      // Mock views and likes queries
      mockFrom.mockImplementation((table: string) => {
        if (table === 'article_views') {
          return {
            select: vi.fn().mockReturnValue({
              gte: vi.fn().mockResolvedValue({
                data: [
                  { article_id: art1 },
                  { article_id: art1 },
                  { article_id: art2 },
                ],
              }),
            }),
          }
        }
        if (table === 'article_likes') {
          return {
            select: vi.fn().mockReturnValue({
              gte: vi.fn().mockResolvedValue({
                data: [
                  // art2 has 2 likes (2 * 5 = 10 score) vs art1 has 0 likes (2 views = 2 score)
                  { article_id: art2 },
                  { article_id: art2 },
                ],
              }),
            }),
          }
        }
        if (table === 'published_articles') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  data: [
                    { id: art1, title: 'Story 1', view_count: 50 },
                    { id: art2, title: 'Story 2 (Viral)', view_count: 30 },
                  ],
                }),
              }),
            }),
          }
        }
        return {}
      })

      const { trending } = await getTrendingAndMostRead('en', 5)

      expect(trending).toBeDefined()
      expect(trending.length).toBeGreaterThan(0)
      // art2 should be ranked first because 1 view + 2 likes * 5 = 11 score > 2 views for art1
      expect(trending[0].id).toBe(art2)
    })
  })
})
