import type { FileUIPart, UIMessage } from 'ai';
import { MAX_DOCUMENTS_PER_MESSAGE, isAllowedDocumentUrl, isDocumentPart } from './document-parts';

/** Format yang diterima dari perangkat pengguna. */
export const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'] as const;

/** Ukuran file asli maksimal sebelum diperkecil di browser. */
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

/** Sisi terpanjang gambar setelah diperkecil. */
export const MAX_IMAGE_SIDE_PX = 1600;

export const JPEG_QUALITY = 0.85;

/** Batas panjang data URL per gambar (sekitar 1.5 MB biner). */
export const MAX_IMAGE_DATA_URL_CHARS = 2_000_000;

export const MAX_IMAGES_PER_MESSAGE = 4;

/** Total gambar per request, termasuk riwayat, karena seluruh riwayat dikirim ulang. */
export const MAX_IMAGES_PER_REQUEST = 6;

const IMAGE_DATA_URL = /^data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+=*$/;

export function isAllowedImageDataUrl(url: string): boolean {
  return url.length <= MAX_IMAGE_DATA_URL_CHARS && IMAGE_DATA_URL.test(url);
}

/** Mengembalikan pesan error untuk pelanggaran, atau null jika valid. */
export function validateAttachments(messages: UIMessage[]): string | null {
  let total = 0;
  for (const message of messages) {
    const files = message.parts.filter(
      (part): part is FileUIPart => part.type === 'file' && !isDocumentPart(part),
    );
    if (files.length > MAX_IMAGES_PER_MESSAGE) {
      return `Maksimal ${MAX_IMAGES_PER_MESSAGE} gambar per pesan.`;
    }
    for (const file of files) {
      if (!isAllowedImageDataUrl(file.url)) {
        return 'Lampiran harus berupa gambar PNG, JPEG, WebP, atau GIF yang valid.';
      }
    }
    const documents = message.parts.filter(isDocumentPart);
    if (documents.length > MAX_DOCUMENTS_PER_MESSAGE) {
      return `Maksimal ${MAX_DOCUMENTS_PER_MESSAGE} dokumen per pesan.`;
    }
    for (const document of documents) {
      if (!isAllowedDocumentUrl(document.url)) {
        return 'Dokumen tidak valid atau terlalu panjang.';
      }
    }
    total += files.length;
  }
  if (total > MAX_IMAGES_PER_REQUEST) {
    return `Maksimal ${MAX_IMAGES_PER_REQUEST} gambar per percakapan.`;
  }
  return null;
}

/** Dipanggil di browser. Membaca file, memperkecil, dan mengembalikan part gambar JPEG. */
export async function imageFileToPart(file: File): Promise<FileUIPart> {
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    throw new Error('Format gambar harus PNG, JPEG, WebP, atau GIF.');
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error('Ukuran gambar maksimal 10 MB.');
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_IMAGE_SIDE_PX / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));

  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    throw new Error('Browser tidak mendukung pemrosesan gambar.');
  }
  // Latar putih agar PNG transparan tidak menjadi hitam saat dikonversi ke JPEG.
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  const url = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  if (!isAllowedImageDataUrl(url)) {
    throw new Error('Gambar masih terlalu besar setelah diperkecil. Pilih gambar lain.');
  }
  return { type: 'file', mediaType: 'image/jpeg', filename: file.name, url };
}
