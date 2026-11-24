import React from 'react'
import type { Metadata } from 'next'

interface StaticPageProps {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: StaticPageProps): Promise<Metadata> {
  const { locale } = await params
  return {
    title: locale === 'ta' ? 'தொடர்பு கொள்க — PostsApp' : 'Contact Us — PostsApp',
    description: 'Get in touch with the PostsApp editorial and management team.',
    alternates: {
      canonical: `/${locale}/contact`,
    },
  }
}

export default async function ContactPage({ params }: StaticPageProps) {
  const { locale } = await params
  const isTa = locale === 'ta'

  return (
    <main id="main-content" className="max-w-3xl mx-auto px-4 py-12 space-y-6">
      <div className="border-b border-gray-200 dark:border-gray-800 pb-4">
        <h1 className="text-3xl font-black text-gray-900 dark:text-white">
          {isTa ? 'தொடர்பு கொள்க' : 'Contact Us'}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {isTa ? 'தலையங்கக் குழு மற்றும் வாசகர் சேவை' : 'Editorial Inquiries & Reader Support'}
        </p>
      </div>

      <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 p-3 rounded text-xs text-amber-800 dark:text-amber-300">
        <em>[Pending legal review]</em> — Contact routes and response timelines are subject to formal publishing guidelines.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
        <div className="p-5 border border-gray-100 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-900/60 space-y-2">
          <h3 className="font-bold text-gray-900 dark:text-white">
            {isTa ? 'செய்தி குறிப்புகள் மற்றும் தலையங்கம்' : 'Editorial Desk'}
          </h3>
          <p className="text-xs text-gray-500">
            {isTa
              ? 'செய்தி குறிப்புகள், திருத்தங்கள் மற்றும் தலையங்க கருத்துக்களுக்கு:'
              : 'For press releases, news tips, correction requests, and editorial queries:'}
          </p>
          <p className="text-primary-600 font-semibold font-mono text-xs">
            editorial@postsapp.in
          </p>
        </div>

        <div className="p-5 border border-gray-100 dark:border-gray-800 rounded-xl bg-gray-50 dark:bg-gray-900/60 space-y-2">
          <h3 className="font-bold text-gray-900 dark:text-white">
            {isTa ? 'பொது மற்றும் சட்ட விவகாரங்கள்' : 'General & Legal Inquiries'}
          </h3>
          <p className="text-xs text-gray-500">
            {isTa
              ? 'காப்புரிமை, தனியுரிமை மற்றும் பொது நிர்வாகத் தொடர்புக்கு:'
              : 'For copyright notices, privacy inquiries, and administrative matters:'}
          </p>
          <p className="text-primary-600 font-semibold font-mono text-xs">
            contact@postsapp.in
          </p>
        </div>
      </div>
    </main>
  )
}
