import { round2 } from './shared';

const MAX_SCHEDULE_ROWS = 360;

export type RatioInput = {
  revenue?: number;
  cogs?: number;
  netIncome?: number;
  ebit?: number;
  interestExpense?: number;
  currentAssets?: number;
  currentLiabilities?: number;
  inventory?: number;
  cash?: number;
  totalAssets?: number;
  totalLiabilities?: number;
  totalEquity?: number;
};

/** Pembagian aman. Mengembalikan null bila input kosong atau pembagi nol. */
function divide(numerator: number | undefined, denominator: number | undefined): number | null {
  if (numerator === undefined || denominator === undefined || denominator === 0) return null;
  return numerator / denominator;
}

/** Rasio dalam persen. Dibulatkan setelah dikali 100 agar presisi terjaga. */
function pct(numerator: number | undefined, denominator: number | undefined): number | null {
  const value = divide(numerator, denominator);
  return value === null ? null : round2(value * 100);
}

/** Rasio dalam bentuk kali (x). */
function times(numerator: number | undefined, denominator: number | undefined): number | null {
  const value = divide(numerator, denominator);
  return value === null ? null : round2(value);
}

/**
 * Rasio keuangan. Nilai persen: margin, ROA, ROE, debt to assets.
 * Nilai kali: current, quick, cash, DER, interest coverage.
 * Rasio yang inputnya kurang dikembalikan null.
 */
export function calculateRatios(input: RatioInput) {
  const grossProfit =
    input.revenue !== undefined && input.cogs !== undefined ? input.revenue - input.cogs : undefined;
  const quickAssets =
    input.currentAssets !== undefined && input.inventory !== undefined
      ? input.currentAssets - input.inventory
      : undefined;
  return {
    grossMarginPct: pct(grossProfit, input.revenue),
    netMarginPct: pct(input.netIncome, input.revenue),
    roaPct: pct(input.netIncome, input.totalAssets),
    roePct: pct(input.netIncome, input.totalEquity),
    debtToAssetsPct: pct(input.totalLiabilities, input.totalAssets),
    currentRatio: times(input.currentAssets, input.currentLiabilities),
    quickRatio: times(quickAssets, input.currentLiabilities),
    cashRatio: times(input.cash, input.currentLiabilities),
    debtToEquity: times(input.totalLiabilities, input.totalEquity),
    interestCoverage: times(input.ebit, input.interestExpense),
  };
}

export type DepreciationMethod = 'garis_lurus' | 'saldo_menurun';

/**
 * garis_lurus: (harga - nilai sisa) / umur.
 * saldo_menurun: tarif 2 / umur dikali nilai buku, tidak turun di bawah nilai sisa.
 * Metode komersial, bukan tarif fiskal kelompok harta (PMK 72/2023).
 */
export function calculateDepreciation(
  cost: number,
  salvage: number,
  usefulLife: number,
  method: DepreciationMethod,
  startYear: number,
) {
  if (salvage > cost) throw new Error('Nilai sisa tidak boleh lebih besar dari harga perolehan.');
  const straightAmount = (cost - salvage) / usefulLife;
  const decliningRate = 2 / usefulLife;
  const schedule: { year: number; depreciation: number; accumulated: number; bookValue: number }[] = [];
  let bookValue = cost;
  let accumulated = 0;
  for (let index = 0; index < usefulLife; index++) {
    const depreciation =
      method === 'garis_lurus' ? straightAmount : Math.min(bookValue * decliningRate, bookValue - salvage);
    bookValue -= depreciation;
    accumulated += depreciation;
    schedule.push({
      year: startYear + index,
      depreciation: round2(depreciation),
      accumulated: round2(accumulated),
      bookValue: round2(bookValue),
    });
  }
  return { method, decliningRatePct: method === 'saldo_menurun' ? round2(decliningRate * 100) : null, schedule };
}

/**
 * Anuitas (cicilan tetap). annualRatePct dalam persen, contoh 12 untuk 12% per tahun.
 * Bunga bulanan = bunga tahunan / 12.
 */
export function calculateAmortization(principal: number, annualRatePct: number, periods: number) {
  if (periods > MAX_SCHEDULE_ROWS) throw new Error(`Maksimal ${MAX_SCHEDULE_ROWS} periode.`);
  const monthlyRate = annualRatePct / 100 / 12;
  const payment =
    monthlyRate === 0
      ? principal / periods
      : (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -periods));
  const schedule: { period: number; payment: number; interest: number; principal: number; balance: number }[] = [];
  let balance = principal;
  let totalInterest = 0;
  for (let period = 1; period <= periods; period++) {
    const interest = balance * monthlyRate;
    const principalPart = payment - interest;
    balance = Math.max(0, balance - principalPart);
    totalInterest += interest;
    schedule.push({
      period,
      payment: round2(payment),
      interest: round2(interest),
      principal: round2(principalPart),
      balance: round2(balance),
    });
  }
  return { monthlyPayment: round2(payment), totalInterest: round2(totalInterest), schedule };
}
