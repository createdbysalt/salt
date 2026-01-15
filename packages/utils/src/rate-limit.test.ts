import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  checkRateLimit,
  createRateLimitKey,
  getClientIp,
  RateLimitPresets,
} from './rate-limit'

describe('checkRateLimit', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('allows requests within the limit', () => {
    const config = { maxRequests: 3, windowSeconds: 60 }
    const key = `test-${Date.now()}`

    const result1 = checkRateLimit(key, config)
    expect(result1.allowed).toBe(true)
    expect(result1.remaining).toBe(2)

    const result2 = checkRateLimit(key, config)
    expect(result2.allowed).toBe(true)
    expect(result2.remaining).toBe(1)

    const result3 = checkRateLimit(key, config)
    expect(result3.allowed).toBe(true)
    expect(result3.remaining).toBe(0)
  })

  it('blocks requests exceeding the limit', () => {
    const config = { maxRequests: 2, windowSeconds: 60 }
    const key = `test-block-${Date.now()}`

    checkRateLimit(key, config) // 1
    checkRateLimit(key, config) // 2

    const result = checkRateLimit(key, config) // 3 - exceeds limit
    expect(result.allowed).toBe(false)
    expect(result.remaining).toBe(0)
  })

  it('resets after window expires', () => {
    const config = { maxRequests: 1, windowSeconds: 60 }
    const key = `test-reset-${Date.now()}`

    checkRateLimit(key, config) // use up the limit
    const blocked = checkRateLimit(key, config)
    expect(blocked.allowed).toBe(false)

    // Advance time past the window
    vi.advanceTimersByTime(61 * 1000)

    const result = checkRateLimit(key, config)
    expect(result.allowed).toBe(true)
    expect(result.remaining).toBe(0)
  })

  it('tracks different keys independently', () => {
    const config = { maxRequests: 1, windowSeconds: 60 }

    const key1 = `user1-${Date.now()}`
    const key2 = `user2-${Date.now()}`

    checkRateLimit(key1, config)
    const result1 = checkRateLimit(key1, config)
    expect(result1.allowed).toBe(false)

    const result2 = checkRateLimit(key2, config)
    expect(result2.allowed).toBe(true)
  })
})

describe('createRateLimitKey', () => {
  it('creates a key with prefix and single identifier', () => {
    expect(createRateLimitKey('api', '192.168.1.1')).toBe('api:192.168.1.1')
  })

  it('creates a key with prefix and multiple identifiers', () => {
    expect(createRateLimitKey('user', 'user_123', 'action_login')).toBe(
      'user:user_123:action_login'
    )
  })

  it('handles empty identifiers', () => {
    expect(createRateLimitKey('test')).toBe('test:')
  })
})

describe('getClientIp', () => {
  it('extracts IP from x-forwarded-for header', () => {
    const request = new Request('https://example.com', {
      headers: { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' },
    })
    expect(getClientIp(request)).toBe('192.168.1.1')
  })

  it('extracts IP from x-real-ip header', () => {
    const request = new Request('https://example.com', {
      headers: { 'x-real-ip': '192.168.1.2' },
    })
    expect(getClientIp(request)).toBe('192.168.1.2')
  })

  it('extracts IP from cf-connecting-ip header', () => {
    const request = new Request('https://example.com', {
      headers: { 'cf-connecting-ip': '192.168.1.3' },
    })
    expect(getClientIp(request)).toBe('192.168.1.3')
  })

  it('returns unknown when no IP headers present', () => {
    const request = new Request('https://example.com')
    expect(getClientIp(request)).toBe('unknown')
  })

  it('prioritizes x-forwarded-for over other headers', () => {
    const request = new Request('https://example.com', {
      headers: {
        'x-forwarded-for': '1.1.1.1',
        'x-real-ip': '2.2.2.2',
        'cf-connecting-ip': '3.3.3.3',
      },
    })
    expect(getClientIp(request)).toBe('1.1.1.1')
  })
})

describe('RateLimitPresets', () => {
  it('has correct STRICT preset', () => {
    expect(RateLimitPresets.STRICT).toEqual({
      maxRequests: 10,
      windowSeconds: 60,
    })
  })

  it('has correct MODERATE preset', () => {
    expect(RateLimitPresets.MODERATE).toEqual({
      maxRequests: 60,
      windowSeconds: 60,
    })
  })

  it('has correct LENIENT preset', () => {
    expect(RateLimitPresets.LENIENT).toEqual({
      maxRequests: 300,
      windowSeconds: 60,
    })
  })

  it('has correct WEBHOOK preset', () => {
    expect(RateLimitPresets.WEBHOOK).toEqual({
      maxRequests: 1000,
      windowSeconds: 60,
    })
  })
})
