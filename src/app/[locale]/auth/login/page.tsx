import type { Metadata } from 'next'
import { LoginForm } from '@/modules/auth/components/login-form'

interface LoginPageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Log In',
    robots: { index: false, follow: false },
  }
}

export default async function LoginPage({ params }: LoginPageProps) {
  const { locale } = await params
  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-950">
      <LoginForm locale={locale} />
    </div>
  )
}
