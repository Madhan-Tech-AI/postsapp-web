'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { archiveArticleAction, deleteArticleAction } from '@/modules/articles/actions'
import type { ArticleListItem } from '@/modules/articles/articles.service'
import type { UserRole, LanguageCode, ArticleStatus } from '@/lib/schemas'

interface ArticlesListClientProps {
  initialArticles: ArticleListItem[]
  totalCount: number
  currentPage: number
  userRole: UserRole
  categories: { id: string; name: string; language?: string }[]
}

export function ArticlesListClient({
  initialArticles,
  totalCount,
  currentPage,
  userRole,
  categories,
}: ArticlesListClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [articles, setArticles] = useState<ArticleListItem[]>(initialArticles)
  const [actionError, setActionError] = useState<string | null>(null)
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const currentLang = searchParams.get('language') || 'all'
  const currentStatus = searchParams.get('status') || 'all'
  const currentSearch = searchParams.get('search') || ''

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value && value !== 'all') {
      params.set(key, value)
    } else {
      params.delete(key)
    }
    params.set('page', '1') // Reset page on filter change
    router.push(`/admin/articles?${params.toString()}`)
  }

  const handleArchive = (articleId: string) => {
    setActionError(null)
    startTransition(async () => {
      const res = await archiveArticleAction(articleId)
      if (!res.success) {
        setActionError(res.error || 'Failed to archive article')
      } else {
        setArticles((prev) =>
          prev.map((a) => (a.id === articleId ? { ...a, status: 'archived' } : a))
        )
      }
    })
  }

  const handleDelete = (articleId: string) => {
    setActionError(null)
    startTransition(async () => {
      const res = await deleteArticleAction(articleId)
      if (!res.success) {
        setActionError(res.error || 'Failed to delete article')
      } else {
        setArticles((prev) => prev.filter((a) => a.id !== articleId))
        setDeleteTargetId(null)
      }
    })
  }

  const totalPages = Math.ceil(totalCount / 20)

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Articles
          </h1>
          <p className="text-sm text-gray-500">
            {userRole === 'author'
              ? 'Manage your news articles, drafts, and translations'
              : 'Editorial overview of all publication content'}
          </p>
        </div>
        <Link
          href="/admin/articles/new"
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
        >
          + Create New Article
        </Link>
      </div>

      {actionError && (
        <div role="alert" className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {actionError}
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex flex-wrap gap-3 bg-white dark:bg-gray-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
        <input
          type="text"
          placeholder="Search by title..."
          defaultValue={currentSearch}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleFilterChange('search', (e.target as HTMLInputElement).value)
            }
          }}
          className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-800"
        />

        {/* Language Filter */}
        <select
          value={currentLang}
          onChange={(e) => handleFilterChange('language', e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-800"
        >
          <option value="all">All Languages</option>
          <option value="en">English (en)</option>
          <option value="ta">தமிழ் (ta)</option>
        </select>

        {/* Status Filter */}
        <select
          value={currentStatus}
          onChange={(e) => handleFilterChange('status', e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-800"
        >
          <option value="all">All Statuses</option>
          <option value="draft">Drafts</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Articles Table */}
      <div className="overflow-x-auto bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800">
        <table className="w-full text-left text-sm text-gray-700 dark:text-gray-300">
          <thead className="bg-gray-50 dark:bg-gray-800/50 text-xs uppercase text-gray-500 border-b border-gray-100 dark:border-gray-800">
            <tr>
              <th className="px-6 py-3">Article</th>
              <th className="px-6 py-3">Language</th>
              <th className="px-6 py-3">Category</th>
              <th className="px-6 py-3">Author</th>
              <th className="px-6 py-3">Status</th>
              <th className="px-6 py-3">Translations</th>
              <th className="px-6 py-3">Engagement</th>
              <th className="px-6 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {articles.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-10 text-center text-gray-400">
                  No articles found. Click &quot;Create New Article&quot; to begin.
                </td>
              </tr>
            ) : (
              articles.map((article) => {
                const otherLang: LanguageCode = article.language === 'en' ? 'ta' : 'en'
                const translationCounterpart = article.translations.find((t) => t.language === otherLang)

                return (
                  <tr key={article.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                    <td className="px-6 py-4 max-w-xs">
                      <div className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-2">
                        {article.title}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {article.reading_time_minutes} min read • Updated{' '}
                        {new Date(article.updated_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300">
                        {article.language}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-gray-600 dark:text-gray-300">
                      {article.primary_category_name || 'Uncategorized'}
                    </td>
                    <td className="px-6 py-4 text-xs">{article.author_name}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize ${
                          article.status === 'published'
                            ? 'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300'
                            : article.status === 'draft'
                            ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                        }`}
                      >
                        {article.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {translationCounterpart ? (
                        <Link
                          href={`/admin/articles/${translationCounterpart.article_id}/edit`}
                          className="inline-flex items-center gap-1 text-primary-600 hover:underline"
                        >
                          <span className="font-semibold uppercase">{otherLang}</span>
                          <span className="text-[10px] capitalize">({translationCounterpart.status})</span>
                        </Link>
                      ) : (
                        <Link
                          href={`/admin/articles/new?translationGroupId=${article.translation_group_id}&language=${otherLang}`}
                          className="text-xs text-gray-400 hover:text-primary-600 hover:underline"
                        >
                          + Add {otherLang.toUpperCase()}
                        </Link>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      <div>👁 {article.view_count}</div>
                      <div>❤️ {article.like_count}</div>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <Link
                        href={`/admin/articles/${article.id}/edit`}
                        className="text-xs font-medium text-primary-600 hover:underline"
                      >
                        Edit
                      </Link>

                      {article.status !== 'archived' && (
                        <button
                          onClick={() => handleArchive(article.id)}
                          disabled={isPending}
                          className="text-xs font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                        >
                          Archive
                        </button>
                      )}

                      <button
                        onClick={() => setDeleteTargetId(article.id)}
                        disabled={isPending}
                        className="text-xs font-medium text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Bar */}
      {totalPages > 1 && (
        <div className="flex justify-between items-center text-sm text-gray-500 pt-2">
          <div>
            Showing page {currentPage} of {totalPages} ({totalCount} total)
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleFilterChange('page', String(Math.max(1, currentPage - 1)))}
              disabled={currentPage <= 1}
              className="px-3 py-1 border border-gray-300 rounded text-xs disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => handleFilterChange('page', String(Math.min(totalPages, currentPage + 1)))}
              disabled={currentPage >= totalPages}
              className="px-3 py-1 border border-gray-300 rounded text-xs disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl border border-gray-200 dark:border-gray-800 max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
              Confirm Delete
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              {userRole === 'author'
                ? 'As an author, this article will be archived and removed from public view.'
                : 'Are you sure you want to permanently delete this article? This action is irreversible.'}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTargetId(null)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-xs font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteTargetId)}
                disabled={isPending}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium"
              >
                {isPending ? 'Deleting...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
