import { tool } from 'ai';
import { z } from 'zod';
import { errorResult } from './shared';
import { PTKP_TABLE, calculatePph21, calculatePph23, calculatePpn } from './tax';

const ptkpKeys = Object.keys(PTKP_TABLE) as [string, ...string[]];

export const pph21Tool = tool({
  description:
    'Hitung PPh 21 pegawai tetap dengan metode Pasal 17 tahunan (bukan tabel TER). Input gaji bruto bulanan, bonus tahunan, status PTKP, NPWP, dan iuran pensiun tahunan. Mengembalikan PKP, pajak tahunan, dan estimasi pajak bulanan.',
  inputSchema: z.object({
    grossMonthly: z.number().nonnegative().describe('Gaji bruto per bulan dalam rupiah'),
    annualBonus: z.number().nonnegative().optional().describe('Total bonus atau THR setahun dalam rupiah'),
    ptkpStatus: z.enum(ptkpKeys).describe('Status PTKP, contoh TK/0 atau K/1'),
    hasNpwp: z.boolean().describe('true jika karyawan punya NPWP'),
    pensionAnnual: z.number().nonnegative().optional().describe('Iuran pensiun atau JHT karyawan setahun'),
  }),
  execute: async (input) => {
    try {
      return { success: true, ...calculatePph21(input) };
    } catch (err) {
      return errorResult(err);
    }
  },
});

export const pph23Tool = tool({
  description:
    'Hitung PPh 23 atas pembayaran jasa (tarif 2%) atau bunga, dividen, royalti (tarif 15%). Tanpa NPWP tarif dinaikkan 100%.',
  inputSchema: z.object({
    amount: z.number().nonnegative().describe('Jumlah bruto pembayaran dalam rupiah'),
    category: z.enum(['jasa', 'bunga_dividen_royalti']).describe('Jenis penghasilan'),
    hasNpwp: z.boolean().describe('true jika penerima punya NPWP'),
  }),
  execute: async ({ amount, category, hasNpwp }) => {
    try {
      return { success: true, ...calculatePph23(amount, category, hasNpwp) };
    } catch (err) {
      return errorResult(err);
    }
  },
});

export const ppnTool = tool({
  description:
    'Hitung PPN. mode "tambah": nilai sebelum PPN lalu ditambah PPN. mode "ekstrak": total sudah termasuk PPN, DPP dihitung kembali. Tarif default 12%.',
  inputSchema: z.object({
    amount: z.number().nonnegative().describe('Nilai dalam rupiah'),
    mode: z.enum(['tambah', 'ekstrak']).describe('Arah perhitungan PPN'),
    rate: z.number().min(0).max(1).optional().describe('Tarif PPN desimal, contoh 0.11 atau 0.12'),
  }),
  execute: async ({ amount, mode, rate }) => {
    try {
      return { success: true, ...calculatePpn(amount, mode, rate) };
    } catch (err) {
      return errorResult(err);
    }
  },
});

export const taxSkills = { pph21Tool, pph23Tool, ppnTool };
