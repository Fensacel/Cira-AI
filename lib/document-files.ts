import { getFileExtension } from './document-parts';

/**
 * Cache File asli di browser untuk preview. Server hanya menerima teks hasil ekstraksi,
 * jadi file asli hanya ada selama halaman terbuka. Setelah reload, preview tidak tersedia.
 */
const MAX_CACHED_FILES = 20;
const PREVIEWABLE_EXTENSIONS = ['pdf', 'docx', 'pptx'] as const;

const cache = new Map<string, File>();

export function rememberDocumentFile(filename: string, file: File): void {
  cache.delete(filename);
  cache.set(filename, file);
  while (cache.size > MAX_CACHED_FILES) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

export function getDocumentFile(filename: string): File | undefined {
  return cache.get(filename);
}

export function canPreviewDocument(filename: string): boolean {
  return (PREVIEWABLE_EXTENSIONS as readonly string[]).includes(getFileExtension(filename));
}
