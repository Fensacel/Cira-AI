import ExcelJS from 'exceljs';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { z } from 'zod';

export const EXPORT_DIR = path.resolve(process.env.AIGWEH_EXPORT_DIR ?? path.join(process.cwd(), 'exports'));
export const MAX_SHEETS = 10;
export const MAX_ROWS_PER_SHEET = 50_000;

const NUMBER_FORMATS = {
  text: '@',
  integer: '#,##0',
  decimal: '#,##0.00',
  idr: '"Rp" #,##0;[Red]-"Rp" #,##0',
  percent: '0.00%',
  date: 'dd/mm/yyyy',
} as const;

export const columnSchema = z.object({
  header: z.string().min(1).describe('Judul kolom'),
  key: z.string().min(1).describe('Nama field di setiap baris'),
  width: z.number().min(6).max(80).optional().describe('Lebar kolom dalam karakter'),
  numFmt: z.enum(['text', 'integer', 'decimal', 'idr', 'percent', 'date']).optional().describe('Format angka'),
});

export const cellSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

export const exportSheetSchema = z.object({
  name: z.string().min(1).max(31).describe('Nama sheet, maksimal 31 karakter'),
  columns: z.array(columnSchema).min(1).max(50),
  rows: z.array(z.record(z.string(), cellSchema)).max(MAX_ROWS_PER_SHEET),
});

export type ExportSheet = z.infer<typeof exportSheetSchema>;
type CellValue = string | number | boolean | null;

/** Nama file aman: huruf, angka, spasi, tanda hubung, garis bawah. */
export function safeFileBase(name: string): string {
  const cleaned = name.replace(/[^a-zA-Z0-9 _-]/g, '_').trim().slice(0, 80);
  return cleaned || 'export';
}

/** Nama sheet Excel tidak boleh berisi : \ / ? * [ ] */
export function safeSheetName(name: string): string {
  return name.replace(/[:\\/?*[\]]/g, ' ').slice(0, 31).trim() || 'Sheet';
}

/** Sel berawalan '=' ditulis sebagai rumus. Excel menghitung nilainya saat file dibuka. */
function toCellValue(value: CellValue): ExcelJS.CellValue {
  if (typeof value === 'string' && value.startsWith('=')) return { formula: value.slice(1) };
  return value;
}

export async function writeWorkbook(fileName: string, sheets: ExportSheet[]): Promise<string> {
  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date();

  for (const sheetDef of sheets) {
    const sheet = workbook.addWorksheet(safeSheetName(sheetDef.name));
    sheet.columns = sheetDef.columns.map((column) => ({
      header: column.header,
      key: column.key,
      width: column.width ?? Math.max(12, column.header.length + 4),
      style: column.numFmt ? { numFmt: NUMBER_FORMATS[column.numFmt] } : {},
    }));

    const header = sheet.getRow(1);
    header.font = { bold: true };
    header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE7E9EE' } };
    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    for (const row of sheetDef.rows) {
      const values: Record<string, ExcelJS.CellValue> = {};
      for (const column of sheetDef.columns) {
        values[column.key] = toCellValue(row[column.key] ?? null);
      }
      sheet.addRow(values);
    }

    if (sheetDef.rows.length > 0) {
      sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: sheetDef.columns.length } };
    }
  }

  await mkdir(EXPORT_DIR, { recursive: true });
  const filePath = path.join(EXPORT_DIR, `${fileName}.xlsx`);
  await workbook.xlsx.writeFile(filePath);
  return filePath;
}

/** CSV dengan BOM UTF-8 agar Excel membaca karakter Indonesia dengan benar. Rumus tidak diubah, ditulis sebagai teks. */
export async function writeCsv(fileName: string, sheet: ExportSheet): Promise<string> {
  const escape = (value: CellValue) => {
    if (value === null) return '';
    const text = String(value);
    return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const lines = [sheet.columns.map((column) => escape(column.header)).join(',')];
  for (const row of sheet.rows) {
    lines.push(sheet.columns.map((column) => escape(row[column.key] ?? null)).join(','));
  }
  await mkdir(EXPORT_DIR, { recursive: true });
  const filePath = path.join(EXPORT_DIR, `${fileName}.csv`);
  await writeFile(filePath, `\uFEFF${lines.join('\r\n')}`, 'utf8');
  return filePath;
}
