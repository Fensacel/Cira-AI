import { round2 } from './shared';

/** Persentil dengan interpolasi linier (sama dengan QUARTILE.INC / PERCENTILE.INC di Excel). */
export function percentile(sorted: number[], p: number): number {
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

/** Statistik deskriptif. Varians dan simpangan baku memakai n-1 (sampel). */
export function describeValues(values: number[]) {
  if (values.length === 0) throw new Error('Data kosong.');
  if (values.some((value) => !Number.isFinite(value))) throw new Error('Data berisi nilai tidak valid.');
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  let sum = 0;
  for (const value of sorted) sum += value;
  const mean = sum / n;

  const counts = new Map<number, number>();
  let maxCount = 0;
  for (const value of sorted) {
    const next = (counts.get(value) ?? 0) + 1;
    counts.set(value, next);
    if (next > maxCount) maxCount = next;
  }
  const modes = maxCount > 1 ? [...counts.entries()].filter(([, c]) => c === maxCount).map(([v]) => round2(v)) : [];

  let squared = 0;
  for (const value of sorted) squared += (value - mean) ** 2;
  const variance = n > 1 ? squared / (n - 1) : 0;
  const q1 = percentile(sorted, 0.25);
  const q3 = percentile(sorted, 0.75);

  return {
    count: n,
    sum: round2(sum),
    mean: round2(mean),
    median: round2(percentile(sorted, 0.5)),
    modes,
    min: sorted[0],
    max: sorted[n - 1],
    range: round2(sorted[n - 1] - sorted[0]),
    sampleVariance: round2(variance),
    sampleStdDev: round2(Math.sqrt(variance)),
    q1: round2(q1),
    q3: round2(q3),
    iqr: round2(q3 - q1),
  };
}

/** Katalog rumus dalam LaTeX. */
export const FORMULAS = {
  mean: { latex: '\\bar{x} = \\frac{1}{n}\\sum_{i=1}^{n} x_i', description: 'Rata-rata aritmetika' },
  sample_variance: {
    latex: 's^2 = \\frac{1}{n-1}\\sum_{i=1}^{n}(x_i - \\bar{x})^2',
    description: 'Varians sampel',
  },
  sample_stddev: {
    latex: 's = \\sqrt{\\frac{1}{n-1}\\sum_{i=1}^{n}(x_i - \\bar{x})^2}',
    description: 'Simpangan baku sampel',
  },
  pearson_correlation: {
    latex: 'r = \\frac{\\sum_{i}(x_i-\\bar{x})(y_i-\\bar{y})}{\\sqrt{\\sum_{i}(x_i-\\bar{x})^2\\sum_{i}(y_i-\\bar{y})^2}}',
    description: 'Korelasi Pearson',
  },
  linear_regression_slope: {
    latex: '\\hat{\\beta}_1 = \\frac{\\sum_i (x_i-\\bar{x})(y_i-\\bar{y})}{\\sum_i (x_i-\\bar{x})^2}',
    description: 'Kemiringan regresi linier sederhana',
  },
  compound_interest: { latex: 'FV = PV\\left(1+\\frac{r}{m}\\right)^{m t}', description: 'Bunga majemuk' },
  present_value: { latex: 'PV = \\frac{FV}{(1+r)^{t}}', description: 'Nilai sekarang' },
  npv: { latex: 'NPV = \\sum_{t=0}^{n}\\frac{CF_t}{(1+r)^{t}}', description: 'Net present value' },
  annuity_payment: { latex: 'A = P\\cdot\\frac{i}{1-(1+i)^{-n}}', description: 'Cicilan anuitas per periode' },
} as const;

export type FormulaName = keyof typeof FORMULAS;
