import { redirect } from 'next/navigation'

/**
 * Root page — redirects to the language-prefixed home.
 * Final language detection is done in middleware; this is a fallback.
 */
export default function RootPage() {
  redirect('/en')
}
