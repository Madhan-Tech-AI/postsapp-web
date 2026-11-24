'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toggleLikeAction } from '../actions'

interface LikeButtonProps {
  articleId: string
  initialLiked: boolean
  initialCount: number
  locale: string
  slug: string
  isAuthenticated: boolean
}

export function LikeButton({
  articleId,
  initialLiked,
  initialCount,
  locale,
  slug,
  isAuthenticated,
}: LikeButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [liked, setLiked] = useState(initialLiked)
  const [count, setCount] = useState(initialCount)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const isTa = locale === 'ta'

  function handleClick() {
    // 1. If anonymous reader, redirect to login with next path and reason parameter
    if (!isAuthenticated) {
      const returnUrl = `/${locale}/article/${slug}`
      router.push(`/${locale}/auth/login?next=${encodeURIComponent(returnUrl)}&reason=like`)
      return
    }

    // 2. Optimistic UI update
    const nextLiked = !liked
    const nextCount = nextLiked ? count + 1 : Math.max(0, count - 1)

    setLiked(nextLiked)
    setCount(nextCount)
    setErrorMsg(null)

    // 3. Trigger server action with rollback on failure
    startTransition(async () => {
      const returnPath = `/${locale}/article/${slug}`
      const result = await toggleLikeAction(articleId, returnPath)

      if (!result.success) {
        // Rollback
        setLiked(!nextLiked)
        setCount(count)
        if (result.error === 'UNAUTHENTICATED') {
          router.push(`/${locale}/auth/login?next=${encodeURIComponent(returnPath)}&reason=like`)
        } else {
          setErrorMsg(
            isTa
              ? 'பிழை ஏற்பட்டது. மீண்டும் முயற்சிக்கவும்.'
              : 'Could not update like. Please try again.'
          )
        }
      } else {
        // Sync with authoritative server count
        setLiked(result.liked)
        setCount(result.likeCount)
      }
    })
  }

  const label = liked
    ? isTa
      ? 'விருப்பத்தை நீக்கு'
      : 'Unlike article'
    : isTa
    ? 'கட்டுரையை விரும்பு'
    : 'Like article'

  return (
    <div className="flex flex-col items-start">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full border text-sm font-semibold transition-all ${
          liked
            ? 'bg-red-50 dark:bg-red-950/60 border-red-300 dark:border-red-800 text-red-600 dark:text-red-400'
            : 'border-gray-200 dark:border-gray-700 hover:border-red-400 hover:text-red-500 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800'
        } ${isPending ? 'opacity-75' : ''}`}
        aria-label={label}
        aria-pressed={liked}
      >
        <span
          className={`text-base transition-transform duration-150 ${
            liked ? 'scale-110' : 'group-hover:scale-110'
          }`}
        >
          {liked ? '❤️' : '🤍'}
        </span>
        <span className="font-bold">{count}</span>
        <span className="text-xs font-normal text-gray-500">
          {isTa ? 'விருப்பங்கள்' : 'Likes'}
        </span>
      </button>

      {errorMsg && (
        <span className="text-xs text-red-500 mt-1" role="alert">
          {errorMsg}
        </span>
      )}
    </div>
  )
}
