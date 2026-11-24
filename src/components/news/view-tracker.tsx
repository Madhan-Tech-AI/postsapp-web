'use client'

import { useEffect } from 'react'

interface ViewTrackerProps {
  articleId: string
}

/**
 * Client-side View Tracking Beacon
 *
 * Implements Architecture Principle 5 & Section 14 Phase 9:
 * - Never submits a client-side view count increment
 * - Delays beacon slightly (1.5s) to avoid recording instant bounces or prefetch requests
 * - Emits anonymous session beacon to POST /api/views
 */
export function ViewTracker({ articleId }: ViewTrackerProps) {
  useEffect(() => {
    // 1. Generate or retrieve session identifier from sessionStorage
    let sessionId: string | null = null
    try {
      sessionId = sessionStorage.getItem('postsapp_session_id')
      if (!sessionId) {
        sessionId = `sess_${Math.random().toString(36).slice(2)}_${Date.now()}`
        sessionStorage.setItem('postsapp_session_id', sessionId)
      }
    } catch {
      // Storage unavailable / private mode
    }

    // 2. Delay beacon to record genuine reading views
    const timer = setTimeout(() => {
      const payload = JSON.stringify({ articleId, sessionId })

      if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
        const blob = new Blob([payload], { type: 'application/json' })
        navigator.sendBeacon('/api/views', blob)
      } else {
        fetch('/api/views', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        }).catch(() => {
          // Non-blocking
        })
      }
    }, 1500)

    return () => clearTimeout(timer)
  }, [articleId])

  return null
}
