import React from 'react'
import type { Metadata } from 'next'

interface StaticPageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: StaticPageProps): Promise<Metadata> {
  const { locale } = await params
  return {
    title: locale === 'ta' ? 'தனியுரிமைக் கொள்கை — PostsApp' : 'Privacy Policy — PostsApp',
    description: 'PostsApp Privacy Policy — Reader privacy, GDPR data rights, and account deletion.',
    alternates: {
      canonical: `/${locale}/privacy`,
    },
  }
}

export default async function PrivacyPolicyPage({ params }: StaticPageProps) {
  const { locale } = await params
  const isTa = locale === 'ta'

  return (
    <main id="main-content" className="max-w-3xl mx-auto px-4 py-12 space-y-6">
      <div className="border-b border-gray-200 dark:border-gray-800 pb-4">
        <h1 className="text-3xl font-black text-gray-900 dark:text-white">
          {isTa ? 'தனியுரிமைக் கொள்கை' : 'Privacy Policy'}
        </h1>
        <p className="text-xs text-gray-500 mt-1">
          {isTa ? 'கடைசியாக புதுப்பிக்கப்பட்டது: நவம்பர் 2026' : 'Last updated: November 2026'}
        </p>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-3 rounded text-xs text-amber-800 dark:text-amber-300">
        <em>[Pending legal review]</em> — This privacy notice describes current technical implementation and data policies and is pending final legal counsel review.
      </div>

      <div className="prose dark:prose-invert text-sm leading-relaxed space-y-4">
        <h3 className="text-base font-bold text-gray-900 dark:text-white">
          1. Data Minimization Principles
        </h3>
        <p>
          PostsApp collects only the minimal data necessary to provide a reliable news reading experience. We do not sell reader personal data or utilize intrusive third-party cross-site behavioral advertising trackers.
        </p>

        <h3 className="text-base font-bold text-gray-900 dark:text-white">
          2. Information We Collect
        </h3>
        <ul className="list-disc pl-5 space-y-1 text-xs">
          <li><strong>Registered Readers:</strong> Email address, display name, encrypted credentials (managed via Supabase Auth), and language preference.</li>
          <li><strong>Engagement:</strong> Saved article likes linked to your registered profile.</li>
          <li><strong>Aggregated Metrics:</strong> Anonymous view counts computed via rotating salted one-way hashes to prevent persistent device fingerprinting.</li>
        </ul>

        <h3 className="text-base font-bold text-gray-900 dark:text-white">
          3. Right to Erasure (Account Deletion)
        </h3>
        <p>
          Under our GDPR compliance model, registered readers retain full control over their personal data. You may execute complete, permanent self-deletion of your account and personal likes directly from your Profile settings at any time.
        </p>

        <h3 className="text-base font-bold text-gray-900 dark:text-white">
          4. Contact
        </h3>
        <p>
          For privacy-related questions or data subject access requests, contact privacy@postsapp.in.
        </p>
      </div>
    </main>
  )
}
