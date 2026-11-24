import type { Metadata } from 'next'
import { ResetPasswordForm } from '@/modules/auth/components/reset-password-form'

interface ResetPasswordPageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Set New Password',
    robots: { index: false, follow: false },
  }
}

export default async function ResetPasswordPage({ params }: ResetPasswordPageProps) {
  const { locale } = await params
  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-950">
      <ResetPasswordForm locale={locale} />
    </div>
  )
}
