import React from 'react'
import type { Metadata } from 'next'

interface StaticPageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: StaticPageProps): Promise<Metadata> {
  const { locale } = await params
  return {
    title: locale === 'ta' ? 'சேவை விதிமுறைகள் — PostsApp' : 'Terms of Service — PostsApp',
    description: 'PostsApp Terms of Service — Terms governing reader and editorial access.',
    alternates: {
      canonical: `/${locale}/terms`,
    },
  }
}

export default async function TermsPage({ params }: StaticPageProps) {
  const { locale } = await params
  const isTa = locale === 'ta'

  return (
    <main id="main-content" className="max-w-3xl mx-auto px-4 py-12 space-y-6">
      <div className="border-b border-gray-200 dark:border-gray-800 pb-4">
        <h1 className="text-3xl font-black text-gray-900 dark:text-white">
          {isTa ? 'சேவை விதிமுறைகள்' : 'Terms of Service'}
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          {isTa ? 'கடைசியாக புதுப்பிக்கப்பட்டது: நவம்பர் 2026' : 'Last updated: November 2026'}
        </p>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-3 rounded text-xs text-amber-800 dark:text-amber-300">
        <em>[Pending legal review]</em> — These Terms of Service are drafted for operational alignment and are pending formal legal counsel review.
      </div>

      <div className="prose dark:prose-invert text-sm leading-relaxed space-y-4">
        <h3 className="text-base font-bold text-gray-900 dark:text-white">
          1. Acceptance of Terms
        </h3>
        <p>
          By accessing or using the PostsApp digital news service, you agree to comply with and be bound by these Terms of Service.
        </p>

        <h3 className="text-base font-bold text-gray-900 dark:text-white">
          2. Intellectual Property
        </h3>
        <p>
          All published text, photographic journalism, branding, and layouts are the exclusive intellectual property of PostsApp or its licensed content contributors. Unauthorized scraping, wholesale automated redistribution, or infringement of editorial copyright is strictly prohibited.
        </p>

        <h3 className="text-base font-bold text-gray-900 dark:text-white">
          3. Fair Use & Sharing
        </h3>
        <p>
          Readers are encouraged to share articles through provided canonical social share links (WhatsApp, X, Facebook, Telegram, and native share sheets) provided that attribution and canonical URLs are preserved intact.
        </p>

        <h3 className="text-base font-bold text-gray-900 dark:text-white">
          4. Disclaimer
        </h3>
        <p>
          PostsApp strives for complete journalistic accuracy. If you identify a factual error, please reach out to our editorial desk for verification and correction.
        </p>
      </div>
    </main>
  )
}
