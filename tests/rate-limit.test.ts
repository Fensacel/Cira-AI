import { describe, expect, it } from 'vitest';
import { checkRateLimit } from '@/lib/rate-limit';

describe('checkRateLimit', () => {
  it('mengizinkan request sampai batas lalu menolak', () => {
    const key = 'test-allow-' + Math.random();
    const now = 1_000_000;
    expect(checkRateLimit(key, 2, 60_000, now).ok).toBe(true);
    expect(checkRateLimit(key, 2, 60_000, now).ok).toBe(true);
    const blocked = checkRateLimit(key, 2, 60_000, now);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterSec).toBe(60);
  });

  it('mereset window setelah waktu habis', () => {
    const key = 'test-reset-' + Math.random();
    const now = 2_000_000;
    checkRateLimit(key, 1, 1_000, now);
    expect(checkRateLimit(key, 1, 1_000, now).ok).toBe(false);
    expect(checkRateLimit(key, 1, 1_000, now + 1_001).ok).toBe(true);
  });
});
