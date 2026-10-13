import { tool } from 'ai';
import { z } from 'zod';
import { errorResult } from './shared';
import { safeFileBase } from './excel';
import { MAX_DOC_BLOCKS, MAX_SLIDES, docBlockSchema, slideSchema, writeDocx, writePptx } from './office';

export const createDocxTool = tool({
  description:
    'Buat dokumen Word (.docx) dari daftar blok: heading (level 1-3), paragraf, bullet, dan tabel. Gunakan untuk laporan, proposal, notulen, atau surat. Mengembalikan path file.',
  inputSchema: z.object({
    fileName: z.string().min(1).describe('Nama file tanpa ekstensi, contoh proposal-proyek-2026'),
    title: z.string().max(200).optional().describe('Judul dokumen di bagian atas'),
    blocks: z.array(docBlockSchema).min(1).max(MAX_DOC_BLOCKS).describe('Isi dokumen secara berurutan'),
  }),
  execute: async ({ fileName, title, blocks }) => {
    try {
      const filePath = await writeDocx(safeFileBase(fileName), title, blocks);
      return { success: true, filePath, blocks: blocks.length };
    } catch (err) {
      return errorResult(err);
    }
  },
});

export const createPptxTool = tool({
  description:
    'Buat presentasi PowerPoint (.pptx) 16:9. Setiap slide berisi judul dan poin (bullet). Gunakan untuk slide presentasi atau ringkasan visual. Mengembalikan path file.',
  inputSchema: z.object({
    fileName: z.string().min(1).describe('Nama file tanpa ekstensi, contoh presentasi-strategi-2026'),
    slides: z.array(slideSchema).min(1).max(MAX_SLIDES).describe('Daftar slide secara berurutan'),
  }),
  execute: async ({ fileName, slides }) => {
    try {
      const filePath = await writePptx(safeFileBase(fileName), slides);
      return { success: true, filePath, slides: slides.length };
    } catch (err) {
      return errorResult(err);
    }
  },
});

export const officeSkills = { createDocxTool, createPptxTool };
