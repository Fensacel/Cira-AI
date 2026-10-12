/** Judul sementara sebelum model membuatkan judul. Aman dipakai di client dan server. */
export const DEFAULT_CHAT_TITLE = 'Chat baru';

export const MAX_TITLE_CHARS = 60;
const MAX_CONTEXT_CHARS = 1500;

/** Prompt untuk model pembuat judul. Judul dibuat dari isi percakapan, bukan dipotong dari pertanyaan. */
export const TITLE_SYSTEM_PROMPT =
  'Kamu membuat judul singkat untuk sebuah percakapan. Balas hanya dengan judul 3 sampai 6 kata, ' +
  'dalam bahasa yang sama dengan percakapan. Tanpa tanda kutip, tanpa titik di akhir, tanpa penjelasan.';

export function buildTitlePrompt(userText: string, assistantText: string): string {
  return [
    'Percakapan:',
    `Pengguna: ${userText.slice(0, MAX_CONTEXT_CHARS)}`,
    `Asisten: ${assistantText.slice(0, MAX_CONTEXT_CHARS)}`,
    '',
    'Judul:',
  ].join('\n');
}

/** Membersihkan keluaran model. Mengembalikan null jika hasilnya kosong. */
export function sanitizeTitle(raw: string): string | null {
  const firstLine = raw.split(/\r?\n/).find((line) => line.trim().length > 0) ?? '';
  const cleaned = firstLine
    .trim()
    .replace(/^(judul|title)\s*:\s*/i, '')
    .replace(/^["'“”‘’`*#]+|["'“”‘’`*#]+$/g, '')
    .replace(/[.!?]+$/, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return null;
  return cleaned.length > MAX_TITLE_CHARS ? cleaned.slice(0, MAX_TITLE_CHARS).trimEnd() : cleaned;
}
