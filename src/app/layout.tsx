import type { Metadata } from 'next'
import { Noto_Sans, Noto_Serif, Noto_Sans_Tamil, Noto_Serif_Tamil } from 'next/font/google'
import './globals.css'

const notoSans = Noto_Sans({
  subsets: ['latin'],
  variable: '--font-noto-sans',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})

const notoSerif = Noto_Serif({
  subsets: ['latin'],
  variable: '--font-noto-serif',
  display: 'swap',
  weight: ['400', '700'],
})

const notoSansTamil = Noto_Sans_Tamil({
  subsets: ['tamil'],
  variable: '--font-noto-sans-tamil',
  display: 'swap',
  weight: ['400', '500', '600', '700'],
})

const notoSerifTamil = Noto_Serif_Tamil({
  subsets: ['tamil'],
  variable: '--font-noto-serif-tamil',
  display: 'swap',
  weight: ['400', '700'],
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://postsapp.in'),
  title: {
    template: '%s | PostsApp',
    default: 'PostsApp — Your News, Your Language',
  },
  description: 'Bilingual digital news platform in English and Tamil',
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      className={`${notoSans.variable} ${notoSerif.variable} ${notoSansTamil.variable} ${notoSerifTamil.variable}`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        {children}
      </body>
    </html>
  )
}
