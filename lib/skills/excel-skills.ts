import { tool } from 'ai';
import { z } from 'zod';
import { errorResult } from './shared';
import {
  MAX_SHEETS,
  exportSheetSchema,
  safeFileBase,
  buildCsv,
  safeSheetName,
  writeWorkbook,
} from './excel';

export const exportExcelTool = tool({
  description:
    'Ekspor tabel ke file .xlsx dengan header tebal, baris beku, filter otomatis, dan format angka (rupiah, persen, tanggal). Baris 1 adalah header, data mulai baris 2. Sel berawalan "=" ditulis sebagai rumus Excel (contoh: "=SUM(C2:C6)", "=C2-D2", "=C7/B7"). Untuk total, saldo, selisih, persen, dan nilai turunan WAJIB pakai rumus, jangan angka hasil hitungan sendiri. Mengembalikan path file.',
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
    'Buat isi tabel sebagai CSV untuk ditampilkan di chat (tidak disimpan ke disk). Mengembalikan nama file dan isi CSV.',
  inputSchema: z.object({
    fileName: z.string().min(1).describe('Nama file tanpa ekstensi'),
    sheet: exportSheetSchema.describe('Tabel yang akan ditulis'),
  }),
  execute: async ({ fileName, sheet }) => {
    try {
      return {
        success: true,
        fileName: `${safeFileBase(fileName)}.csv`,
        csv: buildCsv(sheet),
        rows: sheet.rows.length,
      };
    } catch (err) {
      return errorResult(err);
    }
  },
});

export const excelSkills = { exportExcelTool, exportCsvTool };

