import { getRequestConfig } from 'next-intl/server'
import { notFound } from 'next/navigation'

export const locales = ['en', 'ta'] as const
export type Locale = typeof locales[number]

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = await requestLocale

  // Validate locale
  if (!locale || !locales.includes(locale as Locale)) {
    notFound()
  }

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
  }
})
