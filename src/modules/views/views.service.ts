import 'server-only'

import crypto from 'crypto'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import { isBot } from './bot-detector'

interface RecordViewParams {
  articleId: string
  ip?: string | null
  userAgent?: string | null
  sessionId?: string | null
}

interface RecordViewResult {
  recorded: boolean
  reason?: 'bot_ignored' | 'deduplicated' | 'invalid_article' | 'error'
  error?: string
}

/**
 * Generate a rotating daily salted hash for visitor privacy.
 * Raw IP and User-Agent are NEVER stored in PostgreSQL.
 * Formula: SHA-256(salt || date || ip || userAgent)
 */
export function generateVisitorHash(
  ip: string,
  userAgent: string,
  dateStr: string
): string {
  const secretSalt = process.env.VIEW_HASH_SALT || 'postsapp-default-secure-salt-v1'
  return crypto
    .createHash('sha256')
    .update(`${secretSalt}:${dateStr}:${ip}:${userAgent}`)
    .digest('hex')
}

/**
 * Server-side article view tracking.
 * Enforces:
 * - Bot filtering (crawlers ignored)
 * - Salted rotating hash (no raw IP storage)
 * - 24-hour deduplication window per article per visitor
 * - Database stored procedure `record_article_view`
 */
export async function recordArticleView({
  articleId,
  ip,
  userAgent,
  sessionId,
}: RecordViewParams): Promise<RecordViewResult> {
  // 1. Bot check
  if (isBot(userAgent)) {
    return { recorded: false, reason: 'bot_ignored' }
  }

  const clientIp = ip || '127.0.0.1'
  const clientUa = userAgent || 'unknown'
  const today = new Date().toISOString().slice(0, 10) // YYYY-MM-DD

  // 2. Compute salted visitor hash
  const visitorHash = generateVisitorHash(clientIp, clientUa, today)

  // 3. Composite dedup key: article_id + date + visitor_hash
  const dedupWindowKey = `${articleId}_${today}_${visitorHash}`

  // 4. Call SECURITY DEFINER stored procedure via admin client
  const adminClient = createSupabaseAdminClient()
  const { error } = await adminClient.rpc('record_article_view', {
    p_article_id: articleId,
    p_visitor_hash: visitorHash,
    p_session_id: sessionId || null,
    p_dedup_window_key: dedupWindowKey,
  })

  if (error) {
    return { recorded: false, reason: 'error', error: error.message }
  }

  return { recorded: true }
}
