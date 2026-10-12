import { describe, expect, it } from 'vitest';
import type { UIMessage } from 'ai';
import {
  MAX_IMAGES_PER_MESSAGE,
  MAX_IMAGES_PER_REQUEST,
  isAllowedImageDataUrl,
  validateAttachments,
} from '@/lib/attachments';

const PNG_URL = 'data:image/png;base64,iVBORw0KGgo=';

function userMessage(id: string, imageCount: number, url = PNG_URL): UIMessage {
  return {
    id,
    role: 'user',
    parts: [
      { type: 'text', text: 'lihat gambar' },
      ...Array.from({ length: imageCount }, () => ({
        type: 'file' as const,
        mediaType: 'image/png',
        url,
      })),
    ],
  };
}

describe('isAllowedImageDataUrl', () => {
  it('menerima data URL gambar base64', () => {
    expect(isAllowedImageDataUrl(PNG_URL)).toBe(true);
  });

  it('menolak URL biasa dan tipe non-gambar', () => {
    expect(isAllowedImageDataUrl('https://example.com/a.png')).toBe(false);
    expect(isAllowedImageDataUrl('data:text/html;base64,PGgxPg==')).toBe(false);
  });

  it('menolak data URL yang terlalu besar', () => {
    const huge = `data:image/png;base64,${'A'.repeat(2_000_001)}`;
    expect(isAllowedImageDataUrl(huge)).toBe(false);
  });
});

describe('validateAttachments', () => {
  it('menerima pesan tanpa lampiran', () => {
    expect(validateAttachments([userMessage('1', 0)])).toBeNull();
  });

  it('menolak lampiran dengan URL tidak valid', () => {
    const error = validateAttachments([userMessage('1', 1, 'https://example.com/a.png')]);
    expect(error).not.toBeNull();
  });

  it('menolak lebih dari batas per pesan', () => {
    const error = validateAttachments([userMessage('1', MAX_IMAGES_PER_MESSAGE + 1)]);
    expect(error).toContain(String(MAX_IMAGES_PER_MESSAGE));
  });

  it('menolak lebih dari batas per request termasuk riwayat', () => {
    const messages = [
      userMessage('1', MAX_IMAGES_PER_MESSAGE),
      userMessage('2', MAX_IMAGES_PER_MESSAGE),
      userMessage('3', MAX_IMAGES_PER_REQUEST - 2 * MAX_IMAGES_PER_MESSAGE + 1),
    ];
    expect(validateAttachments(messages)).toContain(String(MAX_IMAGES_PER_REQUEST));
  });
});
