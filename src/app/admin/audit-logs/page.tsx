import React from 'react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAuthenticatedUserProfile } from '@/lib/supabase/server'
import { getAuditLogs } from '@/modules/admin/audit.service'
import { formatDate } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Audit Logs | PostsApp Admin',
  robots: { index: false, follow: false },
}

interface AuditLogsPageProps {
  searchParams: Promise<{
    action?: string
    targetType?: string
    page?: string
  }>
}

export default async function AdminAuditLogsPage({ searchParams }: AuditLogsPageProps) {
  const profile = await getAuthenticatedUserProfile()
  if (!profile || !['editor', 'super_admin'].includes(profile.role)) {
    redirect('/admin')
  }

  const resolved = await searchParams
  const action = (resolved.action as any) || 'all'
  const targetType = resolved.targetType || 'all'
  const page = parseInt(resolved.page || '1', 10)

  const { logs, totalCount } = await getAuditLogs({
    action,
    targetType,
    page,
    limit: 25,
  })

  const totalPages = Math.ceil(totalCount / 25)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
          Audit Logs
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          Immutable audit record of publishing, role changes, settings, and privileged operations
        </p>
      </div>

      {/* Filter Bar */}
      <form method="GET" action="/admin/audit-logs" className="flex flex-wrap gap-3 bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm text-xs">
        <div>
          <label className="block text-gray-500 font-medium mb-1">Action</label>
          <select
            name="action"
            defaultValue={action}
            className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
          >
            <option value="all">All Actions</option>
            <option value="article_publish">article_publish</option>
            <option value="article_unpublish">article_unpublish</option>
            <option value="article_archive">article_archive</option>
            <option value="article_delete">article_delete</option>
            <option value="role_change">role_change</option>
            <option value="user_activate">user_activate</option>
            <option value="user_deactivate">user_deactivate</option>
            <option value="site_setting_change">site_setting_change</option>
            <option value="category_create">category_create</option>
            <option value="category_update">category_update</option>
            <option value="media_delete">media_delete</option>
          </select>
        </div>

        <div>
          <label className="block text-gray-500 font-medium mb-1">Target Type</label>
          <select
            name="targetType"
            defaultValue={targetType}
            className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
          >
            <option value="all">All Targets</option>
            <option value="article">article</option>
            <option value="profile">profile</option>
            <option value="site_settings">site_settings</option>
            <option value="categories">categories</option>
            <option value="media">media</option>
          </select>
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            className="px-4 py-1.5 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-lg shadow-sm"
          >
            Filter
          </button>
        </div>
      </form>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="p-3 font-semibold">Timestamp</th>
                <th className="p-3 font-semibold">Action</th>
                <th className="p-3 font-semibold">Actor</th>
                <th className="p-3 font-semibold">Target</th>
                <th className="p-3 font-semibold">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-mono">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                  <td className="p-3 whitespace-nowrap text-gray-500">
                    {formatDate(log.created_at, 'en')} {log.created_at.slice(11, 19)}
                  </td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded font-bold uppercase text-[10px] bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300">
                      {log.action}
                    </span>
                  </td>
                  <td className="p-3 font-sans text-gray-900 dark:text-gray-100">
                    {log.actor_name}
                  </td>
                  <td className="p-3 text-gray-500">
                    <span className="font-semibold">{log.target_type}</span>: {log.target_id?.slice(0, 8)}...
                  </td>
                  <td className="p-3 max-w-xs truncate text-gray-400 font-sans" title={JSON.stringify(log.metadata)}>
                    {JSON.stringify(log.metadata)}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-gray-400 font-sans">
                    No audit records matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2 pt-4 text-xs font-semibold">
          {page > 1 && (
            <Link
              href={`/admin/audit-logs?action=${action}&targetType=${targetType}&page=${page - 1}`}
              className="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100"
            >
              ← Previous
            </Link>
          )}
          <span className="text-gray-500 px-2">{page} / {totalPages}</span>
          {page < totalPages && (
            <Link
              href={`/admin/audit-logs?action=${action}&targetType=${targetType}&page=${page + 1}`}
              className="px-3 py-1.5 rounded border border-gray-300 dark:border-gray-700 hover:bg-gray-100"
            >
              Next →
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
