import React from 'react'
import Link from 'next/link'

interface BreakingNewsStripProps {
  enabled: boolean
  textEn: string
  textTa: string
  locale: string
}

export function BreakingNewsStrip({ enabled, textEn, textTa, locale }: BreakingNewsStripProps) {
  if (!enabled) return null

  const text = locale === 'ta' ? textTa || textEn : textEn || textTa
  if (!text) return null

  const label = locale === 'ta' ? 'முக்கிய செய்தி' : 'BREAKING'

  return (
    <div
      className="bg-primary-600 text-white text-xs md:text-sm py-2 px-4 shadow-sm"
      role="region"
      aria-label={label}
    >
      <div className="max-w-7xl mx-auto flex items-center space-x-3">
        <span className="bg-red-600 text-white font-black uppercase text-[10px] md:text-xs tracking-wider px-2 py-0.5 rounded animate-pulse shrink-0">
          {label}
        </span>
        <div className="overflow-hidden whitespace-nowrap text-white font-medium text-ellipsis">
          <span>{text}</span>
        </div>
      </div>
    </div>
  )
}
