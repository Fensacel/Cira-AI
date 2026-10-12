import { round2 } from './shared';

/**
 * PTKP per tahun (PMK 168/2023). Verifikasi ulang bila regulasi berubah.
 */
export const PTKP_TABLE: Record<string, number> = {
  'TK/0': 54_000_000,
  'TK/1': 58_500_000,
  'TK/2': 63_000_000,
  'TK/3': 67_500_000,
  'K/0': 58_500_000,
  'K/1': 63_000_000,
  'K/2': 67_500_000,
  'K/3': 72_000_000,
};

/** Lapisan tarif Pasal 17 ayat 2a UU PPh (UU HPP). upTo = batas atas kumulatif PKP per tahun. */
const PASAL_17_BRACKETS = [
  { upTo: 60_000_000, rate: 0.05 },
  { upTo: 250_000_000, rate: 0.15 },
  { upTo: 500_000_000, rate: 0.25 },
  { upTo: 5_000_000_000, rate: 0.3 },
  { upTo: Number.POSITIVE_INFINITY, rate: 0.35 },
];

const BIAYA_JABATAN_RATE = 0.05;
const BIAYA_JABATAN_MAX_ANNUAL = 6_000_000;
/** Tambahan 20% bila tidak punya NPWP (Pasal 21 ayat 5a). */
const NO_NPWP_SURCHARGE = 1.2;

/** Pajak progresif Pasal 17 untuk PKP tahunan. */
export function progressiveTax(pkp: number): number {
  let remaining = pkp;
  let lower = 0;
  let tax = 0;
  for (const bracket of PASAL_17_BRACKETS) {
    if (remaining <= 0) break;
    const portion = Math.min(remaining, bracket.upTo - lower);
    tax += portion * bracket.rate;
    remaining -= portion;
    lower = bracket.upTo;
  }
  return tax;
}

export type Pph21Input = {
  grossMonthly: number;
  annualBonus?: number;
  ptkpStatus: string;
  hasNpwp: boolean;
  pensionAnnual?: number;
};

/**
 * PPh 21 pegawai tetap, metode Pasal 17 tahunan.
 * BUKAN tabel TER PMK 168/2023. Pajak bulanan = pajak tahunan / 12.
 * Koreksi Desember dan tunjangan non-rutin tidak dihitung otomatis.
 */
export function calculatePph21(input: Pph21Input) {
  const ptkp = PTKP_TABLE[input.ptkpStatus];
  if (ptkp === undefined) {
    throw new Error(`Status PTKP tidak dikenal: ${input.ptkpStatus}`);
  }
  const grossAnnual = input.grossMonthly * 12 + (input.annualBonus ?? 0);
  const biayaJabatan = Math.min(grossAnnual * BIAYA_JABATAN_RATE, BIAYA_JABATAN_MAX_ANNUAL);
  const pensionAnnual = input.pensionAnnual ?? 0;
  const netAnnual = grossAnnual - biayaJabatan - pensionAnnual;
  // PKP dibulatkan ke bawah per 1.000 rupiah.
  const pkp = Math.max(0, Math.floor((netAnnual - ptkp) / 1000) * 1000);
  const baseTax = progressiveTax(pkp);
  const taxAnnual = Math.round(input.hasNpwp ? baseTax : baseTax * NO_NPWP_SURCHARGE);

  return {
    grossAnnual,
    biayaJabatan,
    pensionAnnual,
    netAnnual,
    ptkp,
    pkp,
    taxAnnual,
    taxMonthly: Math.round(taxAnnual / 12),
    noNpwpSurcharge: !input.hasNpwp,
  };
}

export type Pph23Category = 'jasa' | 'bunga_dividen_royalti';

/** PPh 23: jasa 2%, bunga/dividen/royalti 15%. Tanpa NPWP tarif dinaikkan 100%. */
export function calculatePph23(amount: number, category: Pph23Category, hasNpwp: boolean) {
  const baseRate = category === 'jasa' ? 0.02 : 0.15;
  const rate = hasNpwp ? baseRate : baseRate * 2;
  return {
    ratePct: round2(rate * 100),
    tax: Math.round(amount * rate),
    netPaid: Math.round(amount * (1 - rate)),
  };
}

/**
 * PPN. Default 12% (berlaku sejak 1 Januari 2025).
 * mode 'tambah': DPP belum termasuk PPN. mode 'ekstrak': total sudah termasuk PPN.
 */
export function calculatePpn(amount: number, mode: 'tambah' | 'ekstrak', rate = 0.12) {
  if (mode === 'tambah') {
    const tax = Math.round(amount * rate);
    return { dpp: amount, tax, total: amount + tax };
  }
  const dpp = Math.round(amount / (1 + rate));
  return { dpp, tax: amount - dpp, total: amount };
}
