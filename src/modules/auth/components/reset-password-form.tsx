'use client'

import { useActionState, useState } from 'react'
import { useTranslations } from 'next-intl'
import Link from 'next/link'
import { updatePasswordAction } from '../actions'

interface ResetPasswordFormProps {
  locale: string
}

export function ResetPasswordForm({ locale }: ResetPasswordFormProps) {
  const t = useTranslations('auth')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [state, formAction, isPending] = useActionState(updatePasswordAction, {
    success: false,
  })

  const hasLength = password.length >= 10
  const hasLetter = /[A-Za-z]/.test(password)
  const hasDigit = /[0-9]/.test(password)
  const passwordsMatch = password.length > 0 && password === confirmPassword

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white dark:bg-gray-900 rounded-xl shadow-md border border-gray-100 dark:border-gray-800">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Set New Password
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Create a secure password for your account
        </p>
      </div>

      {state.error && (
        <div role="alert" className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {state.error}
        </div>
      )}

      {state.success ? (
        <div className="text-center py-4 space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
            {state.message || 'Password updated successfully!'}
          </div>
          <Link
            href={`/${locale}/auth/login`}
            className="inline-block px-5 py-2.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
          >
            {t('login')}
          </Link>
        </div>
      ) : (
        <form action={formAction} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              New Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-800"
            />
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

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('confirm_password')}
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-800"
            />
            {confirmPassword && !passwordsMatch && (
              <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isPending || !hasLength || !hasLetter || !hasDigit || !passwordsMatch}
            className="w-full py-2.5 px-4 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-colors"
          >
            {isPending ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      )}
    </div>
  )
}
