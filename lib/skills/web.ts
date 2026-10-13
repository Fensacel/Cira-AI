import { tool } from 'ai';
import { z } from 'zod';
import { lookup } from 'dns/promises';
import net from 'net';
import { errorResult } from './shared';

const FETCH_TIMEOUT_MS = 10_000;
const MAX_FETCH_BYTES = 1_000_000;
const MAX_TEXT_CHARS = 20_000;
const MAX_REDIRECTS = 3;

const TEXT_CONTENT_TYPES = [
  'text/html',
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/json',
  'application/xml',
  'text/xml',
];

const HTML_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

/**
 * Menerima URL lengkap atau tanpa skema (mis. `example.com`, diberi https://).
 * Hanya http dan https, dan URL dengan kredensial ditolak.
 */
export function normalizeUrl(input: string): URL {
  const trimmed = input.trim();
  if (!trimmed) throw new Error('URL kosong.');
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    throw new Error('URL tidak valid.');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Hanya URL http dan https yang didukung.');
  }
  if (url.username || url.password) throw new Error('URL dengan kredensial ditolak.');
  return url;
}

/**
 * True jika alamat termasuk internal: loopback, privat, link-local (termasuk metadata cloud 169.254.169.254),
 * CGNAT, multicast, dan alamat yang tidak dikenali.
 */
export function isBlockedAddress(address: string): boolean {
  const version = net.isIP(address);

  if (version === 4) {
    const [a, b] = address.split('.').map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 168 || b === 0)) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }

  if (version === 6) {
    const lower = address.toLowerCase();
    if (lower === '::' || lower === '::1') return true;
    if (lower.startsWith('::ffff:')) return isBlockedAddress(lower.slice('::ffff:'.length));
    return /^f[cd]/.test(lower) || /^fe[89ab]/.test(lower) || lower.startsWith('ff');
  }

  return true;
}

async function assertPublicHost(hostname: string): Promise<void> {
  const host = hostname.replace(/^\[|\]$/g, '');
  if (net.isIP(host)) {
    if (isBlockedAddress(host)) throw new Error('Alamat internal ditolak.');
    return;
  }
  if (host === 'localhost' || host.endsWith('.localhost')) throw new Error('Alamat internal ditolak.');

  const records = await lookup(host, { all: true, verbatim: true });
  if (records.length === 0) throw new Error('Host tidak ditemukan.');
  if (records.some((record) => isBlockedAddress(record.address))) {
    throw new Error('Host mengarah ke alamat internal dan ditolak.');
  }
}

async function readLimited(res: Response): Promise<{ text: string; truncated: boolean }> {
  const reader = res.body?.getReader();
  if (!reader) return { text: '', truncated: false };

  const chunks: Uint8Array[] = [];
  let total = 0;
  let truncated = false;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (total + value.byteLength > MAX_FETCH_BYTES) {
      chunks.push(value.subarray(0, MAX_FETCH_BYTES - total));
      truncated = true;
      await reader.cancel();
      break;
    }
    chunks.push(value);
    total += value.byteLength;
  }
  return { text: new TextDecoder('utf-8').decode(Buffer.concat(chunks)), truncated };
}

interface FetchedPage {
  finalUrl: string;
  contentType: string;
  body: string;
  truncated: boolean;
}

/** Mengambil halaman dengan redirect ditangani manual, sehingga setiap tujuan dicek ulang. */
async function fetchPublicPage(start: URL): Promise<FetchedPage> {
  let current = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicHost(current.hostname);

    const res = await fetch(current, {
      redirect: 'manual',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        'User-Agent': 'CiraAI/1.0 (+fetch-url)',
        Accept: 'text/html,text/plain,application/json;q=0.9,*/*;q=0.5',
      },
    });

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get('location');
      await res.body?.cancel();
      if (!location) throw new Error('Redirect tanpa lokasi tujuan.');
      current = normalizeUrl(new URL(location, current).toString());
      continue;
    }

    if (!res.ok) {
      await res.body?.cancel();
      throw new Error(`Server membalas HTTP ${res.status}.`);
    }

    const contentType = (res.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
    if (!TEXT_CONTENT_TYPES.includes(contentType)) {
      await res.body?.cancel();
      throw new Error(`Jenis konten tidak didukung: ${contentType || 'tidak diketahui'}.`);
    }

    const { text, truncated } = await readLimited(res);
    return { finalUrl: current.toString(), contentType, body: text, truncated };
  }
  throw new Error('Terlalu banyak redirect.');
}

function decodeHtmlEntities(value: string): string {
  return value.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (match, code: string) => {
    if (code.startsWith('#x')) return String.fromCodePoint(parseInt(code.slice(2), 16));
    if (code.startsWith('#')) return String.fromCodePoint(parseInt(code.slice(1), 10));
    return HTML_ENTITIES[code] ?? match;
  });
}

/** Mengambil judul dan teks utama dari HTML. Script, style, head, dan tag dibuang. */
export function htmlToText(html: string): { title: string; text: string } {
  const title = decodeHtmlEntities(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? '').trim();
  const text = decodeHtmlEntities(
    html
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<(script|style|noscript|svg|head)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<\/(p|div|li|h[1-6]|tr|section|article)>|<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  )
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
  return { title, text };
}

export const fetchUrlTool = tool({
  description:
    'Ambil isi halaman web dari URL publik (http/https) dan kembalikan teksnya. Gunakan bila pengguna memberi tautan atau meminta isi sebuah halaman. Alamat internal dan localhost ditolak.',
  inputSchema: z.object({
    url: z.string().min(1).max(2000).describe('URL lengkap, contoh https://example.com/artikel'),
  }),
  execute: async ({ url }) => {
    try {
      const page = await fetchPublicPage(normalizeUrl(url));
      const isHtml = page.contentType === 'text/html';
      const extracted = isHtml ? htmlToText(page.body) : { title: '', text: page.body.trim() };
      const truncatedText = extracted.text.length > MAX_TEXT_CHARS;

      return {
        success: true,
        url: page.finalUrl,
        title: extracted.title,
        content: truncatedText ? extracted.text.slice(0, MAX_TEXT_CHARS) : extracted.text,
        truncated: page.truncated || truncatedText,
      };
    } catch (err) {
      return errorResult(err);
    }
  },
});

export const webSkills = { fetchUrlTool };
