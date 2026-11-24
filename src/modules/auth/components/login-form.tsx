'use client'

import { useActionState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { loginAction } from '../actions'

interface LoginFormProps {
  isAdmin?: boolean
  locale?: string
}

export function LoginForm({ isAdmin = false, locale = 'en' }: LoginFormProps) {
  const t = useTranslations('auth')
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? (isAdmin ? '/admin' : `/${locale}`)
  const urlError = searchParams.get('error')

  const [state, formAction, isPending] = useActionState(loginAction, {
    success: false,
    error: urlError || undefined,
  })

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white dark:bg-gray-900 rounded-xl shadow-md border border-gray-100 dark:border-gray-800">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {isAdmin ? 'Editorial Login' : t('login')}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {isAdmin
            ? 'Sign in to access the editorial CMS and administration console'
            : 'Welcome back to PostsApp'}
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
          className="mb-4 p-3 bg-green-50 dark:bg-green-950/40 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-700 dark:text-green-300"
        >
          {state.message}
        </div>
      )}

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="next" value={next} />

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
          <div className="flex justify-between items-center mb-1">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              {t('password')}
            </label>
            <Link
              href={isAdmin ? '/admin/reset-password' : `/${locale}/auth/forgot-password`}
              className="text-xs text-primary-600 hover:text-primary-700 hover:underline"
            >
              {t('forgot_password')}
            </Link>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-gray-800 dark:text-gray-100 text-sm outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-2.5 px-4 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          {isPending ? 'Logging in...' : t('login')}
        </button>
      </form>

      {!isAdmin && (
        <p className="mt-6 text-center text-sm text-gray-500">
          Don&apos;t have an account?{' '}
          <Link
            href={`/${locale}/auth/register`}
            className="font-medium text-primary-600 hover:text-primary-700 hover:underline"
          >
            {t('register')}
          </Link>
        </p>
      )}
    </div>
  )
}
