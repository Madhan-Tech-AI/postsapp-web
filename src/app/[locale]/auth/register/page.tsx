import type { Metadata } from 'next'
import { RegisterForm } from '@/modules/auth/components/register-form'

interface RegisterPageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Create Account',
    robots: { index: false, follow: false },
  }
}

export default async function RegisterPage({ params }: RegisterPageProps) {
  const { locale } = await params
  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-950">
      <RegisterForm locale={locale} />
    </div>
  )
}
