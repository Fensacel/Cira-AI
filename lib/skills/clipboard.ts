import { tool } from 'ai';
import { z } from 'zod';
import { errorResult } from './shared';

const MAX_COPY_CHARS = 200_000;

/**
 * Server tidak punya akses clipboard. Tool ini hanya menyiapkan teks.
 * UI membaca action 'copy_to_clipboard' lalu memanggil copyText() dari clipboard-client.ts.
 * Di Electron, copyText() diganti clipboard.writeText() di proses utama lewat IPC.
 */
export const copyToClipboardTool = tool({
  description:
    'Siapkan teks agar pengguna bisa menyalinnya ke clipboard dengan satu klik. Gunakan untuk kode, perintah, atau hasil yang ingin disalin.',
  inputSchema: z.object({
    text: z.string().min(1).max(MAX_COPY_CHARS).describe('Teks yang akan disalin'),
    label: z.string().max(60).optional().describe('Label singkat, contoh "Kode Python"'),
  }),
  execute: async ({ text, label }) => {
    try {
      return { success: true, action: 'copy_to_clipboard', text, label: label ?? null, chars: text.length };
    } catch (err) {
      return errorResult(err);
    }
  },
});

export const clipboardSkills = { copyToClipboardTool };
