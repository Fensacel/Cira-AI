import type { FileUIPart, UIMessage } from 'ai';

/**
 * Modul ini aman dipakai di browser maupun server. Jangan impor library Node di sini.
 * Ekstraksi teks dokumen ada di lib/document-extract.ts (server only).
 */

/** Ukuran file dokumen asli maksimal sebelum dibaca server. */
export const MAX_DOCUMENT_BYTES = 16 * 1024 * 1024;

export const MAX_DOCUMENTS_PER_MESSAGE = 10;

/** Batas karakter teks per dokumen. Lebih dari ini dipotong. */
export const MAX_DOCUMENT_CHARS = 40_000;

/** Batas panjang data URL yang membawa teks dokumen (teks di-encode ulang). */
export const MAX_DOCUMENT_URL_CHARS = 600_000;

export const DOCUMENT_EXTENSIONS = ['pdf', 'docx', 'pptx', 'xlsx', 'txt', 'md', 'csv', 'py', 'ipynb'] as const;

export const DOCUMENT_ACCEPT = DOCUMENT_EXTENSIONS.map((ext) => `.${ext}`).join(',');

/** Media type internal untuk part dokumen. Isinya teks hasil ekstraksi, bukan file biner. */
export const DOCUMENT_MEDIA_TYPE = 'text/plain';

const DOCUMENT_URL_PREFIX = 'data:text/plain;charset=utf-8,';

export type ExtractResult = {
  text: string;
  truncated: boolean;
};

export function getFileExtension(filename: string): string {
  const index = filename.lastIndexOf('.');
  return index < 0 ? '' : filename.slice(index + 1).toLowerCase();
}

export function isDocumentFilename(filename: string): boolean {
  return (DOCUMENT_EXTENSIONS as readonly string[]).includes(getFileExtension(filename));
}

export function isDocumentPart(part: UIMessage['parts'][number]): part is FileUIPart {
  return part.type === 'file' && part.mediaType === DOCUMENT_MEDIA_TYPE;
}

export function isAllowedDocumentUrl(url: string): boolean {
  return url.startsWith(DOCUMENT_URL_PREFIX) && url.length <= MAX_DOCUMENT_URL_CHARS;
}

/** Membungkus teks dokumen menjadi file part. Dipanggil di browser setelah ekstraksi. */
export function documentToPart(filename: string, text: string): FileUIPart {
  return {
    type: 'file',
    mediaType: DOCUMENT_MEDIA_TYPE,
    filename,
    url: DOCUMENT_URL_PREFIX + encodeURIComponent(text),
  };
}

/** Mengubah file part dokumen menjadi text part sebelum dikirim ke model. */
export function inlineDocumentParts(messages: UIMessage[]): UIMessage[] {
  return messages.map((message) => ({
    ...message,
    parts: message.parts.map((part): UIMessage['parts'][number] => {
      if (!isDocumentPart(part)) return part;
      const text = decodeURIComponent(part.url.slice(DOCUMENT_URL_PREFIX.length));
      return {
        type: 'text',
        text: `Isi dokumen "${part.filename ?? 'tanpa nama'}":\n\n${text}`,
      };
    }),
  }));
}

/** Dipanggil di browser. Mengunggah dokumen ke server dan mengembalikan file part berisi teksnya. */
export async function uploadDocument(file: File): Promise<FileUIPart> {
  if (file.size > MAX_DOCUMENT_BYTES) {
    throw new Error('Ukuran dokumen maksimal 16 MB.');
  }
  const form = new FormData();
  form.append('file', file);

  const response = await fetch('/api/extract', { method: 'POST', body: form });
  const data = (await response.json().catch(() => null)) as
    | (ExtractResult & { error?: never })
    | { error?: string }
    | null;
  if (!response.ok || !data || !('text' in data) || typeof data.text !== 'string') {
    const message = data && 'error' in data ? data.error : undefined;
    throw new Error(message ?? 'Gagal membaca dokumen.');
  }
  const text = data.truncated
    ? `${data.text}\n\n[Teks dipotong karena terlalu panjang.]`
    : data.text;
  return documentToPart(file.name, text);
}
