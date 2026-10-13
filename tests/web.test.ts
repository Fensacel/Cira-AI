import { describe, expect, it } from 'vitest';
import { htmlToText, isBlockedAddress, normalizeUrl } from '@/lib/skills/web';

describe('normalizeUrl', () => {
  it('menambahkan https ke URL tanpa skema', () => {
    expect(normalizeUrl('docs.midtrans.com/api').toString()).toBe('https://docs.midtrans.com/api');
  });

  it('menolak skema selain http dan https', () => {
    expect(() => normalizeUrl('file:///etc/passwd')).toThrow('Hanya URL http dan https');
    expect(() => normalizeUrl('ftp://example.com')).toThrow('Hanya URL http dan https');
  });

  it('menolak URL dengan kredensial', () => {
    expect(() => normalizeUrl('https://user:pass@example.com')).toThrow('kredensial');
  });

  it('menolak input kosong', () => {
    expect(() => normalizeUrl('   ')).toThrow('URL kosong');
  });
});

describe('isBlockedAddress', () => {
  it.each([
    '127.0.0.1',
    '10.1.2.3',
    '172.16.0.1',
    '172.31.255.255',
    '192.168.1.10',
    '169.254.169.254',
    '100.64.0.1',
    '0.0.0.0',
    '224.0.0.1',
    '::1',
    '::',
    'fc00::1',
    'fe80::1',
    '::ffff:127.0.0.1',
    '::ffff:169.254.169.254',
  ])('memblokir %s', (address) => {
    expect(isBlockedAddress(address)).toBe(true);
  });

  it.each(['8.8.8.8', '1.1.1.1', '172.32.0.1', '2606:4700:4700::1111'])('mengizinkan %s', (address) => {
    expect(isBlockedAddress(address)).toBe(false);
  });

  it('menolak string yang bukan IP', () => {
    expect(isBlockedAddress('example.com')).toBe(true);
  });
});

describe('htmlToText', () => {
  it('mengambil judul dan teks, membuang script dan style', () => {
    const html = `<html><head><title>Judul &amp; Tes</title><style>p{color:red}</style></head>
      <body><script>alert(1)</script><h1>Halo</h1><p>Isi <b>tebal</b> &lt;ok&gt;</p></body></html>`;
    const result = htmlToText(html);
    expect(result.title).toBe('Judul & Tes');
    expect(result.text).toBe('Halo\nIsi tebal <ok>');
  });
});
