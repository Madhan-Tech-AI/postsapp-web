import type { Metadata } from 'next'
import { ForgotPasswordForm } from '@/modules/auth/components/forgot-password-form'

interface ForgotPasswordPageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Reset Password',
    robots: { index: false, follow: false },
  }
}

export default async function ForgotPasswordPage({ params }: ForgotPasswordPageProps) {
  const { locale } = await params
  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-950">
      <ForgotPasswordForm locale={locale} />
    </div>
  )
}
