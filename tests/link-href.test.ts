import { describe, expect, it } from 'vitest';
import { resolveLinkHref } from '@/lib/citations';

describe('resolveLinkHref', () => {
  it('membiarkan URL absolut', () => {
    expect(resolveLinkHref('https://docs.midtrans.com/reference')).toBe('https://docs.midtrans.com/reference');
    expect(resolveLinkHref('mailto:a@b.co')).toBe('mailto:a@b.co');
  });

  it('menambah https pada domain tanpa skema', () => {
    expect(resolveLinkHref('docs.midtrans.com/en/payments')).toBe('https://docs.midtrans.com/en/payments');
  });

  it('menolak href relatif agar tidak mengarah ke localhost', () => {
    expect(resolveLinkHref('/docs/transaction-status')).toBeNull();
    expect(resolveLinkHref('docs/transaction-status')).toBeNull();
    expect(resolveLinkHref('#bagian')).toBeNull();
    expect(resolveLinkHref('')).toBeNull();
    expect(resolveLinkHref(undefined)).toBeNull();
  });
});
