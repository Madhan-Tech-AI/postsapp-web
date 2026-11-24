'use client'

import React, { useState } from 'react'

interface ShareButtonsProps {
  url: string
  title: string
  locale: string
}

export function ShareButtons({ url, title, locale }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false)

  const encodedUrl = encodeURIComponent(url)
  const encodedTitle = encodeURIComponent(title)

  const shareLinks = [
    {
      name: 'WhatsApp',
      href: `https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`,
      color: 'hover:bg-emerald-600',
      icon: 'WA',
    },
    {
      name: 'X',
      href: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`,
      color: 'hover:bg-black',
      icon: 'X',
    },
    {
      name: 'Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      color: 'hover:bg-blue-600',
      icon: 'FB',
    },
    {
      name: 'Telegram',
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
      color: 'hover:bg-sky-500',
      icon: 'TG',
    },
  ]

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {
      // Fallback
      setCopied(false)
    }
  }

  async function handleNativeShare() {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title,
          url,
        })
      } catch {
        // User cancelled or unsupported
      }
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2" role="region" aria-label="Share article">
      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider mr-1">
        {locale === 'ta' ? 'பகிர்:' : 'Share:'}
      </span>

      {shareLinks.map((s) => (
        <a
          key={s.name}
          href={s.href}
          target="_blank"
          rel="noopener noreferrer"
          className={`w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold text-xs flex items-center justify-center transition-colors hover:text-white ${s.color}`}
          aria-label={`Share on ${s.name}`}
        >
          {s.icon}
        </a>
      ))}

      <button
        type="button"
        onClick={handleCopy}
        className="px-2.5 py-1 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-xs font-medium text-gray-700 dark:text-gray-300 transition-colors"
        aria-label="Copy article link"
      >
        {copied ? (locale === 'ta' ? 'நகலெடுக்கப்பட்டது!' : 'Copied!') : (locale === 'ta' ? 'இணைப்பை நகலெடு' : 'Copy link')}
      </button>

      {typeof navigator !== 'undefined' && 'share' in navigator && (
        <button
          type="button"
          onClick={handleNativeShare}
          className="px-2.5 py-1 rounded-full bg-primary-50 dark:bg-primary-950 text-primary-600 dark:text-primary-400 hover:bg-primary-100 text-xs font-medium transition-colors"
        >
          {locale === 'ta' ? 'மேலும்...' : 'More...'}
        </button>
      )}
    </div>
  )
}
