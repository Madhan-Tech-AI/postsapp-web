import { getRequestConfig } from 'next-intl/server'

export const locales = ['en', 'ta'] as const
export type Locale = (typeof locales)[number]

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale

  // If requestLocale is not provided by middleware, fallback to 'en'
  if (!locale || !locales.includes(locale as Locale)) {
    locale = 'en'
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  }
})
