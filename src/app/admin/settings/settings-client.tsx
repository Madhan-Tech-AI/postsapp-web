'use client'

import React, { useActionState } from 'react'
import { updateSiteSettingsAction } from '@/modules/admin/actions'
import type { SiteSettingsMap } from '@/modules/admin/settings.service'

interface SettingsClientProps {
  initialSettings: SiteSettingsMap
}

export function SettingsClient({ initialSettings }: SettingsClientProps) {
  const [state, formAction, isPending] = useActionState(updateSiteSettingsAction, {
    success: false,
  })

  return (
    <form action={formAction} className="space-y-6 max-w-3xl">
      {state.error && (
        <div role="alert" className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {state.error}
        </div>
      )}

      {state.success && (
        <div role="status" className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
          Site settings successfully saved and published.
        </div>
      )}

      {/* General Settings */}
      <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2">
          General Identity
        </h2>

        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Site Name
          </label>
          <input
            type="text"
            name="site_name"
            defaultValue={initialSettings.site_name}
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Site Tagline
          </label>
          <input
            type="text"
            name="site_tagline"
            defaultValue={initialSettings.site_tagline}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Canonical Base URL
          </label>
          <input
            type="url"
            name="canonical_base_url"
            defaultValue={initialSettings.canonical_base_url}
            required
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800 font-mono text-xs"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Default Language
          </label>
          <select
            name="default_language"
            defaultValue={initialSettings.default_language}
            className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800"
          >
            <option value="en">English (en)</option>
            <option value="ta">தமிழ் (ta)</option>
          </select>
        </div>
      </div>

      {/* Breaking News Ticker */}
      <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2">
          Breaking News Banner
        </h2>

        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="breaking_enabled"
            name="breaking_enabled"
            value="true"
            defaultChecked={initialSettings.breaking_news.enabled}
            className="w-4 h-4 text-primary-600 rounded"
          />
          <label htmlFor="breaking_enabled" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
            Enable Breaking News Banner across reader site
          </label>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Breaking Headline (English)
          </label>
          <input
            type="text"
            name="breaking_text_en"
            defaultValue={initialSettings.breaking_news.text_en}
            placeholder="e.g. Election results declared in southern states..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Breaking Headline (தமிழ்)
          </label>
          <input
            type="text"
            name="breaking_text_ta"
            defaultValue={initialSettings.breaking_news.text_ta}
            placeholder="e.g. தென் மாநில தேர்தல் முடிவுகள் அறிவிப்பு..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800"
          />
        </div>
      </div>

      {/* Social Media Links */}
      <div className="bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-4">
        <h2 className="text-base font-bold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2">
          Official Social Links
        </h2>

        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            X / Twitter Profile URL
          </label>
          <input
            type="url"
            name="twitter_url"
            defaultValue={initialSettings.social_links.twitter || ''}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            Facebook Page URL
          </label>
          <input
            type="url"
            name="facebook_url"
            defaultValue={initialSettings.social_links.facebook || ''}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
            YouTube Channel URL
          </label>
          <input
            type="url"
            name="youtube_url"
            defaultValue={initialSettings.social_links.youtube || ''}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm bg-white dark:bg-gray-800"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors"
        >
          {isPending ? 'Saving Settings...' : 'Save Settings'}
        </button>
      </div>
    </form>
  )
}
