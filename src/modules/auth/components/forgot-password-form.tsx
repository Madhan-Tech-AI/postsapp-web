'use client'

import { useActionState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { forgotPasswordAction } from '../actions'

interface ForgotPasswordFormProps {
  locale: string
}

export function ForgotPasswordForm({ locale }: ForgotPasswordFormProps) {
  const t = useTranslations('auth')
  const [state, formAction, isPending] = useActionState(forgotPasswordAction, {
    success: false,
  })

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white dark:bg-gray-900 rounded-xl shadow-md border border-gray-100 dark:border-gray-800">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          {t('reset_password')}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Enter your email to receive password reset instructions
        </p>
      </div>

      {state.error && (
        <div role="alert" className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {state.error}
        </div>
      )}

      {state.message && (
        <div role="status" className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
          {state.message}
        </div>
      )}

      {!state.success && (
        <form action={formAction} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('email')}
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-800"
            />
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="w-full py-2.5 px-4 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-colors"
          >
            {isPending ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-gray-500">
        Remembered your password?{' '}
        <Link href={`/${locale}/auth/login`} className="font-medium text-primary-600 hover:underline">
          {t('login')}
        </Link>
      </p>
    </div>
  )
}
