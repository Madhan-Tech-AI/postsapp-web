'use client'

import { useActionState, useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { registerAction } from '../actions'

interface RegisterFormProps {
  locale: string
}

export function RegisterForm({ locale }: RegisterFormProps) {
  const t = useTranslations('auth')
  const [password, setPassword] = useState('')

  const [state, formAction, isPending] = useActionState(registerAction, {
    success: false,
  })

  // Password rules validation for client feedback
  const hasLength = password.length >= 10
  const hasLetter = /[A-Za-z]/.test(password)
  const hasDigit = /[0-9]/.test(password)

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white dark:bg-gray-900 rounded-xl shadow-md border border-gray-100 dark:border-gray-800">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {t('register')}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Join PostsApp to like and interact with articles
        </p>
      </div>

      {state.error && (
        <div
          role="alert"
          className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-300"
        >
          {state.error}
        </div>
      )}

      {state.message && (
        <div
          role="status"
          className="mb-4 p-4 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-800 dark:text-green-200"
        >
          <p className="font-semibold">{t('verify_email')}</p>
          <p className="mt-1 text-xs">{state.message}</p>
        </div>
      )}

      {!state.success && (
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="preferredLanguage" value={locale} />

          <div>
            <label
              htmlFor="displayName"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              {t('display_name')}
            </label>
            <input
              id="displayName"
              name="displayName"
              type="text"
              required
              minLength={2}
              maxLength={100}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:text-gray-100 text-sm outline-none"
              placeholder="Your Name"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              {t('email')}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:text-gray-100 text-sm outline-none"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              {t('password')}
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:text-gray-100 text-sm outline-none"
            />
            {/* Password strength checklist */}
            <div className="mt-2 text-xs space-y-1 text-gray-500">
              <div className={`flex items-center gap-1.5 ${hasLength ? 'text-green-600' : ''}`}>
                <span>{hasLength ? '✓' : '○'}</span> At least 10 characters
              </div>
              <div className={`flex items-center gap-1.5 ${hasLetter ? 'text-green-600' : ''}`}>
                <span>{hasLetter ? '✓' : '○'}</span> At least one letter
              </div>
              <div className={`flex items-center gap-1.5 ${hasDigit ? 'text-green-600' : ''}`}>
                <span>{hasDigit ? '✓' : '○'}</span> At least one number
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending || !hasLength || !hasLetter || !hasDigit}
            className="w-full py-2.5 px-4 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            {isPending ? 'Creating account...' : t('register')}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-gray-500">
        Already have an account?{' '}
        <Link
          href={`/${locale}/auth/login`}
          className="font-medium text-primary-600 hover:text-primary-700 hover:underline"
        >
          {t('login')}
        </Link>
      </p>
    </div>
  )
}
