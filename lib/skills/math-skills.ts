import { tool } from 'ai';
import { z } from 'zod';
import { errorResult } from './shared';
import { FORMULAS, describeValues, type FormulaName } from './math';

const formulaNames = Object.keys(FORMULAS) as [FormulaName, ...FormulaName[]];

export const describeTool = tool({
  description:
    'Statistik deskriptif untuk daftar angka: jumlah, rata-rata, median, modus, min, max, range, varians sampel, simpangan baku sampel, Q1, Q3, dan IQR.',
  inputSchema: z.object({
    values: z.array(z.number()).min(1).max(100000).describe('Daftar angka'),
  }),
  execute: async ({ values }) => {
    try {
      return { success: true, ...describeValues(values) };
    } catch (err) {
      return errorResult(err);
    }
  },
});

export const formulaTool = tool({
  description:
    'Ambil rumus dalam LaTeX dari katalog: mean, sample_variance, sample_stddev, pearson_correlation, linear_regression_slope, compound_interest, present_value, npv, annuity_payment.',
  inputSchema: z.object({
    name: z.enum(formulaNames).describe('Nama rumus'),
  }),
  execute: async ({ name }) => {
    try {
      return { success: true, name, ...FORMULAS[name] };
    } catch (err) {
      return errorResult(err);
    }
  },
});

export const mathSkills = { describeTool, formulaTool };
