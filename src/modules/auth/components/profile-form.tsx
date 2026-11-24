'use client'

import { useActionState, useState } from 'react'
import { useTranslations } from 'next-intl'
import { updateProfileAction, deleteAccountAction } from '../actions'
import type { UserRole, LanguageCode } from '@/lib/schemas'

interface ProfileFormProps {
  initialProfile: {
    id: string
    display_name: string
    avatar_url: string | null
    role: UserRole
    preferred_language: LanguageCode
    created_at: string
  }
  userEmail: string
  locale: string
}

export function ProfileForm({ initialProfile, userEmail, locale }: ProfileFormProps) {
  const t = useTranslations('auth')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const [profileState, profileAction, isUpdating] = useActionState(updateProfileAction, {
    success: false,
  })

  const [deleteState, deleteAction, isDeleting] = useActionState(deleteAccountAction, {
    success: false,
  })

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Profile Details Card */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-6">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
          {t('profile')}
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Manage your account information and preferences
        </p>

        {profileState.error && (
          <div role="alert" className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {profileState.error}
          </div>
        )}

        {profileState.message && (
          <div role="status" className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
            {profileState.message}
          </div>
        )}

        <form action={profileAction} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('email')}
            </label>
            <input
              type="email"
              value={userEmail}
              disabled
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-500 cursor-not-allowed"
            />
            <p className="text-xs text-gray-400 mt-1">Email cannot be changed directly.</p>
          </div>

          <div>
            <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('display_name')}
            </label>
            <input
              id="displayName"
              name="displayName"
              type="text"
              required
              defaultValue={initialProfile.display_name}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-800"
            />
          </div>

          <div>
            <label htmlFor="preferredLanguage" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Preferred Language
            </label>
            <select
              id="preferredLanguage"
              name="preferredLanguage"
              defaultValue={initialProfile.preferred_language}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-800"
            >
              <option value="en">English</option>
              <option value="ta">தமிழ் (Tamil)</option>
            </select>
          </div>

          <div>
            <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Account Role</span>
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200 capitalize">
              {initialProfile.role.replace('_', ' ')}
            </span>
          </div>

          <button
            type="submit"
            disabled={isUpdating}
            className="px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
          >
            {isUpdating ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>

      {/* Danger Zone: Account Deletion */}
      <div className="bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-xl p-6">
        <h3 className="text-lg font-bold text-red-900 dark:text-red-300 mb-1">
          {t('delete_account')}
        </h3>
        <p className="text-sm text-red-700 dark:text-red-400 mb-4">
          Permanently delete your account, saved preferences, and article likes. This action cannot be undone.
        </p>

        {deleteState.error && (
          <div role="alert" className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg text-sm text-red-800">
            {deleteState.error}
          </div>
        )}

        {!showDeleteConfirm ? (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {t('delete_account')}
          </button>
        ) : (
          <div className="space-y-3 p-4 bg-white dark:bg-gray-900 rounded-lg border border-red-200">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Are you sure you want to delete your account?
            </p>
            <div className="flex gap-3">
              <form action={deleteAction}>
                <button
                  type="submit"
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {isDeleting ? 'Deleting...' : 'Yes, Delete My Account'}
                </button>
              </form>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
