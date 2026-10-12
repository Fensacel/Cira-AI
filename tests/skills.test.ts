import { describe, expect, it } from 'vitest';
import { calculatePph21, calculatePph23, calculatePpn, progressiveTax } from '@/lib/skills/tax';
import { calculateAmortization, calculateDepreciation, calculateRatios } from '@/lib/skills/finance';
import { describeValues } from '@/lib/skills/math';
import { safeFileBase, safeSheetName } from '@/lib/skills/excel';
import { resolveInWorkspace } from '@/lib/skills/workspace';

describe('progressiveTax (Pasal 17)', () => {
  it('menghitung lapisan pertama dan kedua', () => {
    // 60jt * 5% + 40jt * 15% = 3jt + 6jt
    expect(progressiveTax(100_000_000)).toBeCloseTo(9_000_000, 2);
  });

  it('nol untuk PKP nol', () => {
    expect(progressiveTax(0)).toBe(0);
  });
});

describe('calculatePph21', () => {
  it('menghitung pajak tahunan TK/0 dengan NPWP', () => {
    // bruto 10jt/bln = 120jt; biaya jabatan 5% = 6jt (cap); neto 114jt; PKP = 114jt - 54jt = 60jt -> 3jt
    const result = calculatePph21({ grossMonthly: 10_000_000, ptkpStatus: 'TK/0', hasNpwp: true });
    expect(result.biayaJabatan).toBe(6_000_000);
    expect(result.pkp).toBe(60_000_000);
    expect(result.taxAnnual).toBe(3_000_000);
    expect(result.taxMonthly).toBe(250_000);
  });

  it('menaikkan 20% tanpa NPWP', () => {
    const withNpwp = calculatePph21({ grossMonthly: 10_000_000, ptkpStatus: 'TK/0', hasNpwp: true });
    const withoutNpwp = calculatePph21({ grossMonthly: 10_000_000, ptkpStatus: 'TK/0', hasNpwp: false });
    expect(withoutNpwp.taxAnnual).toBe(Math.round(withNpwp.taxAnnual * 1.2));
    expect(withoutNpwp.noNpwpSurcharge).toBe(true);
  });

  it('PKP nol bila penghasilan di bawah PTKP', () => {
    const result = calculatePph21({ grossMonthly: 3_000_000, ptkpStatus: 'K/1', hasNpwp: true });
    expect(result.pkp).toBe(0);
    expect(result.taxAnnual).toBe(0);
  });

  it('menolak status PTKP tidak dikenal', () => {
    expect(() => calculatePph21({ grossMonthly: 1, ptkpStatus: 'X/9', hasNpwp: true })).toThrow(
      'Status PTKP tidak dikenal',
    );
  });
});

describe('calculatePph23 dan calculatePpn', () => {
  it('PPh 23 jasa 2% dengan NPWP', () => {
    expect(calculatePph23(1_000_000, 'jasa', true)).toEqual({ ratePct: 2, tax: 20_000, netPaid: 980_000 });
  });

  it('PPh 23 tanpa NPWP dinaikkan 100%', () => {
    expect(calculatePph23(1_000_000, 'bunga_dividen_royalti', false).ratePct).toBe(30);
  });

  it('PPN tambah 12%', () => {
    expect(calculatePpn(1_000_000, 'tambah')).toEqual({ dpp: 1_000_000, tax: 120_000, total: 1_120_000 });
  });

  it('PPN ekstrak dari total 1.12jt', () => {
    expect(calculatePpn(1_120_000, 'ekstrak')).toEqual({ dpp: 1_000_000, tax: 120_000, total: 1_120_000 });
  });
});

describe('calculateRatios', () => {
  it('menghitung margin dan likuiditas', () => {
    const r = calculateRatios({
      revenue: 1000,
      cogs: 600,
      netIncome: 100,
      currentAssets: 500,
      currentLiabilities: 250,
      inventory: 100,
    });
    expect(r.grossMarginPct).toBe(40);
    expect(r.netMarginPct).toBe(10);
    expect(r.currentRatio).toBe(2);
    expect(r.quickRatio).toBe(1.6);
  });

  it('null bila pembagi nol atau input kurang', () => {
    const r = calculateRatios({ revenue: 0, netIncome: 10 });
    expect(r.netMarginPct).toBeNull();
    expect(r.roePct).toBeNull();
  });
});

describe('calculateDepreciation', () => {
  it('garis lurus habis di akhir umur', () => {
    const { schedule } = calculateDepreciation(10_000_000, 1_000_000, 3, 'garis_lurus', 2026);
    expect(schedule).toHaveLength(3);
    expect(schedule[0].depreciation).toBe(3_000_000);
    expect(schedule[2].bookValue).toBe(1_000_000);
    expect(schedule[0].year).toBe(2026);
  });

  it('saldo menurun tidak turun di bawah nilai sisa', () => {
    const { schedule } = calculateDepreciation(10_000_000, 500_000, 4, 'saldo_menurun', 2026);
    expect(schedule.at(-1)!.bookValue).toBeGreaterThanOrEqual(500_000);
  });

  it('menolak nilai sisa melebihi harga', () => {
    expect(() => calculateDepreciation(100, 200, 5, 'garis_lurus', 2026)).toThrow('Nilai sisa');
  });
});

describe('calculateAmortization', () => {
  it('saldo akhir nol dan total pokok sama dengan pinjaman', () => {
    const { schedule } = calculateAmortization(12_000_000, 12, 12);
    expect(schedule.at(-1)!.balance).toBe(0);
    const principalPaid = schedule.reduce((sum, row) => sum + row.principal, 0);
    expect(principalPaid).toBeCloseTo(12_000_000, 0);
  });

  it('tanpa bunga cicilan = pokok / periode', () => {
    expect(calculateAmortization(1_200_000, 0, 12).monthlyPayment).toBe(100_000);
  });

  it('menolak lebih dari 360 periode', () => {
    expect(() => calculateAmortization(1, 1, 361)).toThrow('Maksimal 360');
  });
});

describe('describeValues', () => {
  it('statistik deskriptif dengan varians sampel', () => {
    const r = describeValues([2, 4, 4, 4, 5, 5, 7, 9]);
    expect(r.mean).toBe(5);
    expect(r.median).toBe(4.5);
    expect(r.modes).toEqual([4]);
    expect(r.sampleVariance).toBeCloseTo(4.57, 2);
    expect(r.min).toBe(2);
    expect(r.max).toBe(9);
  });

  it('menolak data kosong', () => {
    expect(() => describeValues([])).toThrow('Data kosong');
  });
});

describe('nama file dan sheet', () => {
  it('membersihkan karakter terlarang', () => {
    expect(safeFileBase('../laporan:2026?')).toBe('___laporan_2026_');
    expect(safeSheetName('Neraca/Laba*Rugi')).toBe('Neraca Laba Rugi');
  });
});

describe('resolveInWorkspace', () => {
  it('menerima path di dalam workspace', () => {
    expect(resolveInWorkspace('src/index.ts')).toContain('src');
  });

  it('menolak path traversal dan path absolut', () => {
    expect(() => resolveInWorkspace('../secret.txt')).toThrow('di luar workspace');
    expect(() => resolveInWorkspace('C:\\Windows\\win.ini')).toThrow('relatif');
  });
});
