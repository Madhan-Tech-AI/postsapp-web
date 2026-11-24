import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'

interface HomePageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: HomePageProps): Promise<Metadata> {
  const { locale } = await params
  return {
    title: 'PostsApp — Your News, Your Language',
    alternates: {
      canonical: `/${locale}`,
      languages: {
        'en': '/en',
        'ta': '/ta',
        'x-default': '/en',
      },
    },
  }
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'home' })

  return (
    <main id="main-content">
      {/* Phase 7 will fill this with the full homepage layout */}
      {/* Placeholder for Phase 1 gate */}
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-primary-600 mb-4">PostsApp</h1>
          <p className="text-muted text-lg">
            {locale === 'ta' ? 'உங்கள் செய்தி, உங்கள் மொழியில்' : 'Your News, Your Language'}
          </p>
          <p className="mt-4 text-sm text-gray-400">
            Phase 1 (Foundation) — Schema, RLS, CI scaffolding complete
          </p>
        </div>
      </div>
    </main>
  )
}
