import React from 'react'
import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAuthenticatedUserProfile } from '@/lib/supabase/server'
import { getAdminAnalytics } from '@/modules/admin/analytics.service'

export const metadata: Metadata = {
  title: 'Analytics | PostsApp CMS',
  robots: { index: false, follow: false },
}

export default async function AdminAnalyticsPage() {
  const profile = await getAuthenticatedUserProfile()
  if (!profile || !['author', 'editor', 'super_admin'].includes(profile.role)) {
    redirect('/admin/login')
  }

  const isAuthorOnly = profile.role === 'author'
  const analytics = await getAdminAnalytics({
    role: profile.role,
    currentUserId: profile.id,
  })

  // Find max views for chart scaling
  const maxDayViews = Math.max(...analytics.timeSeries7d.map((d) => d.views), 1)

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
            Editorial Analytics
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            {isAuthorOnly
              ? 'Performance metrics for your published stories'
              : 'Publication-wide real-time metrics and engagement'}
          </p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary-50 dark:bg-primary-950 text-primary-700 dark:text-primary-300 border border-primary-200 dark:border-primary-800">
          {isAuthorOnly ? 'Author Scope' : 'Publication Overview'}
        </span>
      </div>

      {/* 1. Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
            Total Views
          </span>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
              {analytics.totalViews.toLocaleString()}
            </span>
          </div>
          <span className="text-[11px] text-gray-400 mt-1 block">Deduplicated 24h reads</span>
        </div>

        <div className="p-5 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
            Reader Likes
          </span>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-black text-red-600 dark:text-red-400">
              {analytics.totalLikes.toLocaleString()}
            </span>
          </div>
          <span className="text-[11px] text-gray-400 mt-1 block">Registered reader hearts</span>
        </div>

        <div className="p-5 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
            Published Stories
          </span>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
              {analytics.publishedArticles}
            </span>
            <span className="text-xs text-gray-400">({analytics.draftArticles} drafts)</span>
          </div>
          <span className="text-[11px] text-gray-400 mt-1 block">Across EN and TA editions</span>
        </div>

        <div className="p-5 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm">
          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
            {isAuthorOnly ? 'Your Articles' : 'Active Authors'}
          </span>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-black text-primary-600 dark:text-primary-400">
              {analytics.activeAuthors}
            </span>
          </div>
          <span className="text-[11px] text-gray-400 mt-1 block">Contributing journalists</span>
        </div>
      </div>

      {/* 2. 7-Day Views Trend Bar Chart */}
      <section className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-gray-900 dark:text-white">
          7-Day Reading Traffic Trend
        </h2>
        <div className="pt-4 flex items-end justify-between h-44 gap-2 sm:gap-4 border-b border-gray-200 dark:border-gray-800 pb-2">
          {analytics.timeSeries7d.map((day) => {
            const heightPercent = Math.max(8, Math.round((day.views / maxDayViews) * 100))
            return (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-2 group">
                <div className="text-[10px] font-bold text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  {day.views}
                </div>
                <div className="w-full max-w-[42px] bg-gray-100 dark:bg-gray-800 rounded-t-lg overflow-hidden h-32 flex items-end">
                  <div
                    style={{ height: `${heightPercent}%` }}
                    className="w-full bg-primary-600 dark:bg-primary-500 rounded-t-lg transition-all group-hover:bg-primary-500"
                  />
                </div>
                <span className="text-[10px] text-gray-500 font-medium truncate max-w-[50px]">
                  {day.date.slice(5)}
                </span>
              </div>
            )
          })}
        </div>
      </section>

      {/* 3. Top Articles Table */}
      <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            Top Performing Stories
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 border-b border-gray-200 dark:border-gray-800">
              <tr>
                <th className="p-3 font-semibold">Title</th>
                <th className="p-3 font-semibold">Edition</th>
                <th className="p-3 font-semibold">Author</th>
                <th className="p-3 font-semibold text-right">Views</th>
                <th className="p-3 font-semibold text-right">Likes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {analytics.topArticles.map((art) => (
                <tr key={art.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                  <td className="p-3 max-w-sm">
                    <Link
                      href={`/admin/articles/${art.id}/edit`}
                      className="font-medium text-gray-900 dark:text-gray-100 hover:text-primary-600 line-clamp-1"
                    >
                      {art.title}
                    </Link>
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded uppercase font-bold text-[10px] ${
                        art.language === 'ta'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {art.language}
                    </span>
                  </td>
                  <td className="p-3 text-gray-500">{art.authorName}</td>
                  <td className="p-3 text-right font-mono font-semibold">{art.viewCount}</td>
                  <td className="p-3 text-right font-mono text-red-600 font-semibold">{art.likeCount}</td>
                </tr>
              ))}
              {analytics.topArticles.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-gray-400">
                    No published articles recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 4. Author Performance Table (Editor / SuperAdmin only) */}
      {!isAuthorOnly && analytics.authorPerformance.length > 0 && (
        <section className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100 dark:border-gray-800">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">
              Author Performance Leaderboard
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 dark:bg-gray-800/50 text-gray-500 border-b border-gray-200 dark:border-gray-800">
                <tr>
                  <th className="p-3 font-semibold">Author</th>
                  <th className="p-3 font-semibold text-center">Published Stories</th>
                  <th className="p-3 font-semibold text-right">Total Reads</th>
                  <th className="p-3 font-semibold text-right">Total Likes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {analytics.authorPerformance.map((auth) => (
                  <tr key={auth.authorId} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                    <td className="p-3 font-semibold text-gray-900 dark:text-white">
                      {auth.authorName}
                    </td>
                    <td className="p-3 text-center font-mono">{auth.articlesCount}</td>
                    <td className="p-3 text-right font-mono font-bold text-primary-600">
                      {auth.totalViews.toLocaleString()}
                    </td>
                    <td className="p-3 text-right font-mono font-semibold text-red-500">
                      {auth.totalLikes.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  )
}
