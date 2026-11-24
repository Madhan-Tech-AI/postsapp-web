import 'server-only'

import { createSupabaseAdminClient } from '@/lib/supabase/admin'
import type { AuditAction } from '@/lib/database.types'

export interface AuditLogItem {
  id: string
  action: AuditAction
  actor_id: string | null
  actor_name?: string
  actor_email?: string
  target_type: string | null
  target_id: string | null
  metadata: any
  created_at: string
}

export interface AuditLogFilters {
  action?: AuditAction | 'all'
  targetType?: string
  page?: number
  limit?: number
}

/**
 * Fetch audit logs with actor enrichment.
 * Only SuperAdmin and Editor roles are authorized.
 */
export async function getAuditLogs({
  action,
  targetType,
  page = 1,
  limit = 25,
}: AuditLogFilters): Promise<{ logs: AuditLogItem[]; totalCount: number }> {
  const adminClient = createSupabaseAdminClient()
  const offset = (page - 1) * limit

  let query = adminClient
    .from('audit_logs')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (action && action !== 'all') {
    query = query.eq('action', action as AuditAction)
  }
  if (targetType && targetType !== 'all') {
    query = query.eq('target_type', targetType)
  }

  const { data, count } = await query.range(offset, offset + limit - 1)
  const logs = ((data || []) as unknown) as AuditLogItem[]

  // Enrich actor display names and emails
  const actorIds = Array.from(new Set(logs.map((l) => l.actor_id).filter(Boolean))) as string[]

  if (actorIds.length > 0) {
    const { data: profiles } = await adminClient
      .from('profiles')
      .select('id, display_name')
      .in('id', actorIds)

    const profileMap = new Map<string, string>()
    profiles?.forEach((p) => profileMap.set(p.id, p.display_name))

    logs.forEach((log) => {
      if (log.actor_id) {
        log.actor_name = profileMap.get(log.actor_id) || 'Unknown Actor'
      } else {
        log.actor_name = 'System / Trigger'
      }
    })
  }

  return {
    logs,
    totalCount: count || 0,
  }
}
