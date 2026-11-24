import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getAdminAnalytics } from '@/modules/admin/analytics.service'
import { getAuditLogs } from '@/modules/admin/audit.service'
import { getAllSiteSettings, updateSiteSettings } from '@/modules/admin/settings.service'
import { getCategoryGroups, upsertCategoryGroup } from '@/modules/admin/categories.service'
import sitemap from '@/app/sitemap'

const mockFrom = vi.fn()

vi.mock('@/lib/supabase/admin', () => ({
  createSupabaseAdminClient: () => ({
    from: mockFrom,
  }),
}))

describe('Phase 10: Administration, Analytics, and Sitemaps (Gate G4)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getAdminAnalytics', () => {
    it('scopes metrics to own articles for author role', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'articles') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [
                  { id: '1', title: 'Story 1', status: 'published', author_id: 'a1', view_count: 10, like_count: 2 },
                  { id: '2', title: 'Story 2', status: 'draft', author_id: 'a1', view_count: 0, like_count: 0 },
                ],
              }),
            }),
          }
        }
        if (table === 'article_views') {
          return {
            select: vi.fn().mockReturnValue({
              gte: vi.fn().mockReturnValue({
                in: vi.fn().mockResolvedValue({
                  data: [{ article_id: '1', recorded_at: new Date().toISOString() }],
                }),
              }),
            }),
          }
        }
        return {}
      })

      const res = await getAdminAnalytics({ role: 'author', currentUserId: 'a1' })

      expect(res.totalArticles).toBe(2)
      expect(res.publishedArticles).toBe(1)
      expect(res.draftArticles).toBe(1)
      expect(res.totalViews).toBe(10)
      expect(res.totalLikes).toBe(2)
      expect(res.activeAuthors).toBe(1)
    })

    it('returns full publication statistics and leaderboard for super_admin', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'articles') {
          return {
            select: vi.fn().mockResolvedValue({
              data: [
                { id: '1', title: 'Story 1', status: 'published', author_id: 'a1', view_count: 50, like_count: 5, profiles: { display_name: 'Author 1' } },
                { id: '2', title: 'Story 2', status: 'published', author_id: 'a2', view_count: 200, like_count: 25, profiles: { display_name: 'Author 2' } },
              ],
            }),
          }
        }
        if (table === 'article_views') {
          return {
            select: vi.fn().mockReturnValue({
              gte: vi.fn().mockResolvedValue({
                data: [],
              }),
            }),
          }
        }
        return {}
      })

      const res = await getAdminAnalytics({ role: 'super_admin', currentUserId: 'sa-1' })

      expect(res.totalArticles).toBe(2)
      expect(res.totalViews).toBe(250)
      expect(res.totalLikes).toBe(30)
      expect(res.authorPerformance).toHaveLength(2)
      expect(res.authorPerformance[0].authorName).toBe('Author 2')
    })
  })

  describe('Audit Logs Service', () => {
    it('retrieves audit logs and enriches actor names', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'audit_logs') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                range: vi.fn().mockResolvedValue({
                  data: [
                    { id: 'log-1', action: 'article_publish', actor_id: 'u-1', target_type: 'article', target_id: 'art-1', metadata: {}, created_at: new Date().toISOString() },
                  ],
                  count: 1,
                }),
              }),
            }),
          }
        }
        if (table === 'profiles') {
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [{ id: 'u-1', display_name: 'Super Admin User' }],
              }),
            }),
          }
        }
        return {}
      })

      const res = await getAuditLogs({ page: 1, limit: 10 })
      expect(res.logs).toHaveLength(1)
      expect(res.logs[0].actor_name).toBe('Super Admin User')
      expect(res.totalCount).toBe(1)
    })
  })

  describe('Site Settings Service', () => {
    it('updates site settings and creates an audit log entry', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })
      const mockInsert = vi.fn().mockResolvedValue({ error: null })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'site_settings') {
          return { update: mockUpdate }
        }
        if (table === 'audit_logs') {
          return { insert: mockInsert }
        }
        return {}
      })

      const res = await updateSiteSettings({ site_name: 'New PostsApp' }, 'sa-1')
      expect(res.success).toBe(true)
      expect(mockUpdate).toHaveBeenCalled()
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'site_setting_change',
          actor_id: 'sa-1',
        })
      )
    })
  })

  describe('Category Management Service', () => {
    it('upserts paired categories and writes audit log', async () => {
      const mockUpsert = vi.fn().mockResolvedValue({ error: null })
      const mockInsert = vi.fn().mockResolvedValue({ error: null })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'categories') {
          return { upsert: mockUpsert }
        }
        if (table === 'audit_logs') {
          return { insert: mockInsert }
        }
        return {}
      })

      const res = await upsertCategoryGroup({
        groupKey: 'science',
        sortOrder: 9,
        nameEn: 'Science',
        slugEn: 'science',
        nameTa: 'அறிவியல்',
        slugTa: 'science',
        actorId: 'sa-1',
      })

      expect(res.success).toBe(true)
      expect(mockUpsert).toHaveBeenCalledTimes(2) // Once for EN, once for TA
      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'category_update',
          target_id: 'science',
        })
      )
    })
  })

  describe('Dynamic Sitemap', () => {
    it('generates XML sitemap entries for public articles, categories, and static pages', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'published_articles') {
          return {
            select: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [
                  { slug: 'chennai-summit', language: 'en', published_at: '2026-11-24T06:00:00Z' },
                ],
              }),
            }),
          }
        }
        if (table === 'categories') {
          return {
            select: vi.fn().mockResolvedValue({
              data: [
                { slug: 'technology', language: 'en' },
              ],
            }),
          }
        }
        return {}
      })

      const entries = await sitemap()
      expect(entries.length).toBeGreaterThan(0)

      // Verifies presence of homepage and articles
      const urls = entries.map((e) => e.url)
      expect(urls).toContain('https://postsapp.in/en')
      expect(urls).toContain('https://postsapp.in/ta')
      expect(urls).toContain('https://postsapp.in/en/article/chennai-summit')
      expect(urls).toContain('https://postsapp.in/en/category/technology')
    })
  })
})
