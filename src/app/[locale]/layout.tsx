import React from 'react'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { PublicHeader } from '@/components/layout/public-header'
import { PublicFooter } from '@/components/layout/public-footer'
import type { LanguageCode } from '@/lib/schemas'

const locales = ['en', 'ta'] as const
type Locale = typeof locales[number]

interface LocaleLayoutProps {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}

export async function generateStaticParams() {
  return locales.map((locale) => ({ locale }))
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params

  if (!locales.includes(locale as Locale)) {
    notFound()
  }

  const messages = await getMessages()

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 antialiased selection:bg-primary-500 selection:text-white" lang={locale} dir="ltr">
      <a href="#main-content" className="skip-link">
        {locale === 'ta' ? 'முக்கிய உள்ளடக்கத்திற்குச் செல்லவும்' : 'Skip to main content'}
      </a>
      <NextIntlClientProvider locale={locale} messages={messages}>
        <PublicHeader locale={locale as LanguageCode} />
        <div className="flex-1">
          {children}
        </div>
        <PublicFooter locale={locale as LanguageCode} />
      </NextIntlClientProvider>
    </div>
  )
}
