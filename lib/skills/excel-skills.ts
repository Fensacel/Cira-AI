import { tool } from 'ai';
import { z } from 'zod';
import { errorResult } from './shared';
import {
  MAX_SHEETS,
  exportSheetSchema,
  safeFileBase,
  safeSheetName,
  writeCsv,
  writeWorkbook,
} from './excel';

export const exportExcelTool = tool({
  description:
    'Ekspor tabel ke file .xlsx dengan header tebal, baris beku, filter otomatis, dan format angka (rupiah, persen, tanggal). Sel berawalan "=" ditulis sebagai rumus Excel. Mengembalikan path file.',
  inputSchema: z.object({
    fileName: z.string().min(1).describe('Nama file tanpa ekstensi, contoh laporan-keuangan-2026'),
    sheets: z.array(exportSheetSchema).min(1).max(MAX_SHEETS).describe('Daftar sheet'),
  }),
  execute: async ({ fileName, sheets }) => {
    try {
      const filePath = await writeWorkbook(safeFileBase(fileName), sheets);
      return {
        success: true,
        filePath,
        sheets: sheets.map((sheet) => ({ name: safeSheetName(sheet.name), rows: sheet.rows.length })),
      };
    } catch (err) {
      return errorResult(err);
    }
  },
});

export const exportCsvTool = tool({
  description:
    'Ekspor satu tabel ke file .csv (UTF-8 dengan BOM agar Excel membaca karakter Indonesia). Mengembalikan path file.',
  inputSchema: z.object({
    fileName: z.string().min(1).describe('Nama file tanpa ekstensi'),
    sheet: exportSheetSchema.describe('Tabel yang akan ditulis'),
  }),
  execute: async ({ fileName, sheet }) => {
    try {
      const filePath = await writeCsv(safeFileBase(fileName), sheet);
      return { success: true, filePath, rows: sheet.rows.length };
    } catch (err) {
      return errorResult(err);
    }
  },
});

export const excelSkills = { exportExcelTool, exportCsvTool };
