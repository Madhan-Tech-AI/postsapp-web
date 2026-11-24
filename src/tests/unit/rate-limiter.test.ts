import { describe, it, expect, beforeEach } from 'vitest'
import { checkRateLimit, _resetMemoryRateLimit, getClientIp } from '@/lib/rate-limiter'

describe('checkRateLimit', () => {
  beforeEach(() => {
    _resetMemoryRateLimit()
  })

  it('allows requests within limit', async () => {
    const res1 = await checkRateLimit('test-key', 3, 60)
    expect(res1.success).toBe(true)
    expect(res1.remaining).toBe(2)

    const res2 = await checkRateLimit('test-key', 3, 60)
    expect(res2.success).toBe(true)
    expect(res2.remaining).toBe(1)
  })

  it('blocks requests exceeding limit', async () => {
    await checkRateLimit('block-key', 2, 60)
    await checkRateLimit('block-key', 2, 60)

    const res3 = await checkRateLimit('block-key', 2, 60)
    expect(res3.success).toBe(false)
    expect(res3.remaining).toBe(0)
  })

  it('differentiates between distinct keys', async () => {
    await checkRateLimit('user-1', 1, 60)
    const user1Blocked = await checkRateLimit('user-1', 1, 60)
    expect(user1Blocked.success).toBe(false)

    const user2Allowed = await checkRateLimit('user-2', 1, 60)
    expect(user2Allowed.success).toBe(true)
  })
})

describe('getClientIp', () => {
  it('extracts IP from x-forwarded-for first entry', () => {
    const headers = new Headers({
      'x-forwarded-for': '203.0.113.195, 70.41.3.18, 150.172.238.178',
    })
    expect(getClientIp(headers)).toBe('203.0.113.195')
  })

  it('extracts IP from x-real-ip', () => {
    const headers = new Headers({
      'x-real-ip': '198.51.100.1',
    })
    expect(getClientIp(headers)).toBe('198.51.100.1')
  })

  it('falls back to 127.0.0.1 when no header is present', () => {
    const headers = new Headers()
    expect(getClientIp(headers)).toBe('127.0.0.1')
  })
})
