import { tool } from 'ai';
import { z } from 'zod';
import { errorResult } from './shared';
import { calculateAmortization, calculateDepreciation, calculateRatios } from './finance';

const MAX_SCHEDULE_ROWS = 360;

export const ratioTool = tool({
  description:
    'Hitung rasio keuangan: margin laba kotor dan bersih, ROA, ROE, debt to assets (persen), current, quick, cash ratio, DER, dan interest coverage (kali). Isi hanya angka yang tersedia. Rasio yang inputnya kurang bernilai null.',
  inputSchema: z.object({
    revenue: z.number().optional().describe('Pendapatan'),
    cogs: z.number().optional().describe('Harga pokok penjualan'),
    netIncome: z.number().optional().describe('Laba bersih'),
    ebit: z.number().optional().describe('Laba sebelum bunga dan pajak'),
    interestExpense: z.number().optional().describe('Beban bunga'),
    currentAssets: z.number().optional().describe('Aset lancar'),
    currentLiabilities: z.number().optional().describe('Liabilitas jangka pendek'),
    inventory: z.number().optional().describe('Persediaan'),
    cash: z.number().optional().describe('Kas dan setara kas'),
    totalAssets: z.number().optional().describe('Total aset'),
    totalLiabilities: z.number().optional().describe('Total liabilitas'),
    totalEquity: z.number().optional().describe('Total ekuitas'),
  }),
  execute: async (input) => {
    try {
      return { success: true, ratios: calculateRatios(input) };
    } catch (err) {
      return errorResult(err);
    }
  },
});

export const depreciationTool = tool({
  description:
    'Hitung jadwal penyusutan aset per tahun. Metode garis_lurus atau saldo_menurun. Mengembalikan depresiasi, akumulasi, dan nilai buku per tahun.',
  inputSchema: z.object({
    cost: z.number().positive().describe('Harga perolehan dalam rupiah'),
    salvage: z.number().nonnegative().describe('Nilai sisa di akhir umur'),
    usefulLife: z.number().int().min(1).max(50).describe('Umur manfaat dalam tahun'),
    method: z.enum(['garis_lurus', 'saldo_menurun']).describe('Metode penyusutan'),
    startYear: z.number().int().min(1900).max(2200).describe('Tahun pertama penyusutan, contoh 2026'),
  }),
  execute: async ({ cost, salvage, usefulLife, method, startYear }) => {
    try {
      return { success: true, ...calculateDepreciation(cost, salvage, usefulLife, method, startYear) };
    } catch (err) {
      return errorResult(err);
    }
  },
});

export const amortizationTool = tool({
  description:
    'Hitung jadwal pinjaman anuitas (cicilan bulanan tetap): cicilan, bunga, pokok, dan sisa saldo per bulan.',
  inputSchema: z.object({
    principal: z.number().positive().describe('Pokok pinjaman dalam rupiah'),
    annualRatePct: z.number().min(0).describe('Bunga per tahun dalam persen, contoh 12'),
    periods: z.number().int().min(1).max(MAX_SCHEDULE_ROWS).describe('Jumlah cicilan dalam bulan'),
  }),
  execute: async ({ principal, annualRatePct, periods }) => {
    try {
      return { success: true, ...calculateAmortization(principal, annualRatePct, periods) };
    } catch (err) {
      return errorResult(err);
    }
  },
});

export const financeSkills = { ratioTool, depreciationTool, amortizationTool };
