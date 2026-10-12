/** Helper sumber inline. Client-safe, tanpa dependensi server. */

export const CITE_PREFIX = 'cite:';

/** Satu atau lebih penanda berurutan, mis. [[UU HPP No. 7/2021]] [[PMK 168/2023]]. */
const CITE_GROUP = /\[\[[^[\]\n]+\]\](?:\s*\[\[[^[\]\n]+\]\])*/g;
const CITE_NAME = /\[\[([^[\]\n]+)\]\]/g;

/**
 * Ubah penanda [[Nama Sumber]] menjadi link Markdown dengan skema `cite:`.
 * Daftar nama dikodekan di href agar komponen link bisa merendernya sebagai chip.
 */
export function linkCitations(content: string): string {
  // Blok kode dan kode inline dilewati agar mis. arr[[1]] tidak berubah menjadi link.
  return content
    .split(/(```[\s\S]*?```|`[^`\n]*`)/)
    .map((part, index) => (index % 2 === 1 ? part : replaceCitationGroups(part)))
    .join('');
}

function replaceCitationGroups(text: string): string {
  return text.replace(CITE_GROUP, (group) => {
    const names = [...new Set([...group.matchAll(CITE_NAME)].map((match) => match[1].trim()).filter(Boolean))];
    if (names.length === 0) return group;
    return `[${names[0]}](${CITE_PREFIX}${encodeURIComponent(JSON.stringify(names))})`;
  });
}

/** Ambil daftar nama sumber dari href `cite:`. Href tidak valid menghasilkan daftar kosong. */
export function parseCitationHref(href: string): string[] {
  if (!href.startsWith(CITE_PREFIX)) return [];
  try {
    const parsed: unknown = JSON.parse(decodeURIComponent(href.slice(CITE_PREFIX.length)));
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * Pastikan href link dari model mengarah ke situs eksternal.
 * Href tanpa skema seperti `docs.midtrans.com/...` diberi `https://`.
 * Href relatif (mis. `/docs`) atau tidak dikenali mengembalikan null: tampilkan sebagai teks biasa,
 * sehingga tidak membuka localhost.
 */
export function resolveLinkHref(href: string | undefined): string | null {
  const value = href?.trim() ?? '';
  if (!value) return null;
  if (/^(https?:\/\/|mailto:)/i.test(value)) return value;
  if (/^[a-z0-9-]+(\.[a-z0-9-]+)+(\/|\?|#|$)/i.test(value)) return `https://${value}`;
  return null;
}

