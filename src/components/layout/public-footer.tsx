import React from 'react'
import Link from 'next/link'
import type { LanguageCode } from '@/lib/schemas'

interface PublicFooterProps {
  locale: LanguageCode
}

export function PublicFooter({ locale }: PublicFooterProps) {
  const year = new Date().getFullYear()

  const categories =
    locale === 'ta'
      ? [
          { name: 'தேசிய செய்திகள்', slug: 'national' },
          { name: 'சர்வதேசம்', slug: 'international' },
          { name: 'அரசியல்', slug: 'politics' },
          { name: 'தொழில்நுட்பம்', slug: 'technology' },
          { name: 'வணிகம்', slug: 'business' },
          { name: 'கல்வி', slug: 'education' },
          { name: 'விளையாட்டு', slug: 'sports' },
          { name: 'சினிமா & பொழுதுபோக்கு', slug: 'entertainment' },
        ]
      : [
          { name: 'National', slug: 'national' },
          { name: 'International', slug: 'international' },
          { name: 'Politics', slug: 'politics' },
          { name: 'Technology', slug: 'technology' },
          { name: 'Business', slug: 'business' },
          { name: 'Education', slug: 'education' },
          { name: 'Sports', slug: 'sports' },
          { name: 'Entertainment', slug: 'entertainment' },
        ]

  return (
    <footer className="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60 mt-16 text-sm text-gray-600 dark:text-gray-400">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand Col */}
          <div className="md:col-span-1 space-y-3">
            <Link href={`/${locale}`} className="text-2xl font-black text-primary-700 dark:text-primary-400">
              PostsApp
            </Link>
            <p className="text-xs text-gray-500 leading-relaxed">
              {locale === 'ta'
                ? 'தமிழ் மற்றும் ஆங்கிலத்தில் உண்மையான, நடுநிலையான டிஜிட்டல் செய்தி தளம்.'
                : 'Bilingual digital news publishing platform delivering accurate and impartial journalism in English and Tamil.'}
            </p>
          </div>

          {/* Categories Col */}
          <div className="md:col-span-2 space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
              {locale === 'ta' ? 'வகைகள்' : 'Categories'}
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              {categories.map((c) => (
                <Link
                  key={c.slug}
                  href={`/${locale}/category/${c.slug}`}
                  className="hover:text-primary-600 hover:underline"
                >
                  {c.name}
                </Link>
              ))}
            </div>
          </div>

          {/* Legal and Quick Links */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-white">
              {locale === 'ta' ? 'முக்கிய பக்கங்கள்' : 'Company & Legal'}
            </h4>
            <ul className="space-y-1.5 text-xs">
              <li>
                <Link href={`/${locale}/about`} className="hover:text-primary-600">
                  {locale === 'ta' ? 'எங்களை பற்றி' : 'About Us'}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/contact`} className="hover:text-primary-600">
                  {locale === 'ta' ? 'தொடர்பு கொள்க' : 'Contact Us'}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/privacy`} className="hover:text-primary-600">
                  {locale === 'ta' ? 'தனியுரிமைக் கொள்கை' : 'Privacy Policy'}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/terms`} className="hover:text-primary-600">
                  {locale === 'ta' ? 'சேவை விதிமுறைகள்' : 'Terms of Service'}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-200 dark:border-gray-800 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-400">
          <p>
            {locale === 'ta'
              ? `© ${year} PostsApp. அனைத்து உரிமைகளும் பாதுகாக்கப்பட்டவை.`
              : `© ${year} PostsApp. All rights reserved.`}
          </p>
          <p className="mt-2 sm:mt-0">
            {locale === 'ta' ? 'உயர் தரம் • விரைவான செய்தி' : 'Truth in Journalism'}
          </p>
        </div>
      </div>
    </footer>
  )
}
