import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getAuthenticatedUserProfile } from '@/lib/supabase/server'
import { getCategoriesByLanguage } from '@/modules/articles/articles.service'
import { createDraftAction } from '@/modules/articles/actions'
import type { LanguageCode } from '@/lib/schemas'

export const metadata: Metadata = {
  title: 'Create New Article | PostsApp Editorial',
  robots: { index: false, follow: false },
}

interface NewArticlePageProps {
  searchParams: Promise<{
    language?: LanguageCode
    translationGroupId?: string
  }>
}

export default async function NewArticlePage({ searchParams }: NewArticlePageProps) {
  const profile = await getAuthenticatedUserProfile()
  if (!profile || !['author', 'editor', 'super_admin'].includes(profile.role)) {
    redirect('/admin/login')
  }

  const { language = 'en', translationGroupId } = await searchParams
  const categories = await getCategoriesByLanguage(language)

  async function handleCreateDraft(formData: FormData) {
    'use server'
    await createDraftAction(null, formData)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="border-b border-gray-200 dark:border-gray-800 pb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Create New Article
        </h1>
        <p className="text-sm text-gray-500">
          {translationGroupId
            ? `Drafting ${language === 'ta' ? 'Tamil' : 'English'} translation for linked story.`
            : 'Initialize a new story draft.'}
        </p>
      </div>

      <form action={handleCreateDraft} className="space-y-6 bg-white dark:bg-gray-900 p-6 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
        {translationGroupId && (
          <input type="hidden" name="translationGroupId" value={translationGroupId} />
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Language
            </label>
            <select
              name="language"
              defaultValue={language}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm dark:bg-gray-800"
            >
              <option value="en">English (en)</option>
              <option value="ta">தமிழ் (ta)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Primary Category
            </label>
            <select
              name="categoryId"
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm dark:bg-gray-800"
            >
              <option value="">Select Category</option>
              {categories.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Article Title / Headline
          </label>
          <input
            type="text"
            name="title"
            required
            placeholder="Enter a descriptive headline..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm dark:bg-gray-800 outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            URL Slug
          </label>
          <input
            type="text"
            name="slug"
            required
            pattern="^[a-z0-9-]+$"
            placeholder="e.g. major-policy-announcement"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm dark:bg-gray-800 outline-none focus:ring-2 focus:ring-primary-500 font-mono text-xs"
          />
          <p className="text-xs text-gray-400 mt-1">
            Lowercase letters, numbers, and hyphens only. Slugs must be unique per language.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Short Description (Summary)
          </label>
          <textarea
            name="shortDescription"
            rows={3}
            placeholder="Brief 1-2 sentence summary for article preview cards..."
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm dark:bg-gray-800 outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
          <a
            href="/admin/articles"
            className="px-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Cancel
          </a>
          <button
            type="submit"
            className="px-5 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
          >
            Create Draft & Continue to Editor
          </button>
        </div>
      </form>
    </div>
  )
}
