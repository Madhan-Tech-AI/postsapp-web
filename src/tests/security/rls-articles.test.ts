/**
 * RLS Security Tests — Articles
 *
 * Tests that RLS policies correctly enforce access control
 * even when users call the Supabase REST API directly.
 *
 * AC-02: Drafts inaccessible to public
 * AC-22: Archived articles inaccessible
 * AC-12: Author A cannot access Author B's articles
 * AC-13: Editor can access all articles
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import {
  getAnonClient,
  getAuthenticatedClient,
  getAdminClient,
  setupTestUsers,
  teardownTestUsers,
  TEST_USERS,
} from './setup'

describe('RLS: Article access control', () => {
  let draftArticleId: string
  let publishedArticleId: string
  let archivedArticleId: string
  let authorAId: string
  let authorBId: string
  let testCategoryId: string

  beforeAll(async () => {
    await setupTestUsers()
    const admin = getAdminClient()

    // Get user IDs
    const { data: users } = await admin.auth.admin.listUsers()
    authorAId = users?.users.find(u => u.email === TEST_USERS.authorA.email)?.id ?? ''
    authorBId = users?.users.find(u => u.email === TEST_USERS.authorB.email)?.id ?? ''

    // Get a test category
    const { data: cats } = await admin.from('categories').select('id').eq('language', 'en').limit(1)
    testCategoryId = cats?.[0]?.id ?? ''

    // Create test articles via admin (bypasses RLS for setup)
    const baseArticle = {
      language: 'en' as const,
      content_json: { type: 'doc', content: [] },
      content_text: 'Test content',
      slug: '',
      title: '',
      author_id: authorAId,
    }

    const { data: draft } = await admin.from('articles').insert({
      ...baseArticle,
      title: 'Test Draft Article',
      slug: 'test-draft-article',
      status: 'draft',
    }).select().single()
    draftArticleId = draft?.id ?? ''

    const { data: published } = await admin.from('articles').insert({
      ...baseArticle,
      title: 'Test Published Article',
      slug: 'test-published-article',
      status: 'published',
      short_description: 'Test description',
      cover_image_path: 'article-featured/test/cover.jpg',
      published_at: new Date().toISOString(),
      first_published_at: new Date().toISOString(),
    }).select().single()
    publishedArticleId = published?.id ?? ''

    const { data: archived } = await admin.from('articles').insert({
      ...baseArticle,
      title: 'Test Archived Article',
      slug: 'test-archived-article',
      status: 'archived',
    }).select().single()
    archivedArticleId = archived?.id ?? ''
  })

  afterAll(async () => {
    // Clean up test articles
    const admin = getAdminClient()
    await admin.from('articles').delete().in('id', [
      draftArticleId, publishedArticleId, archivedArticleId
    ].filter(Boolean))
    await teardownTestUsers()
  })

  // AC-02: Anon cannot read draft articles
  it('AC-02: anon client cannot read draft articles', async () => {
    const anon = getAnonClient()
    const { data, error } = await anon
      .from('articles')
      .select('id, title, status')
      .eq('id', draftArticleId)
    expect(data).toHaveLength(0)
  })

  // AC-02: Anon cannot read draft articles via published_articles view
  it('AC-02: published_articles view excludes drafts', async () => {
    const anon = getAnonClient()
    const { data } = await anon
      .from('published_articles')
      .select('id')
      .eq('id', draftArticleId)
    expect(data).toHaveLength(0)
  })

  // AC-22: Anon cannot read archived articles
  it('AC-22: anon client cannot read archived articles', async () => {
    const anon = getAnonClient()
    const { data } = await anon
      .from('articles')
      .select('id, status')
      .eq('id', archivedArticleId)
    expect(data).toHaveLength(0)
  })

  // AC-01: Published articles are readable by anon
  it('AC-01: anon client can read published articles', async () => {
    const anon = getAnonClient()
    const { data, error } = await anon
      .from('articles')
      .select('id, title, status')
      .eq('id', publishedArticleId)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect(data?.[0].status).toBe('published')
  })

  // AC-12: Author A cannot read Author B's draft
  it('AC-12: Author A cannot read Author B\'s draft via REST', async () => {
    // Create a draft for Author B
    const admin = getAdminClient()
    const { data: bDraft } = await admin.from('articles').insert({
      language: 'en',
      title: 'Author B Draft',
      slug: 'author-b-draft',
      status: 'draft',
      author_id: authorBId,
      content_json: { type: 'doc', content: [] },
      content_text: '',
    }).select().single()

    const authorAClient = await getAuthenticatedClient(
      TEST_USERS.authorA.email,
      TEST_USERS.authorA.password
    )
    const { data } = await authorAClient
      .from('articles')
      .select('id')
      .eq('id', bDraft?.id ?? '')
    expect(data).toHaveLength(0)

    // Cleanup
    await admin.from('articles').delete().eq('id', bDraft?.id ?? '')
  })

  // Author cannot change author_id
  it('Author cannot change article author_id via REST', async () => {
    const authorAClient = await getAuthenticatedClient(
      TEST_USERS.authorA.email,
      TEST_USERS.authorA.password
    )
    const { error } = await authorAClient
      .from('articles')
      .update({ author_id: authorBId } as any) // Type system also blocks this
      .eq('id', draftArticleId)

    // Should either error or be blocked by trigger
    // The immutable column trigger raises an exception
    expect(error).not.toBeNull()
  })

  // Reader cannot insert articles
  it('Reader cannot insert articles', async () => {
    const readerClient = await getAuthenticatedClient(
      TEST_USERS.reader.email,
      TEST_USERS.reader.password
    )
    const { error } = await readerClient.from('articles').insert({
      language: 'en',
      title: 'Hacked article',
      slug: 'hacked-article',
      author_id: authorAId,
      content_json: { type: 'doc', content: [] },
      content_text: '',
    })
    expect(error).not.toBeNull()
  })

  // Reader cannot change their own role
  it('Reader cannot change own role via REST', async () => {
    const readerClient = await getAuthenticatedClient(
      TEST_USERS.reader.email,
      TEST_USERS.reader.password
    )
    const { data: profile } = await readerClient
      .from('profiles')
      .select('id')
      .single()

    const { error } = await readerClient
      .from('profiles')
      .update({ role: 'super_admin' } as any)
      .eq('id', profile?.id ?? '')

    // Trigger should block this
    expect(error).not.toBeNull()
  })

  // Anon cannot read profiles
  it('Anon cannot read profiles table', async () => {
    const anon = getAnonClient()
    const { data, error } = await anon.from('profiles').select('id, role')
    // RLS: no policy grants anon SELECT on profiles
    expect(data).toHaveLength(0)
  })

  // Anon cannot read audit_logs
  it('Anon cannot read audit_logs', async () => {
    const anon = getAnonClient()
    const { data } = await anon.from('audit_logs').select('id')
    expect(data).toHaveLength(0)
  })

  // Anon cannot read article_views
  it('Anon cannot read article_views', async () => {
    const anon = getAnonClient()
    const { data } = await anon.from('article_views').select('id')
    expect(data).toHaveLength(0)
  })
})
